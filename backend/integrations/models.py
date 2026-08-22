from django.db import models

class NotificationLog(models.Model):
    class Type(models.TextChoices):
        BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION', 'Booking Confirmation'
        APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER', 'Appointment Reminder'
        CANCELLATION = 'CANCELLATION', 'Appointment Cancellation'
        LEAVE_CONFLICT = 'LEAVE_CONFLICT', 'Doctor Leave Conflict Cancellation'
        POST_VISIT_SUMMARY = 'POST_VISIT_SUMMARY', 'Post-Visit Summary'
        MEDICATION_REMINDER = 'MEDICATION_REMINDER', 'Medication Reminder'

    class Status(models.TextChoices):
        QUEUED = 'QUEUED', 'Queued'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'
        MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED', 'Max Retries Exceeded'

    recipient_email = models.EmailField()
    recipient_name = models.CharField(max_length=150, blank=True, null=True)
    notification_type = models.CharField(max_length=40, choices=Type.choices)
    subject = models.CharField(max_length=255)
    body_text = models.TextField()
    body_html = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.QUEUED)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=4)
    last_error = models.TextField(blank=True, null=True)
    next_retry_at = models.DateTimeField(blank=True, null=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.notification_type} to {self.recipient_email}"
