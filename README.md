# ?? Healthcare Appointment & Follow-up Manager

An end-to-end healthcare appointment and clinical follow-up management platform built with **Python, Django, Django REST Framework (DRF)**, **React + Tailwind CSS**, and **Google Gemini AI**.

---

## ?? Key Features

1. **Role-Based Portals (Patient / Doctor / Admin)**:
   - **Patient**: Discover doctors by specialty, acquire 10-minute temporary slot holds, submit symptom questionnaires, view AI triage ratings, digital prescriptions, and medication schedules.
   - **Doctor**: Real-time queue, AI pre-visit clinical briefings with urgency indicators and 3 diagnostic questions, post-visit consultation workspace with diagnosis, multi-item prescription builder, and AI patient-friendly summary generator.
   - **Admin**: Doctor onboarding, working hours/slot duration configuration, leave conflict management, and notification delivery outbox.
2. **Double-Booking & Concurrency Protection**:
   - Database-level composite unique constraint: `(doctor, appointment_date, start_time)`.
   - Pessimistic transaction locking (`select_for_update()`).
   - 10-minute temporary `SlotHold` reservation engine with automated background expiration.
3. **Doctor Leave Conflict Resolver**:
   - Marking doctor leave automatically identifies all conflicting confirmed appointments, transitions their status to `CANCELLED_LEAVE_CONFLICT`, and triggers automated cancellation emails with 1-click reschedule guidance.
4. **AI-Powered Clinical Intelligence (Google Gemini)**:
   - **Pre-Visit Analysis**: `"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor."`
   - **Post-Visit Translation**: `"Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps."`
   - **Graceful Degradation**: Deterministic rule-based fallback engines ensure the platform never breaks if the AI API is unavailable.
5. **Background Workers & Reminders (APScheduler)**:
   - Medication reminder dispatch based on prescription frequency (`Daily`, `Twice Daily`, `Three Times Daily`, etc.).
   - Email retry queue with exponential backoff and dead-letter handling.
   - Expired slot hold eviction.
6. **Multi-Channel Calendar & Email Sync**:
   - Google Calendar API OAuth 2.0 integration + RFC-5545 `.ics` calendar file generator.
   - Nodemailer / Django Email backend with Outbox logging.

---

## ?? Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup (Django)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations authentication appointments prescriptions integrations
python manage.py migrate

# Seed database with sample doctors, patients, and bookings
python seed_data.py

# Start Django development server
python manage.py runserver
```
The Django API will be accessible at `http://127.0.0.1:8000/`.

### 2. Frontend Setup (React + Vite + Tailwind)

```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
The web app will be available at `http://localhost:5173/`.

---

## ?? Default Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@healthcare.local` | `admin123` |
| **Doctor (Cardiology)** | `dr.smith@healthcare.local` | `doctor123` |
| **Doctor (General Medicine)** | `dr.patel@healthcare.local` | `doctor123` |
| **Patient** | `alice@example.com` | `patient123` |
| **Patient** | `john.doe@example.com` | `patient123` |

*(You can also use the **Quick Switch Role** buttons at the top of the interface for 1-click instant login).*

---

## ?? Repository Structure

```
healthcare-appointment-manager/
+-- backend/
¦   +-- healthcare_core/        # Django settings, wsgi, asgi, root urls
¦   +-- authentication/         # Role-based User model (Patient, Doctor, Admin)
¦   +-- appointments/           # DoctorProfile, DoctorLeave, SlotHold, Appointment
¦   ¦   +-- services/           # Slot locking engine & leave conflict resolver
¦   +-- prescriptions/          # Prescriptions, Items, Medication reminders
¦   +-- ai_assistant/           # Gemini LLM pre/post-visit prompts & fallbacks
¦   +-- integrations/           # Google Calendar OAuth 2.0, .ics invite, & email outbox
¦   +-- jobs/                   # APScheduler background tasks & retry workers
¦   +-- manage.py
¦   +-- requirements.txt
¦   +-- seed_data.py
¦   +-- .env.example
+-- frontend/
¦   +-- src/
¦   ¦   +-- api/                # Typed Axios REST API client
¦   ¦   +-- context/            # AuthContext & state management
¦   ¦   +-- components/         # Navbar, Badges, Modals
¦   ¦   +-- pages/
¦   ¦   ¦   +-- patient/        # Doctor Directory, Booking Modal, Appointments, Prescriptions
¦   ¦   ¦   +-- doctor/         # Queue, Pre-Visit Brief, Consultation Workspace, Leaves
¦   ¦   ¦   +-- admin/          # Doctor roster, Leave resolver, Outbox logs
¦   ¦   ¦   +-- auth/           # Login & Registration modal
¦   ¦   +-- App.tsx
¦   ¦   +-- main.tsx
¦   +-- package.json
¦   +-- vite.config.ts
+-- docs/
¦   +-- SYSTEM_DESIGN.md        # 800-word System Design write-up
¦   +-- API_DOCUMENTATION.md    # Complete REST API reference
¦   +-- GOOGLE_CALENDAR_SETUP.md # Google Calendar OAuth guide
+-- README.md
```

---

## ?? Environment Configuration (`.env`)

Copy `backend/.env.example` to `backend/.env`:

```env
DJANGO_SECRET_KEY=healthcare-secret-key-change-in-production-2026
DEBUG=True
ALLOWED_HOSTS=*
FRONTEND_URL=http://localhost:5173

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Email Configuration (Defaults to Console backend)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=Healthcare Platform <noreply@healthcare-manager.local>

# Google Calendar OAuth 2.0
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/integrations/google/callback/
```

---

## ?? Deployment Guide (Render / Railway / Vercel)

### Deploy Backend (Render / Railway)
1. Set Build Command: `pip install -r requirements.txt && python manage.py migrate && python seed_data.py`
2. Set Start Command: `gunicorn healthcare_core.wsgi:application`
3. Add Environment Variables from `.env.example`.

### Deploy Frontend (Vercel / Netlify)
1. Set Root Directory: `frontend`
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set `VITE_API_URL` to your deployed backend URL.
