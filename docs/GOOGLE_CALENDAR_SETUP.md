# Google Calendar API Integration Setup Guide

The Healthcare Appointment & Follow-up Manager integrates with Google Calendar using OAuth 2.0 to synchronize appointments on booking, rescheduling, and cancellation.

In addition, an RFC-5545 `.ics` iCalendar attachment is bundled with all confirmation emails to ensure 100% universal calendar support across Google Calendar, Apple Calendar, and Microsoft Outlook.

---

## Step 1: Create a Google Cloud Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Create Project**, name it `Healthcare-Appointment-Manager`, and click **Create**.
3. In the sidebar, navigate to **APIs & Services > Library**.
4. Search for **Google Calendar API** and click **Enable**.

---

## Step 2: Configure OAuth Consent Screen

1. In the sidebar, click **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** (or Internal for Google Workspace organizations) and click **Create**.
3. Fill in the App Information:
   - **App Name**: `Healthcare Manager`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Under **Scopes**, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/calendar` (See, edit, share, and permanently delete all the calendars you can access)
   - `https://www.googleapis.com/auth/calendar.events`
5. Save and continue.

---

## Step 3: Create OAuth 2.0 Client Credentials

1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth Client ID**.
3. Application Type: **Web application**.
4. Set Authorized redirect URIs:
   - `http://localhost:8000/api/integrations/google/callback/`
   - `http://127.0.0.1:8000/api/integrations/google/callback/`
5. Click **Create**.
6. Download the JSON credentials file and rename it to `credentials.json`.
7. Place `credentials.json` in the `backend/` directory.

---

## Step 4: Configure Environment Variables

Update your `.env` file in `backend/`:

```env
GOOGLE_CALENDAR_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/integrations/google/callback/
GOOGLE_CALENDAR_CREDENTIALS_FILE=credentials.json
GOOGLE_CALENDAR_TOKEN_FILE=token.json
```

---

## Step 5: How Synchronization Works in the System

- **On Appointment Booking**: Google Calendar event is created with the patient and doctor as attendees, with 24-hour and 30-minute reminder notifications.
- **On Reschedule**: Event start and end times are updated via `calendar.events.patch`.
- **On Cancellation / Doctor Leave**: The event is deleted from calendars via `calendar.events.delete`.
- **Offline / Sandbox Mode**: When OAuth credentials are not provided, the platform gracefully records unique calendar references and sends universal `.ics` invites in confirmation emails.
