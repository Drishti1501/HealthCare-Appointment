from rest_framework import serializers
from .models import Prescription, PrescriptionItem, MedicationReminderLog

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medication_name', 'dosage', 'frequency', 'duration_days', 'meal_timing', 'instructions']


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, required=False)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    appointment_date = serializers.DateField(source='appointment.date', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'doctor', 'doctor_name', 'patient', 'patient_name',
            'appointment_date', 'diagnosis', 'clinical_notes', 'follow_up_date',
            'patient_friendly_summary', 'structured_ai_summary', 'items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['doctor', 'patient', 'patient_friendly_summary', 'structured_ai_summary', 'created_at', 'updated_at']


class MedicationReminderLogSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='prescription_item.medication_name', read_only=True)
    dosage = serializers.CharField(source='prescription_item.dosage', read_only=True)

    class Meta:
        model = MedicationReminderLog
        fields = ['id', 'medication_name', 'dosage', 'scheduled_time', 'sent_at', 'status', 'message_text']
