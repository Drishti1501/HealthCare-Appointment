from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class DoctorProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    specialization = models.CharField(max_length=150)
    qualifications = models.CharField(max_length=255, default='MBBS, MD')
    experience_years = models.PositiveIntegerField(default=5)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    bio = models.TextField(blank=True, null=True)
    working_days = models.JSONField(default=list, help_text="List of day abbreviations e.g. ['MON','TUE','WED','THU','FRI']")
    start_time = models.TimeField(default='09:00:00')
    end_time = models.TimeField(default='17:00:00')
    slot_duration_minutes = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username} - {self.specialization}"


class DoctorLeave(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='leaves')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPROVED)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_leaves')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Leave: {self.doctor.user.get_full_name()} ({self.start_date} to {self.end_date})"


class SlotHold(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        EXPIRED = 'EXPIRED', 'Expired'
        CONVERTED = 'CONVERTED', 'Converted to Booking'
        RELEASED = 'RELEASED', 'Released by User'

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='slot_holds')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='slot_holds')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    hold_token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return self.status == self.Status.ACTIVE and timezone.now() < self.expires_at

    def __str__(self):
        return f"Hold: {self.doctor} on {self.date} {self.start_time} by {self.patient}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED_BY_PATIENT = 'CANCELLED_BY_PATIENT', 'Cancelled by Patient'
        CANCELLED_BY_DOCTOR = 'CANCELLED_BY_DOCTOR', 'Cancelled by Doctor'
        CANCELLED_LEAVE_CONFLICT = 'CANCELLED_LEAVE_CONFLICT', 'Cancelled Due to Doctor Leave'
        RESCHEDULED = 'RESCHEDULED', 'Rescheduled'

    class UrgencyLevel(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_appointments')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='doctor_appointments')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CONFIRMED)
    
    # Patient Symptom Input
    symptoms_text = models.TextField(help_text="Symptoms provided by patient at time of booking")
    symptom_duration = models.CharField(max_length=100, blank=True, null=True)
    severity_scale = models.IntegerField(default=5, help_text="Scale 1-10")
    
    # AI Pre-Visit Analysis Output
    urgency_level = models.CharField(max_length=20, choices=UrgencyLevel.choices, default=UrgencyLevel.LOW)
    chief_complaint = models.TextField(blank=True, null=True)
    suggested_questions = models.JSONField(default=list, help_text="3 diagnostic questions suggested by LLM for the doctor")
    ai_pre_visit_raw = models.TextField(blank=True, null=True)
    
    # Integration References
    google_event_id = models.CharField(max_length=255, blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['doctor', 'date', 'start_time'],
                condition=models.Q(status__in=['CONFIRMED']),
                name='unique_active_doctor_slot'
            )
        ]
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"Appt #{self.id}: Dr. {self.doctor.user.get_full_name()} with {self.patient.get_full_name()} ({self.date} {self.start_time})"
