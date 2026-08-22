# System Design: Concurrency, Conflict Resolution & Reliability

This document outlines the core architectural strategies implemented in the Healthcare Appointment & Follow-up Manager to guarantee data consistency, race-condition safety, resilient doctor leave handling, and reliable asynchronous notifications.

---

## 1. Double-Booking Prevention & Concurrency Control

In a multi-patient healthcare system, concurrent booking requests for the same doctor and time slot create severe race condition risks. We enforce a **three-tier concurrency defense architecture**:

1. **Database-Level Partial Unique Index**: 
   At the database engine level, an active booking is guarded by a PostgreSQL/SQLite composite unique constraint:
   UNIQUE (doctor_id, appointment_date, start_time) WHERE status = 'CONFIRMED'.
   This ensures that even in extreme edge cases where concurrent worker threads bypass application checks, the database engine enforces atomicity and rejects duplicate commits with integrity violation errors.

2. **Pessimistic Row Locking (select_for_update)**:
   During slot availability checks and booking execution, transactions are wrapped inside Django's 	ransaction.atomic() context using select_for_update(). When Request A initiates booking on Slot S, it acquires an exclusive write lock on the doctor's profile row and any matching active slot records. Concurrent Request B attempting the same slot is placed in a queue until Request A completes, immediately observing the newly confirmed record and aborting with a clean HTTP 409 Conflict.

3. **Time-Partitioned Slot Segmentation**:
   Doctor working hours are partitioned into deterministic, non-overlapping intervals based on slot_duration_minutes (e.g., 09:00-09:30, 09:30-10:00). All booking queries align strictly to these boundaries.

---

## 2. Slot Hold Mechanism (Temporary Reservation)

To prevent clinical abandonment (where a patient spends minutes completing the symptom questionnaire only to discover the slot was claimed by someone else), the platform implements a **Distributed 10-Minute Slot Hold Engine**:

`
[Patient Selects Slot] 
       ↓ 
[Acquire Lock: SELECT FOR UPDATE] 
       ↓ 
[Create SlotHold record: Status=ACTIVE, expires_at=NOW + 10m] 
       ↓ 
[Generate Secure UUID hold_token] ──> Returned to Patient Client
       ↓
[Patient Fills Symptoms & Submits] 
       ↓
[Validate Hold Token & Atomically Convert SlotHold to Confirmed Appointment]
`

- **Hold Lifecycle**: When a patient selects an available slot, the system validates that no confirmed appointment or active hold exists. It generates a temporary SlotHold with expires_at = timezone.now() + timedelta(minutes=10) and returns a cryptographically secure hold_token.
- **Hold Collision Prevention**: If another patient requests the same slot, the system detects the unexpired active hold and marks the slot as HELD in real time, preventing duplicate holds.
- **Automated Eviction**: A background cron worker (cleanup_expired_slot_holds) executes every 60 seconds, transitioning expired unconfirmed holds to EXPIRED status, immediately returning them to the available pool.

---

## 3. Doctor Leave Conflict Handling

When a doctor or administrator records approved leave across a date range [start_date, end_date], the system performs an **Automated Cascade Resolution**:

1. **Atomic Invalidation**: Inside an isolated database transaction, all active SlotHold records falling within the leave range are expired.
2. **Status Transition**: All existing confirmed appointments within the leave window are atomically updated to CANCELLED_LEAVE_CONFLICT, preserving medical audit history while freeing clinical capacity.
3. **Automated Patient Alerting**: The system triggers mass cancellation notifications containing doctor leave details and a 1-click reschedule link for the affected patients.
4. **Google Calendar Event Removal**: The leave processor calls Google Calendar API v3 to delete external calendar entries for both doctor and patient attendees.

---

## 4. Notification Reliability & Failure Handling

Medical notifications (booking confirmations, calendar invites, post-visit instructions, and dosage reminders) require guaranteed at-least-once delivery:

- **Transactional Outbox Pattern**: Rather than dispatching SMTP network calls synchronously during HTTP requests (which introduces latency and risk of dropped emails on network timeouts), notifications are persisted into a database NotificationLog table with initial status QUEUED.
- **Asynchronous Worker with Exponential Backoff**: An APScheduler background task checks for failed deliveries every 2 minutes. Failed dispatches undergo automatic retries with exponential backoff (2^attempt * 2 minutes) up to 4 attempts.
- **Dead-Letter State Tracking**: Notifications failing 4 consecutive attempts transition to MAX_RETRIES_EXCEEDED and trigger administrative alert logs.
- **Dual-Channel Synchronization**: All booking confirmation emails bundle a generated RFC-5545 .ics iCalendar file alongside direct Google Calendar API OAuth sync, guaranteeing universal calendar integration across Google, Outlook, and Apple Calendar.
