from django.db import models
from django.conf import settings
from appointments.models import Appointment, DoctorProfile

class Prescription(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='prescription')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='prescriptions')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='prescriptions')
    
    diagnosis = models.CharField(max_length=255)
    clinical_notes = models.TextField(help_text="Doctor clinical observations and findings")
    follow_up_date = models.DateField(blank=True, null=True)
    
    # AI Post-Visit Summary Output
    patient_friendly_summary = models.TextField(blank=True, null=True)
    structured_ai_summary = models.JSONField(default=dict, help_text="Structured timetable, warnings, and follow-up guidance")
    ai_post_visit_raw = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Prescription #{self.id} for {self.patient.get_full_name()} (Diagnosis: {self.diagnosis})"


class PrescriptionItem(models.Model):
    class Frequency(models.TextChoices):
        DAILY = 'DAILY', 'Once Daily (1x)'
        TWICE_DAILY = 'TWICE_DAILY', 'Twice Daily (2x)'
        THRICE_DAILY = 'THRICE_DAILY', 'Three Times Daily (3x)'
        FOUR_TIMES_DAILY = 'FOUR_TIMES_DAILY', 'Four Times Daily (4x)'
        EVERY_8_HOURS = 'EVERY_8_HOURS', 'Every 8 Hours'
        AS_NEEDED = 'AS_NEEDED', 'As Needed (PRN)'

    class MealTiming(models.TextChoices):
        BEFORE_MEAL = 'BEFORE_MEAL', 'Before Meal'
        AFTER_MEAL = 'AFTER_MEAL', 'After Meal'
        WITH_MEAL = 'WITH_MEAL', 'With Meal'
        EMPTY_STOMACH = 'EMPTY_STOMACH', 'On Empty Stomach'
        ANYTIME = 'ANYTIME', 'Anytime'

    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, help_text="e.g. 500mg, 10ml, 1 tablet")
    frequency = models.CharField(max_length=30, choices=Frequency.choices, default=Frequency.DAILY)
    duration_days = models.PositiveIntegerField(default=5)
    meal_timing = models.CharField(max_length=30, choices=MealTiming.choices, default=MealTiming.AFTER_MEAL)
    instructions = models.CharField(max_length=255, blank=True, null=True, help_text="e.g. Take with warm water")

    def __str__(self):
        return f"{self.medication_name} ({self.dosage}) - {self.frequency}"


class MedicationReminderLog(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'
        SKIPPED = 'SKIPPED', 'Skipped'

    prescription_item = models.ForeignKey(PrescriptionItem, on_delete=models.CASCADE, related_name='reminder_logs')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='medication_reminders')
    scheduled_time = models.DateTimeField()
    sent_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    message_text = models.TextField()
    retry_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_time']

    def __str__(self):
        return f"Reminder: {self.patient.email} - {self.prescription_item.medication_name} at {self.scheduled_time} [{self.status}]"
