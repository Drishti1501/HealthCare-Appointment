import uuid
from datetime import datetime, date, time, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.conf import settings
from appointments.models import DoctorProfile, DoctorLeave, SlotHold, Appointment

DAY_MAP = {
    0: 'MON',
    1: 'TUE',
    2: 'WED',
    3: 'THU',
    4: 'FRI',
    5: 'SAT',
    6: 'SUN',
}

def get_available_slots(doctor_id, target_date):
    """
    Returns list of all potential slots for a doctor on target_date,
    marking each as AVAILABLE, HELD, or BOOKED, and detecting leaves.
    """
    try:
        doctor = DoctorProfile.objects.select_related('user').get(id=doctor_id, is_active=True)
    except DoctorProfile.DoesNotExist:
        return {'error': 'Doctor profile not found or inactive', 'slots': []}

    # 1. Check if doctor is on leave
    is_on_leave = DoctorLeave.objects.filter(
        doctor=doctor,
        status=DoctorLeave.Status.APPROVED,
        start_date__lte=target_date,
        end_date__gte=target_date
    ).exists()

    if is_on_leave:
        return {
            'doctor_id': doctor.id,
            'doctor_name': doctor.user.get_full_name(),
            'date': str(target_date),
            'is_on_leave': True,
            'message': 'Doctor is on approved leave for this date.',
            'slots': []
        }

    # 2. Check if doctor works on this day of week
    day_abbr = DAY_MAP[target_date.weekday()]
    if doctor.working_days and day_abbr not in doctor.working_days:
        return {
            'doctor_id': doctor.id,
            'doctor_name': doctor.user.get_full_name(),
            'date': str(target_date),
            'is_on_leave': False,
            'message': f'Doctor does not practice on {day_abbr}.',
            'slots': []
        }

    # 3. Clean up expired holds
    SlotHold.objects.filter(
        doctor=doctor,
        date=target_date,
        status=SlotHold.Status.ACTIVE,
        expires_at__lt=timezone.now()
    ).update(status=SlotHold.Status.EXPIRED)

    # 4. Generate candidate time slots
    slot_duration = timedelta(minutes=doctor.slot_duration_minutes)
    start_dt = datetime.combine(target_date, doctor.start_time)
    end_dt = datetime.combine(target_date, doctor.end_time)

    # 5. Fetch existing confirmed bookings and active holds
    booked_slots = set(
        Appointment.objects.filter(
            doctor=doctor,
            date=target_date,
            status=Appointment.Status.CONFIRMED
        ).values_list('start_time', flat=True)
    )

    held_slots = set(
        SlotHold.objects.filter(
            doctor=doctor,
            date=target_date,
            status=SlotHold.Status.ACTIVE,
            expires_at__gt=timezone.now()
        ).values_list('start_time', flat=True)
    )

    slots = []
    current_dt = start_dt
    now = timezone.now()

    while current_dt + slot_duration <= end_dt:
        slot_start_time = current_dt.time()
        slot_end_time = (current_dt + slot_duration).time()
        
        # Check if slot is in the past for today
        is_past = False
        if target_date == timezone.localdate():
            # If today, check if time has already passed
            if current_dt < datetime.now():
                is_past = True

        status = 'AVAILABLE'
        if is_past:
            status = 'PAST'
        elif slot_start_time in booked_slots:
            status = 'BOOKED'
        elif slot_start_time in held_slots:
            status = 'HELD'

        slots.append({
            'start_time': slot_start_time.strftime('%H:%M'),
            'end_time': slot_end_time.strftime('%H:%M'),
            'status': status,
            'is_available': (status == 'AVAILABLE')
        })

        current_dt += slot_duration

    return {
        'doctor_id': doctor.id,
        'doctor_name': doctor.user.get_full_name(),
        'specialization': doctor.specialization,
        'consultation_fee': str(doctor.consultation_fee),
        'date': str(target_date),
        'is_on_leave': False,
        'slots': slots
    }


def acquire_slot_hold(doctor_id, patient, target_date, start_time_str):
    """
    Safely acquires a 10-minute temporary hold on a slot using database transactions.
    Prevents double-booking during symptom intake.
    """
    hold_duration_minutes = getattr(settings, 'SLOT_HOLD_DURATION_MINUTES', 10)
    
    with transaction.atomic():
        try:
            doctor = DoctorProfile.objects.select_for_update().get(id=doctor_id, is_active=True)
        except DoctorProfile.DoesNotExist:
            raise ValidationError("Doctor profile not found or inactive.")

        # Check doctor leave
        if DoctorLeave.objects.filter(
            doctor=doctor,
            status=DoctorLeave.Status.APPROVED,
            start_date__lte=target_date,
            end_date__gte=target_date
        ).exists():
            raise ValidationError("Doctor is on leave on this date. Slot cannot be held.")

        # Parse start_time
        if isinstance(start_time_str, str):
            if len(start_time_str) == 5:
                slot_time = datetime.strptime(start_time_str, '%H:%M').time()
            else:
                slot_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
        else:
            slot_time = start_time_str

        # Calculate slot end time
        slot_dt = datetime.combine(target_date, slot_time)
        slot_end_time = (slot_dt + timedelta(minutes=doctor.slot_duration_minutes)).time()

        # Check if already booked
        if Appointment.objects.filter(
            doctor=doctor,
            date=target_date,
            start_time=slot_time,
            status=Appointment.Status.CONFIRMED
        ).exists():
            raise ValidationError("This slot has already been booked by another patient.")

        # Check existing active hold by another user
        existing_hold = SlotHold.objects.select_for_update().filter(
            doctor=doctor,
            date=target_date,
            start_time=slot_time,
            status=SlotHold.Status.ACTIVE,
            expires_at__gt=timezone.now()
        ).first()

        if existing_hold:
            if existing_hold.patient_id == patient.id:
                # Refresh existing hold for the same patient
                existing_hold.expires_at = timezone.now() + timedelta(minutes=hold_duration_minutes)
                existing_hold.save()
                return existing_hold
            else:
                raise ValidationError("This slot is currently held by another patient. Please choose another slot or try again in a few minutes.")

        # Invalidate any older active holds by this patient for other slots to avoid hoarding
        SlotHold.objects.filter(
            patient=patient,
            status=SlotHold.Status.ACTIVE
        ).update(status=SlotHold.Status.RELEASED)

        # Create new hold
        hold_token = uuid.uuid4().hex
        expires_at = timezone.now() + timedelta(minutes=hold_duration_minutes)

        hold = SlotHold.objects.create(
            doctor=doctor,
            patient=patient,
            date=target_date,
            start_time=slot_time,
            end_time=slot_end_time,
            expires_at=expires_at,
            status=SlotHold.Status.ACTIVE,
            hold_token=hold_token
        )
        return hold


def confirm_appointment(hold_token, patient, symptoms_text, symptom_duration='Few days', severity_scale=5):
    """
    Atomically converts a slot hold into a confirmed appointment, triggers LLM pre-visit
    symptom assessment, creates calendar event, and dispatches confirmation email.
    """
    from ai_assistant.gemini_service import generate_pre_visit_summary
    from integrations.google_calendar import create_google_calendar_event
    from integrations.email_service import send_booking_confirmation_email

    with transaction.atomic():
        try:
            hold = SlotHold.objects.select_for_update().get(
                hold_token=hold_token,
                patient=patient
            )
        except SlotHold.DoesNotExist:
            raise ValidationError("Invalid or expired booking hold token.")

        if not hold.is_valid():
            hold.status = SlotHold.Status.EXPIRED
            hold.save()
            raise ValidationError("Your slot hold has expired. Please select a slot again.")

        # Double-check no conflicting confirmed booking
        if Appointment.objects.select_for_update().filter(
            doctor=hold.doctor,
            date=hold.date,
            start_time=hold.start_time,
            status=Appointment.Status.CONFIRMED
        ).exists():
            hold.status = SlotHold.Status.EXPIRED
            hold.save()
            raise ValidationError("Slot was already booked. Please select a different time.")

        # Run AI Pre-visit symptom analysis
        ai_result = generate_pre_visit_summary(symptoms_text)

        # Create confirmed appointment
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=hold.doctor,
            date=hold.date,
            start_time=hold.start_time,
            end_time=hold.end_time,
            status=Appointment.Status.CONFIRMED,
            symptoms_text=symptoms_text,
            symptom_duration=symptom_duration,
            severity_scale=severity_scale,
            urgency_level=ai_result.get('urgency_level', 'LOW').upper(),
            chief_complaint=ai_result.get('chief_complaint', symptoms_text[:200]),
            suggested_questions=ai_result.get('suggested_questions', []),
            ai_pre_visit_raw=ai_result.get('raw_response', '')
        )

        # Mark hold converted
        hold.status = SlotHold.Status.CONVERTED
        hold.save()

    # Async / Non-blocking integrations outside lock
    try:
        cal_event_id = create_google_calendar_event(appointment)
        if cal_event_id:
            appointment.google_event_id = cal_event_id
            appointment.save(update_fields=['google_event_id'])
    except Exception as e:
        print(f"[Calendar Sync Warning]: {e}")

    try:
        send_booking_confirmation_email(appointment)
    except Exception as e:
        print(f"[Email Notification Warning]: {e}")

    return appointment
