from rest_framework import serializers
from django.contrib.auth import get_user_model
from authentication.serializers import UserDetailSerializer
from .models import DoctorProfile, DoctorLeave, SlotHold, Appointment

User = get_user_model()

class DoctorProfileSerializer(serializers.ModelSerializer):
    user_details = UserDetailSerializer(source='user', read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='DOCTOR'),
        source='user',
        write_only=True,
        required=False
    )

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user_id', 'user_details', 'specialization', 'qualifications',
            'experience_years', 'consultation_fee', 'bio', 'working_days',
            'start_time', 'end_time', 'slot_duration_minutes', 'is_active',
            'created_at', 'updated_at'
        ]


class DoctorLeaveSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    specialization = serializers.CharField(source='doctor.specialization', read_only=True)

    class Meta:
        model = DoctorLeave
        fields = ['id', 'doctor', 'doctor_name', 'specialization', 'start_date', 'end_date', 'reason', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']


class SlotHoldSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    specialization = serializers.CharField(source='doctor.specialization', read_only=True)

    class Meta:
        model = SlotHold
        fields = ['id', 'doctor', 'doctor_name', 'specialization', 'date', 'start_time', 'end_time', 'expires_at', 'status', 'hold_token']
        read_only_fields = ['expires_at', 'status', 'hold_token']


class AppointmentSerializer(serializers.ModelSerializer):
    patient_details = UserDetailSerializer(source='patient', read_only=True)
    doctor_details = DoctorProfileSerializer(source='doctor', read_only=True)
    has_prescription = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_details', 'doctor', 'doctor_details',
            'date', 'start_time', 'end_time', 'status',
            'symptoms_text', 'symptom_duration', 'severity_scale',
            'urgency_level', 'chief_complaint', 'suggested_questions',
            'google_event_id', 'cancellation_reason', 'has_prescription',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'patient', 'status', 'urgency_level', 'chief_complaint',
            'suggested_questions', 'google_event_id', 'created_at', 'updated_at'
        ]

    def get_has_prescription(self, obj):
        return hasattr(obj, 'prescription')
