from datetime import datetime
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError

from authentication.permissions import IsPatient, IsDoctor, IsAdminUser, IsDoctorOrAdmin
from .models import DoctorProfile, DoctorLeave, SlotHold, Appointment
from .serializers import DoctorProfileSerializer, DoctorLeaveSerializer, SlotHoldSerializer, AppointmentSerializer
from .services.slot_service import get_available_slots, acquire_slot_hold, confirm_appointment
from .services.leave_service import apply_and_process_doctor_leave
from integrations.email_service import send_appointment_cancellation_email
from integrations.google_calendar import delete_google_calendar_event

class DoctorListView(generics.ListCreateAPIView):
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = DoctorProfile.objects.filter(is_active=True).select_related('user')
        specialization = self.request.query_params.get('specialization')
        search = self.request.query_params.get('search')
        
        if specialization:
            qs = qs.filter(specialization__icontains=specialization)
        if search:
            qs = qs.filter(
                user__first_name__icontains=search
            ) | qs.filter(
                user__last_name__icontains=search
            ) | qs.filter(
                specialization__icontains=search
            )
        return qs


class DoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DoctorProfile.objects.all().select_related('user')
    serializer_class = DoctorProfileSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsDoctorOrAdmin()]
        return [permissions.AllowAny()]


class AvailableSlotsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, doctor_id):
        date_str = request.query_params.get('date')
        if not date_str:
            target_date = timezone.localdate()
        else:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        result = get_available_slots(doctor_id, target_date)
        return Response(result)


class AcquireSlotHoldView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        doctor_id = request.data.get('doctor_id')
        date_str = request.data.get('date')
        start_time = request.data.get('start_time')

        if not all([doctor_id, date_str, start_time]):
            return Response({'error': 'doctor_id, date, and start_time are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            hold = acquire_slot_hold(doctor_id, request.user, target_date, start_time)
            serializer = SlotHoldSerializer(hold)
            return Response({
                'message': 'Slot hold acquired for 10 minutes.',
                'hold': serializer.data
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_409_CONFLICT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ConfirmBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        hold_token = request.data.get('hold_token')
        symptoms_text = request.data.get('symptoms_text')
        symptom_duration = request.data.get('symptom_duration', 'Few days')
        severity_scale = int(request.data.get('severity_scale', 5))

        if not hold_token or not symptoms_text:
            return Response({'error': 'hold_token and symptoms_text are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = confirm_appointment(
                hold_token=hold_token,
                patient=request.user,
                symptoms_text=symptoms_text,
                symptom_duration=symptom_duration,
                severity_scale=severity_scale
            )
            serializer = AppointmentSerializer(appointment)
            return Response({
                'message': 'Appointment confirmed successfully!',
                'appointment': serializer.data
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AppointmentListView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.all().select_related('patient', 'doctor__user', 'prescription').order_by('-date', '-start_time')

        if user.role == 'PATIENT':
            qs = qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            if hasattr(user, 'doctor_profile'):
                qs = qs.filter(doctor=user.doctor_profile)
            else:
                return Appointment.objects.none()
        elif user.role == 'ADMIN' or user.is_staff:
            pass # Admin sees all
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        date_filter = self.request.query_params.get('date')
        if date_filter:
            qs = qs.filter(date=date_filter)

        return qs


class AppointmentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user).select_related('patient', 'doctor__user')
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Appointment.objects.filter(doctor=user.doctor_profile).select_related('patient', 'doctor__user')
        return Appointment.objects.all().select_related('patient', 'doctor__user')


class CancelAppointmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            appointment = Appointment.objects.select_related('patient', 'doctor__user').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'PATIENT' and appointment.patient_id != user.id:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'DOCTOR' and appointment.doctor.user_id != user.id:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', 'Cancelled by user')
        appointment.status = Appointment.Status.CANCELLED_BY_PATIENT if user.role == 'PATIENT' else Appointment.Status.CANCELLED_BY_DOCTOR
        appointment.cancellation_reason = reason
        appointment.save()

        # Delete Calendar Event
        if appointment.google_event_id:
            try:
                delete_google_calendar_event(appointment.google_event_id)
            except Exception as e:
                print(f"[Calendar error]: {e}")

        # Send cancellation email
        try:
            send_appointment_cancellation_email(appointment, reason)
        except Exception as e:
            print(f"[Email error]: {e}")

        return Response({
            'message': 'Appointment cancelled successfully.',
            'appointment_id': appointment.id,
            'status': appointment.status
        })


class DoctorLeaveManageView(APIView):
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request):
        user = request.user
        if user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            leaves = DoctorLeave.objects.filter(doctor=user.doctor_profile).order_by('-start_date')
        else:
            leaves = DoctorLeave.objects.all().select_related('doctor__user').order_by('-start_date')
        serializer = DoctorLeaveSerializer(leaves, many=True)
        return Response(serializer.data)

    def post(self, request):
        doctor_id = request.data.get('doctor_id')
        if not doctor_id and request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            doctor_id = request.user.doctor_profile.id

        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        reason = request.data.get('reason', '')

        if not all([doctor_id, start_date_str, end_date_str]):
            return Response({'error': 'doctor_id, start_date, and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            if end_date < start_date:
                return Response({'error': 'end_date cannot be earlier than start_date'}, status=status.HTTP_400_BAD_REQUEST)

            result = apply_and_process_doctor_leave(doctor_id, start_date, end_date, reason, request.user)
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
