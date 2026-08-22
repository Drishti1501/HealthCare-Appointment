from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from appointments.models import SlotHold, Appointment
from prescriptions.models import MedicationReminderLog
from integrations.models import NotificationLog
from integrations.email_service import queue_and_send_email, send_medication_reminder_email

def cleanup_expired_slot_holds():
    """
    Releases all slot holds that passed their 10-minute validity.
    """
    expired_count = SlotHold.objects.filter(
        status=SlotHold.Status.ACTIVE,
        expires_at__lt=timezone.now()
    ).update(status=SlotHold.Status.EXPIRED)
    
    if expired_count > 0:
        print(f"[Cron Task]: Cleaned up {expired_count} expired slot hold(s).")


def dispatch_due_medication_reminders():
    """
    Finds pending medication reminders due up to the current timestamp and dispatches emails.
    """
    now = timezone.now()
    due_reminders = MedicationReminderLog.objects.filter(
        status=MedicationReminderLog.Status.PENDING,
        scheduled_time__lte=now
    ).select_related('prescription_item', 'patient')[:50]

    count = 0
    for reminder in due_reminders:
        try:
            success = send_medication_reminder_email(reminder)
            if success:
                reminder.status = MedicationReminderLog.Status.SENT
                reminder.sent_at = timezone.now()
            else:
                reminder.retry_count += 1
                if reminder.retry_count > 3:
                    reminder.status = MedicationReminderLog.Status.FAILED
            reminder.save()
            count += 1
        except Exception as e:
            print(f"[Medication Cron Error for reminder #{reminder.id}]: {e}")

    if count > 0:
        print(f"[Cron Task]: Dispatched {count} medication reminder(s).")


def retry_failed_email_notifications():
    """
    Retries failed notifications with exponential backoff up to max_attempts.
    """
    now = timezone.now()
    failed_logs = NotificationLog.objects.filter(
        status=NotificationLog.Status.FAILED,
        attempts__lt=4,
        next_retry_at__lte=now
    )[:20]

    for log in failed_logs:
        try:
            from django.core.mail import EmailMultiAlternatives
            from django.conf import settings

            msg = EmailMultiAlternatives(
                subject=log.subject,
                body=log.body_text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[log.recipient_email]
            )
            if log.body_html:
                msg.attach_alternative(log.body_html, "text/html")
            
            msg.send(fail_silently=False)
            
            log.status = NotificationLog.Status.SENT
            log.sent_at = timezone.now()
            log.attempts += 1
            log.save()
            print(f"[Notification Retry Success]: Resent notification #{log.id} to {log.recipient_email}")
        except Exception as e:
            log.attempts += 1
            log.last_error = str(e)
            if log.attempts >= log.max_attempts:
                log.status = NotificationLog.Status.MAX_RETRIES_EXCEEDED
            else:
                backoff_mins = (2 ** log.attempts) * 2
                log.next_retry_at = timezone.now() + timedelta(minutes=backoff_mins)
            log.save()
            print(f"[Notification Retry Failed]: Notification #{log.id} attempt {log.attempts}: {e}")
