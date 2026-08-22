from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from .models import NotificationLog
from .google_calendar import create_ics_calendar_content

def queue_and_send_email(recipient_email, recipient_name, notification_type, subject, body_text, body_html=None, ics_content=None):
    log = NotificationLog.objects.create(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        notification_type=notification_type,
        subject=subject,
        body_text=body_text,
        body_html=body_html or body_text,
        status=NotificationLog.Status.QUEUED
    )

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email]
        )
        if body_html:
            msg.attach_alternative(body_html, "text/html")
        if ics_content:
            msg.attach('appointment.ics', ics_content, 'text/calendar; method=REQUEST')

        msg.send(fail_silently=False)
        
        log.status = NotificationLog.Status.SENT
        log.sent_at = timezone.now()
        log.attempts += 1
        log.save()
        print(f"[Email Sent Successfully]: {subject} to {recipient_email}")
        return True
    except Exception as e:
        log.status = NotificationLog.Status.FAILED
        log.attempts += 1
        log.last_error = str(e)
        log.next_retry_at = timezone.now() + timezone.timedelta(minutes=2)
        log.save()
        print(f"[Email Send Failed - Queued for retry]: {e}")
        return False


def send_booking_confirmation_email(appointment):
    ics_file = create_ics_calendar_content(appointment)
    
    # 1. Patient Email
    patient_subj = f"Booking Confirmed: Dr. {appointment.doctor.user.get_full_name()} on {appointment.date} at {appointment.start_time.strftime('%H:%M')}"
    patient_body = f"""Dear {appointment.patient.get_full_name() or 'Patient'},

Your medical consultation has been successfully confirmed!

Appointment Details:
- Doctor: Dr. {appointment.doctor.user.get_full_name()} ({appointment.doctor.specialization})
- Date: {appointment.date}
- Time: {appointment.start_time.strftime('%H:%M')} - {appointment.end_time.strftime('%H:%M')}
- Consultation Fee: ${appointment.doctor.consultation_fee}
- Initial Triage Level: {appointment.urgency_level}

We have attached a calendar invite (.ics) so you can add this to your Google or Apple Calendar with one click.

Best regards,
Healthcare Clinic Management
"""
    queue_and_send_email(
        recipient_email=appointment.patient.email,
        recipient_name=appointment.patient.get_full_name(),
        notification_type=NotificationLog.Type.BOOKING_CONFIRMATION,
        subject=patient_subj,
        body_text=patient_body,
        ics_content=ics_file
    )

    # 2. Doctor Email
    questions_list = "\n".join(["- " + q for q in appointment.suggested_questions]) if appointment.suggested_questions else "None"
    doctor_subj = f"New Booking: {appointment.patient.get_full_name()} on {appointment.date} at {appointment.start_time.strftime('%H:%M')}"
    doctor_body = f"""Dear Dr. {appointment.doctor.user.get_full_name()},

You have a new confirmed patient appointment.

Patient Details:
- Name: {appointment.patient.get_full_name()} ({appointment.patient.email})
- Date & Time: {appointment.date} at {appointment.start_time.strftime('%H:%M')}
- Symptoms: {appointment.symptoms_text}
- AI Urgency Rating: {appointment.urgency_level}
- AI Chief Complaint: {appointment.chief_complaint}

Suggested Diagnostic Questions:
{questions_list}

Best regards,
Healthcare System
"""
    queue_and_send_email(
        recipient_email=appointment.doctor.user.email,
        recipient_name=appointment.doctor.user.get_full_name(),
        notification_type=NotificationLog.Type.BOOKING_CONFIRMATION,
        subject=doctor_subj,
        body_text=doctor_body,
        ics_content=ics_file
    )


def send_appointment_cancellation_email(appointment, reason):
    subj = f"Appointment Cancelled: Consultation on {appointment.date} at {appointment.start_time.strftime('%H:%M')}"
    body = f"""Hello,

Your scheduled appointment on {appointment.date} at {appointment.start_time.strftime('%H:%M')} has been cancelled.

Reason for Cancellation:
{reason}

If you would like to reschedule, please log into your patient portal to choose another convenient slot.

Best regards,
Healthcare Platform
"""
    queue_and_send_email(
        recipient_email=appointment.patient.email,
        recipient_name=appointment.patient.get_full_name(),
        notification_type=NotificationLog.Type.CANCELLATION,
        subject=subj,
        body_text=body
    )
    queue_and_send_email(
        recipient_email=appointment.doctor.user.email,
        recipient_name=appointment.doctor.user.get_full_name(),
        notification_type=NotificationLog.Type.CANCELLATION,
        subject=subj,
        body_text=body
    )


def send_leave_conflict_cancellation_email(appointment, leave):
    subj = f"Important: Your Appointment with Dr. {appointment.doctor.user.get_full_name()} has been Cancelled due to Doctor Leave"
    body = f"""Dear {appointment.patient.get_full_name()},

Dr. {appointment.doctor.user.get_full_name()} has an approved leave from {leave.start_date} to {leave.end_date}. 
Consequently, your appointment on {appointment.date} at {appointment.start_time.strftime('%H:%M')} has been cancelled.

Reason: {leave.reason or 'Scheduled Medical Leave'}

What should you do next?
Please log into your patient portal to select a new available date and time with Dr. {appointment.doctor.user.get_full_name()} or choose another specialist.

We sincerely apologize for any inconvenience caused.

Best regards,
Healthcare Clinical Services
"""
    queue_and_send_email(
        recipient_email=appointment.patient.email,
        recipient_name=appointment.patient.get_full_name(),
        notification_type=NotificationLog.Type.LEAVE_CONFLICT,
        subject=subj,
        body_text=body
    )


def send_post_visit_summary_email(prescription):
    patient = prescription.patient
    doctor = prescription.doctor
    subj = f"Your Consultation Summary & Prescription - Dr. {doctor.user.get_full_name()}"
    
    meds_list = "\n".join([
        f"- {item.medication_name} ({item.dosage}) - {item.get_frequency_display()}, {item.duration_days} days. ({item.get_meal_timing_display()})"
        for item in prescription.items.all()
    ])

    body = f"""Dear {patient.get_full_name()},

Thank you for your visit today with Dr. {doctor.user.get_full_name()}.

---
AI PATIENT-FRIENDLY SUMMARY:
{prescription.patient_friendly_summary}

---
DIAGNOSIS:
{prescription.diagnosis}

---
PRESCRIBED MEDICATIONS:
{meds_list or 'None prescribed'}

---
FOLLOW-UP:
Follow-up date: {prescription.follow_up_date or 'As needed'}

Automated medication reminders will be sent to help you stay on track with your doses.

Take care and get well soon!

Best regards,
Healthcare Clinical Team
"""
    queue_and_send_email(
        recipient_email=patient.email,
        recipient_name=patient.get_full_name(),
        notification_type=NotificationLog.Type.POST_VISIT_SUMMARY,
        subject=subj,
        body_text=body
    )


def send_medication_reminder_email(reminder_log):
    item = reminder_log.prescription_item
    patient = reminder_log.patient
    subj = f"Medication Reminder: Time for {item.medication_name} ({item.dosage})"
    body = f"""Dear {patient.get_full_name()},

This is your friendly reminder to take your medicine:

- Medication: {item.medication_name}
- Dosage: {item.dosage}
- Timing: {item.get_meal_timing_display()}
- Instructions: {item.instructions or 'Take as prescribed with water'}

Best regards,
Healthcare Follow-up Manager
"""
    return queue_and_send_email(
        recipient_email=patient.email,
        recipient_name=patient.get_full_name(),
        notification_type=NotificationLog.Type.MEDICATION_REMINDER,
        subject=subj,
        body_text=body
    )
