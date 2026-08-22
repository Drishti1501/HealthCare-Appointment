from django.db import transaction
from django.utils import timezone
from appointments.models import DoctorProfile, DoctorLeave, Appointment, SlotHold
from integrations.email_service import send_leave_conflict_cancellation_email
from integrations.google_calendar import delete_google_calendar_event

def apply_and_process_doctor_leave(doctor_id, start_date, end_date, reason, user):
    """
    Applies doctor leave, approves it, and automatically cancels all conflicting
    confirmed appointments and active slot holds in that date range.
    Affected patients are notified via email with automated reschedule instructions.
    """
    with transaction.atomic():
        try:
            doctor = DoctorProfile.objects.select_for_update().get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            raise ValueError("Doctor profile not found.")

        # Create approved leave
        leave = DoctorLeave.objects.create(
            doctor=doctor,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            status=DoctorLeave.Status.APPROVED,
            created_by=user
        )

        # 1. Invalidate active slot holds in range
        SlotHold.objects.filter(
            doctor=doctor,
            date__range=[start_date, end_date],
            status=SlotHold.Status.ACTIVE
        ).update(status=SlotHold.Status.EXPIRED)

        # 2. Find conflicting confirmed appointments
        conflicting_appointments = list(
            Appointment.objects.select_for_update().filter(
                doctor=doctor,
                date__range=[start_date, end_date],
                status=Appointment.Status.CONFIRMED
            ).select_related('patient', 'doctor__user')
        )

        # 3. Update appointment status
        for appt in conflicting_appointments:
            appt.status = Appointment.Status.CANCELLED_LEAVE_CONFLICT
            appt.cancellation_reason = f"Doctor scheduled leave ({start_date} to {end_date}): {reason or 'Personal leave'}"
            appt.save()

    # 4. Notify affected patients and remove Google Calendar events
    affected_count = len(conflicting_appointments)
    for appt in conflicting_appointments:
        try:
            if appt.google_event_id:
                delete_google_calendar_event(appt.google_event_id)
        except Exception as e:
            print(f"[Calendar delete error]: {e}")

        try:
            send_leave_conflict_cancellation_email(appt, leave)
        except Exception as e:
            print(f"[Leave notification error]: {e}")

    return {
        'leave_id': leave.id,
        'doctor_name': doctor.user.get_full_name(),
        'start_date': str(start_date),
        'end_date': str(end_date),
        'affected_appointments_count': affected_count,
        'message': f"Leave approved successfully. {affected_count} conflicting appointment(s) cancelled and notified."
    }
