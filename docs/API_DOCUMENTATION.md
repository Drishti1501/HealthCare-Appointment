# REST API Documentation

Base URL: `http://localhost:8000/api`

All authenticated endpoints require an `Authorization: Bearer <jwt_access_token>` header.

---

## 1. Authentication & Users

### `POST /auth/login/`
Authenticates a user and issues JWT tokens.
- **Request Body**:
```json
{
  "email": "alice@example.com",
  "password": "patient123"
}
```
- **Response (200 OK)**:
```json
{
  "access": "eyJhbGciOiJIUz...",
  "refresh": "eyJhbGciOiJIUz...",
  "user": {
    "id": 1,
    "email": "alice@example.com",
    "role": "PATIENT",
    "first_name": "Alice",
    "last_name": "Wong"
  }
}
```

### `POST /auth/register/`
Registers a new Patient, Doctor, or Admin user.
- **Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1 (555) 123-4567",
  "role": "PATIENT"
}
```

### `GET /auth/me/`
Returns the currently authenticated user profile.

---

## 2. Doctors & Slot Allocation

### `GET /appointments/doctors/`
Searches active doctors with optional query filters.
- **Query Parameters**:
  - `specialization` (e.g. `Cardiology`, `Dermatology`)
  - `search` (e.g. `Smith`)

### `GET /appointments/doctors/{id}/slots/?date=YYYY-MM-DD`
Calculates real-time slot availability for a doctor on a specific date.
- **Response (200 OK)**:
```json
{
  "doctor_id": 1,
  "doctor_name": "Dr. Sarah Smith",
  "specialization": "Cardiology",
  "date": "2026-08-23",
  "is_on_leave": false,
  "slots": [
    { "start_time": "09:00", "end_time": "09:30", "status": "AVAILABLE", "is_available": true },
    { "start_time": "09:30", "end_time": "10:00", "status": "HELD", "is_available": false },
    { "start_time": "10:00", "end_time": "10:30", "status": "BOOKED", "is_available": false }
  ]
}
```

---

## 3. Slot Hold & Atomic Booking

### `POST /appointments/hold-slot/`
Acquires a 10-minute temporary lock on a slot using database transactions (`SELECT FOR UPDATE`).
- **Request Body**:
```json
{
  "doctor_id": 1,
  "date": "2026-08-23",
  "start_time": "09:00"
}
```
- **Response (201 Created)**:
```json
{
  "message": "Slot hold acquired for 10 minutes.",
  "hold": {
    "id": 14,
    "doctor": 1,
    "date": "2026-08-23",
    "start_time": "09:00:00",
    "expires_at": "2026-08-23T10:10:00Z",
    "hold_token": "c5f2b604e0e44b9fa8e747b0e12"
  }
}
```

### `POST /appointments/confirm-booking/`
Atomically converts an active slot hold into a confirmed appointment, invokes Gemini AI pre-visit analysis, creates Google Calendar event, and queues confirmation emails.
- **Request Body**:
```json
{
  "hold_token": "c5f2b604e0e44b9fa8e747b0e12",
  "symptoms_text": "Occasional rapid heart flutter and dizziness after stairs",
  "symptom_duration": "2 weeks",
  "severity_scale": 6
}
```
- **Response (201 Created)**:
```json
{
  "message": "Appointment confirmed successfully!",
  "appointment": {
    "id": 8,
    "doctor": 1,
    "date": "2026-08-23",
    "start_time": "09:00:00",
    "status": "CONFIRMED",
    "urgency_level": "MEDIUM",
    "chief_complaint": "Intermittent palpitations and mild exertional dizziness over 2 weeks.",
    "suggested_questions": [
      "Have you noticed any correlation with caffeine or stress?",
      "Any episodes of near-syncope?",
      "Family history of arrhythmias?"
    ]
  }
}
```

---

## 4. Consultations & Prescriptions

### `POST /prescriptions/submit-consultation/`
(Doctor only) Records diagnosis, clinical notes, multi-item prescription, triggers Gemini AI post-visit translation, and generates scheduled medication reminder background jobs.
- **Request Body**:
```json
{
  "appointment_id": 8,
  "diagnosis": "Benign Sinus Tachycardia",
  "clinical_notes": "Normal ECG, BP 120/80. Advised lifestyle modification and low-dose beta blocker.",
  "follow_up_date": "2026-09-06",
  "items": [
    {
      "medication_name": "Metoprolol Tartrate",
      "dosage": "25mg",
      "frequency": "DAILY",
      "duration_days": 14,
      "meal_timing": "AFTER_MEAL",
      "instructions": "Take once daily with breakfast"
    }
  ]
}
```

---

## 5. Doctor Leaves & Automated Conflicts

### `POST /appointments/leaves/`
(Doctor / Admin) Approves doctor leave. Overlapping bookings are automatically transitioned to `CANCELLED_LEAVE_CONFLICT` and cancellation emails sent to affected patients.
- **Request Body**:
```json
{
  "doctor_id": 1,
  "start_date": "2026-08-25",
  "end_date": "2026-08-27",
  "reason": "Medical Symposium"
}
```
