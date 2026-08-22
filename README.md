# Healthcare Appointment & Follow-up Manager

An end-to-end healthcare appointment platform with AI-powered symptom analysis, role-based portals (Patient, Doctor, Admin), 10-minute temporary slot hold reservations, doctor leave conflict resolution, and automated medication reminders.

---

## Live Deployment

- Hosted Application (Vercel): https://health-care-appointment.vercel.app
- GitHub Repository: https://github.com/Drishti1501/HealthCare-Appointment

---

## Default Demo Accounts

Use the Quick Switch bar at the top of the app for 1-click login, or use these credentials:

| Portal | Email | Password | Role Description |
| :--- | :--- | :--- | :--- |
| Admin | admin@healthcare.local | admin123 | Doctor profile & leave management, outbox monitoring |
| Doctor | dr.smith@healthcare.local | doctor123 | Cardiology specialist - agenda, AI briefs, prescriptions |
| Doctor | dr.patel@healthcare.local | doctor123 | General Medicine - consultation workspace |
| Patient | alice@example.com | patient123 | Search doctors, hold slots, AI triage, care plans |
| Patient | john.doe@example.com | patient123 | View prescriptions and medication reminders |

---

## Key Features

1. Role-Based Portals:
   - Patient Portal: Search doctors by specialty, book slots with a 10-minute live hold countdown, submit symptoms with Gemini AI triage, view digital prescriptions and dosage reminders.
   - Doctor Portal: View daily patient queue, review pre-visit AI briefs with 3 suggested diagnostic questions and urgency ratings (Low / Medium / High), record prescriptions, and generate plain-language AI patient summaries.
   - Admin Portal: Manage doctor rosters, working hours, and doctor leaves with automatic conflict resolution.

2. Double-Booking & Concurrency Protection:
   - Database unique constraint on (doctor, date, start_time).
   - Pessimistic row locking (select_for_update) during slot reservation.
   - 10-minute temporary SlotHold mechanism with automatic background expiration.

3. Doctor Leave Conflict Resolver:
   - When a doctor marks leave, overlapping confirmed appointments are automatically cancelled (CANCELLED_LEAVE_CONFLICT) and affected patients receive email alerts with 1-click reschedule links.

4. AI-Powered Intelligence (Google Gemini):
   - Pre-Visit: Evaluates patient symptoms to generate urgency triage, chief complaints, and diagnostic probing questions.
   - Post-Visit: Translates clinical notes into a patient-friendly care summary with structured medication timetables.
   - Graceful Fallback: Rule-based fallback engine ensures uninterrupted operation if the AI API is unavailable.

5. Background Jobs (APScheduler):
   - Automated medication reminders based on prescription frequency (Daily, Twice Daily, etc.).
   - Email retry queue with exponential backoff for failed deliveries.
   - Automatic cleanup of expired slot holds.

6. Calendar Integration:
   - Google Calendar API OAuth 2.0 sync.
   - Universal .ics iCalendar file attachment included in all confirmation emails.

---

## Local Setup

### 1. Backend (Django)

`ash
cd backend
pip install -r requirements.txt
python manage.py makemigrations authentication appointments prescriptions integrations
python manage.py migrate
python seed_data.py
python manage.py runserver
`
Backend API will run at http://127.0.0.1:8000/.

### 2. Frontend (React + Vite)

`ash
cd frontend
npm install
npm run dev
`
Frontend will run at http://localhost:5173/.

---

## Documentation

- System Design Write-up (800 words): docs/SYSTEM_DESIGN.md
- REST API Documentation: docs/API_DOCUMENTATION.md
- Google Calendar Setup Guide: docs/GOOGLE_CALENDAR_SETUP.md

---

## Project Structure

`
healthcare-appointment-manager/
|-- api/                        # Vercel serverless entry point
|   -- index.py
|-- backend/                    # Django Backend & REST API
|   |-- authentication/         # Role-based User model (Patient, Doctor, Admin)
|   |-- appointments/           # Doctor profiles, slot holds, bookings, leaves
|   |-- prescriptions/          # Prescriptions, dosage items, reminders
|   |-- ai_assistant/           # Gemini AI pre/post-visit services & prompts
|   |-- integrations/           # Calendar (.ics/OAuth) & email outbox
|   |-- jobs/                   # Background scheduler & reminder tasks
|   |-- healthcare_core/        # Django settings and root URLs
|   |-- seed_data.py            # Database seeder with demo data
|   -- requirements.txt
|-- frontend/                   # React + Tailwind CSS Frontend
|   |-- src/
|   |   |-- api/                # Axios API client
|   |   |-- context/            # Auth state management
|   |   |-- components/         # Navigation, badges, modals
|   |   -- pages/              # Patient, Doctor, Admin portal pages
|   |-- package.json
|   -- vite.config.ts
|-- docs/                       # System design & API documentation
|-- vercel.json                 # Vercel deployment configuration
-- README.md
`
