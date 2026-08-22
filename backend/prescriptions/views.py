from datetime import datetime, time, timedelta
from django.utils import timezone
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from appointments.models import Appointment
from authentication.permissions import IsDoctor, IsDoctorOrAdmin
from ai_assistant.gemini_service import generate_post_visit_summary
from integrations.email_service import send_post_visit_summary_email
from .models import Prescription, PrescriptionItem, MedicationReminderLog
from .serializers import PrescriptionSerializer, MedicationReminderLogSerializer

def generate_reminder_schedule_for_item(item, patient, start_date):
    """
    Generates scheduled reminder entries for a prescribed medicine based on frequency.
    """
    # Standard medicine times
    time_slots = {
        PrescriptionItem.Frequency.DAILY: [time(9, 0)], # Morning
        PrescriptionItem.Frequency.TWICE_DAILY: [time(9, 0), time(21, 0)], # Morning, Night
        PrescriptionItem.Frequency.THRICE_DAILY: [time(9, 0), time(14, 0), time(21, 0)], # Morning, Noon, Night
        PrescriptionItem.Frequency.FOUR_TIMES_DAILY: [time(8, 0), time(12, 0), time(16, 0), time(20, 0)],
        PrescriptionItem.Frequency.EVERY_8_HOURS: [time(6, 0), time(14, 0), time(22, 0)],
        PrescriptionItem.Frequency.AS_NEEDED: [], # No fixed schedule for PRN
    }

    times = time_slots.get(item.frequency, [time(9, 0)])
    logs = []

    for day_offset in range(item.duration_days):
        current_day = start_date + timedelta(days=day_offset)
        for t in times:
            scheduled_dt = datetime.combine(current_day, t)
            # Make timezone aware
            scheduled_dt = timezone.make_aware(scheduled_dt, timezone.get_current_timezone())
            
            message = (
                f"Medication Reminder: Time to take {item.medication_name} ({item.dosage}) - "
                f"{item.get_meal_timing_display()}. Instructions: {item.instructions or 'None'}"
            )

            logs.append(MedicationReminderLog(
                prescription_item=item,
                patient=patient,
                scheduled_time=scheduled_dt,
                status=MedicationReminderLog.Status.PENDING,
                message_text=message
            ))

    if logs:
        MedicationReminderLog.objects.bulk_create(logs)


class SubmitConsultationView(APIView):
    permission_classes = [IsDoctorOrAdmin]

    def post(self, request):
        appointment_id = request.data.get('appointment_id')
        diagnosis = request.data.get('diagnosis')
        clinical_notes = request.data.get('clinical_notes')
        follow_up_date_str = request.data.get('follow_up_date')
        items_data = request.data.get('items', [])

        if not all([appointment_id, diagnosis, clinical_notes]):
            return Response({'error': 'appointment_id, diagnosis, and clinical_notes are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.select_related('patient', 'doctor__user').get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(appointment, 'prescription'):
            return Response({'error': 'Consultation already submitted for this appointment'}, status=status.HTTP_400_BAD_REQUEST)

        follow_up_date = None
        if follow_up_date_str:
            try:
                follow_up_date = datetime.strptime(follow_up_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        # 1. Generate AI Post-Visit Summary
        ai_summary = generate_post_visit_summary(
            clinical_notes=clinical_notes,
            diagnosis=diagnosis,
            prescription_items_list=items_data,
            follow_up_date_str=str(follow_up_date) if follow_up_date else ''
        )

        with transaction.atomic():
            # 2. Create Prescription
            prescription = Prescription.objects.create(
                appointment=appointment,
                doctor=appointment.doctor,
                patient=appointment.patient,
                diagnosis=diagnosis,
                clinical_notes=clinical_notes,
                follow_up_date=follow_up_date,
                patient_friendly_summary=ai_summary.get('patient_friendly_summary', ''),
                structured_ai_summary=ai_summary,
                ai_post_visit_raw=ai_summary.get('raw_response', '')
            )

            # 3. Create Prescription Items & Reminder Schedule
            for item_data in items_data:
                item = PrescriptionItem.objects.create(
                    prescription=prescription,
                    medication_name=item_data.get('medication_name'),
                    dosage=item_data.get('dosage'),
                    frequency=item_data.get('frequency', PrescriptionItem.Frequency.DAILY),
                    duration_days=int(item_data.get('duration_days', 5)),
                    meal_timing=item_data.get('meal_timing', PrescriptionItem.MealTiming.AFTER_MEAL),
                    instructions=item_data.get('instructions', '')
                )
                # Generate reminders starting tomorrow or today
                generate_reminder_schedule_for_item(item, appointment.patient, timezone.localdate())

            # 4. Mark appointment completed
            appointment.status = Appointment.Status.COMPLETED
            appointment.save(update_fields=['status'])

        # 5. Send Post-Visit Email
        try:
            send_post_visit_summary_email(prescription)
        except Exception as e:
            print(f"[Post-Visit Email Error]: {e}")

        serializer = PrescriptionSerializer(prescription)
        return Response({
            'message': 'Consultation and prescription recorded successfully.',
            'prescription': serializer.data
        }, status=status.HTTP_201_CREATED)


class PrescriptionDetailView(generics.RetrieveAPIView):
    queryset = Prescription.objects.all().select_related('appointment', 'doctor__user', 'patient').prefetch_related('items')
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return self.queryset.filter(patient=user)
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return self.queryset.filter(doctor=user.doctor_profile)
        return self.queryset


class PatientPrescriptionListView(generics.ListAPIView):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Prescription.objects.filter(patient=user).select_related('doctor__user', 'appointment').prefetch_related('items').order_by('-created_at')
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Prescription.objects.filter(doctor=user.doctor_profile).select_related('patient', 'appointment').prefetch_related('items').order_by('-created_at')
        return Prescription.objects.all().select_related('patient', 'doctor__user', 'appointment').prefetch_related('items').order_by('-created_at')


class PatientMedicationRemindersView(generics.ListAPIView):
    serializer_class = MedicationReminderLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return MedicationReminderLog.objects.filter(patient=user).select_related('prescription_item').order_by('scheduled_time')
