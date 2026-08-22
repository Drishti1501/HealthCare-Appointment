import os
import sys
import django
from datetime import date, time, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthcare_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from appointments.models import DoctorProfile, DoctorLeave, Appointment
from prescriptions.models import Prescription, PrescriptionItem

User = get_user_model()

def seed():
    print("--- Starting Database Seeding ---")

    # 1. Admin User
    admin, created = User.objects.get_or_create(
        email="admin@healthcare.local",
        defaults={
            'username': 'admin@healthcare.local',
            'first_name': 'Super',
            'last_name': 'Admin',
            'role': User.Role.ADMIN,
            'is_staff': True,
            'is_superuser': True
        }
    )
    if created:
        admin.set_password("admin123")
        admin.save()
        print("Created Admin: admin@healthcare.local (password: admin123)")

    # 2. Doctors Data
    doctors_data = [
        {
            'email': 'dr.smith@healthcare.local',
            'first_name': 'Sarah',
            'last_name': 'Smith',
            'specialization': 'Cardiology',
            'qualifications': 'MD, FACC, Harvard Medical School',
            'experience_years': 12,
            'consultation_fee': 150.00,
            'bio': 'Board-certified cardiologist specializing in preventive cardiology, hypertension, and coronary artery disease management.',
            'working_days': ['MON', 'TUE', 'WED', 'THU', 'FRI'],
            'start_time': time(9, 0),
            'end_time': time(17, 0),
            'slot_duration_minutes': 30,
        },
        {
            'email': 'dr.johnson@healthcare.local',
            'first_name': 'Robert',
            'last_name': 'Johnson',
            'specialization': 'Dermatology',
            'qualifications': 'MD, FAAD, Stanford Medicine',
            'experience_years': 8,
            'consultation_fee': 120.00,
            'bio': 'Expert dermatologist focusing on clinical dermatology, skin cancer screenings, acne treatment, and eczema care.',
            'working_days': ['MON', 'TUE', 'WED', 'THU'],
            'start_time': time(10, 0),
            'end_time': time(18, 0),
            'slot_duration_minutes': 20,
        },
        {
            'email': 'dr.patel@healthcare.local',
            'first_name': 'Ananya',
            'last_name': 'Patel',
            'specialization': 'General Medicine',
            'qualifications': 'MBBS, MD (Internal Medicine)',
            'experience_years': 10,
            'consultation_fee': 80.00,
            'bio': 'Compassionate primary care physician dedicated to comprehensive wellness, chronic disease management, and preventive health.',
            'working_days': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
            'start_time': time(8, 30),
            'end_time': time(16, 30),
            'slot_duration_minutes': 30,
        },
        {
            'email': 'dr.chen@healthcare.local',
            'first_name': 'David',
            'last_name': 'Chen',
            'specialization': 'Pediatrics',
            'qualifications': 'MD, FAAP, Johns Hopkins',
            'experience_years': 14,
            'consultation_fee': 110.00,
            'bio': 'Dedicated pediatrician with special focus on newborn development, childhood asthma, and preventive immunization.',
            'working_days': ['TUE', 'WED', 'THU', 'FRI', 'SAT'],
            'start_time': time(9, 0),
            'end_time': time(16, 0),
            'slot_duration_minutes': 30,
        },
        {
            'email': 'dr.miller@healthcare.local',
            'first_name': 'Elena',
            'last_name': 'Miller',
            'specialization': 'Neurology',
            'qualifications': 'MD, PhD, Mayo Clinic',
            'experience_years': 15,
            'consultation_fee': 180.00,
            'bio': 'Neurologist specializing in migraine disorders, neuropathies, sleep disorders, and cognitive assessments.',
            'working_days': ['MON', 'WED', 'FRI'],
            'start_time': time(9, 0),
            'end_time': time(17, 0),
            'slot_duration_minutes': 45,
        }
    ]

    doctor_profiles = []
    for doc in doctors_data:
        u, created = User.objects.get_or_create(
            email=doc['email'],
            defaults={
                'username': doc['email'],
                'first_name': doc['first_name'],
                'last_name': doc['last_name'],
                'role': User.Role.DOCTOR,
                'phone': '+1 (555) 019-2834'
            }
        )
        if created:
            u.set_password("doctor123")
            u.save()

        profile, p_created = DoctorProfile.objects.get_or_create(
            user=u,
            defaults={
                'specialization': doc['specialization'],
                'qualifications': doc['qualifications'],
                'experience_years': doc['experience_years'],
                'consultation_fee': doc['consultation_fee'],
                'bio': doc['bio'],
                'working_days': doc['working_days'],
                'start_time': doc['start_time'],
                'end_time': doc['end_time'],
                'slot_duration_minutes': doc['slot_duration_minutes'],
                'is_active': True
            }
        )
        doctor_profiles.append(profile)
        print(f"Dr. {doc['first_name']} {doc['last_name']} ({doc['specialization']}) ready. Email: {doc['email']} (pw: doctor123)")

    # 3. Patient Users
    patients_data = [
        {'email': 'alice@example.com', 'first': 'Alice', 'last': 'Wong', 'phone': '+1 (555) 345-6789', 'dob': '1992-04-15', 'gender': 'Female', 'blood': 'A+'},
        {'email': 'john.doe@example.com', 'first': 'John', 'last': 'Doe', 'phone': '+1 (555) 890-1234', 'dob': '1988-11-20', 'gender': 'Male', 'blood': 'O+'},
        {'email': 'emily.clark@example.com', 'first': 'Emily', 'last': 'Clark', 'phone': '+1 (555) 432-8765', 'dob': '1995-07-08', 'gender': 'Female', 'blood': 'B+'}
    ]

    patients = []
    for p in patients_data:
        pu, created = User.objects.get_or_create(
            email=p['email'],
            defaults={
                'username': p['email'],
                'first_name': p['first'],
                'last_name': p['last'],
                'role': User.Role.PATIENT,
                'phone': p['phone'],
                'gender': p['gender'],
                'blood_group': p['blood']
            }
        )
        if created:
            pu.set_password("patient123")
            pu.save()
        patients.append(pu)
        print(f"Patient {p['first']} {p['last']} ready. Email: {p['email']} (pw: patient123)")

    # 4. Sample Confirmed Appointments & AI Summaries
    today = date.today()
    tomorrow = today + timedelta(days=1)

    # Appointment 1: Alice with Dr. Smith (Cardiology)
    appt1, created = Appointment.objects.get_or_create(
        patient=patients[0],
        doctor=doctor_profiles[0],
        date=tomorrow,
        start_time=time(10, 0),
        defaults={
            'end_time': time(10, 30),
            'status': Appointment.Status.CONFIRMED,
            'symptoms_text': 'Experiencing occasional rapid heart flutter after climbing stairs, mild dizziness, and slight fatigue in the afternoon.',
            'symptom_duration': '2 weeks',
            'severity_scale': 6,
            'urgency_level': Appointment.UrgencyLevel.MEDIUM,
            'chief_complaint': 'Intermittent palpitations and mild exertional dizziness over 2 weeks.',
            'suggested_questions': [
                'Have you noticed any association between palpitations and caffeine, stress, or exercise?',
                'Have you experienced any episodes of near-fainting or chest tightness?',
                'Are there any family history of arrhythmias or sudden cardiac issues?'
            ]
        }
    )

    # Appointment 2: John with Dr. Patel (General Medicine) - Completed with Prescription
    appt2, created = Appointment.objects.get_or_create(
        patient=patients[1],
        doctor=doctor_profiles[2],
        date=today - timedelta(days=2),
        start_time=time(11, 0),
        defaults={
            'end_time': time(11, 30),
            'status': Appointment.Status.COMPLETED,
            'symptoms_text': 'Persistent dry cough, mild sore throat, and low-grade evening fever.',
            'symptom_duration': '5 days',
            'severity_scale': 4,
            'urgency_level': Appointment.UrgencyLevel.LOW,
            'chief_complaint': 'Upper respiratory symptoms with dry cough and mild fever.',
            'suggested_questions': [
                'Is the cough productive or accompanied by shortness of breath?',
                'Have you been exposed to anyone with flu or COVID-19 recently?',
                'Do you have any seasonal allergies or history of asthma?'
            ]
        }
    )

    if appt2 and not hasattr(appt2, 'prescription'):
        presc = Prescription.objects.create(
            appointment=appt2,
            doctor=appt2.doctor,
            patient=appt2.patient,
            diagnosis='Acute Viral Pharyngitis with Mild Bronchial Irritation',
            clinical_notes='Throat mildly erythematous. Lungs clear to auscultation bilaterally. Vital signs stable. Advised hydration and symptomatic relief.',
            follow_up_date=today + timedelta(days=5),
            patient_friendly_summary='You have a common viral throat and airway irritation. With adequate rest, hydration, and the prescribed soothing medication, your symptoms should resolve within 5-7 days.',
            structured_ai_summary={
                'patient_friendly_summary': 'You have a mild viral throat infection. Stay warm, hydrate well, and take prescribed medicines on schedule.',
                'medication_schedule': [
                    {'medication_name': 'Amoxicillin 500mg', 'dosage': '500mg', 'frequency': 'Twice Daily', 'timing': 'Morning and Night after meals', 'special_instructions': 'Complete 5-day course'},
                    {'medication_name': 'Cetirizine 10mg', 'dosage': '10mg', 'frequency': 'Once Daily', 'timing': 'At bedtime', 'special_instructions': 'May cause drowsiness'}
                ],
                'follow_up_steps': ['Drink plenty of warm fluids', 'Return for checkup in 5 days if cough worsens'],
                'warning_signs': ['Difficulty swallowing', 'Fever exceeding 102F']
            }
        )
        PrescriptionItem.objects.create(
            prescription=presc,
            medication_name='Amoxicillin',
            dosage='500mg',
            frequency=PrescriptionItem.Frequency.TWICE_DAILY,
            duration_days=5,
            meal_timing=PrescriptionItem.MealTiming.AFTER_MEAL,
            instructions='Take 1 tablet morning and night after food'
        )
        PrescriptionItem.objects.create(
            prescription=presc,
            medication_name='Cetirizine',
            dosage='10mg',
            frequency=PrescriptionItem.Frequency.DAILY,
            duration_days=5,
            meal_timing=PrescriptionItem.MealTiming.BEFORE_MEAL,
            instructions='Take 1 tablet at bedtime'
        )
        print("Created sample prescription and post-visit summary for John Doe.")

    print("\n=== Database Seeding Completed Successfully! ===")
    print("Default Login Credentials:")
    print("  Admin:   admin@healthcare.local / admin123")
    print("  Doctor:  dr.smith@healthcare.local / doctor123")
    print("  Doctor:  dr.patel@healthcare.local / doctor123")
    print("  Patient: alice@example.com / patient123")
    print("  Patient: john.doe@example.com / patient123")

if __name__ == '__main__':
    seed()
