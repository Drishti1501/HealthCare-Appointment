from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from .tasks import cleanup_expired_slot_holds, dispatch_due_medication_reminders, retry_failed_email_notifications

scheduler = None

def start_background_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        return

    scheduler = BackgroundScheduler()
    
    # 1. Clean expired slot holds every 1 minute
    scheduler.add_job(
        cleanup_expired_slot_holds,
        trigger=IntervalTrigger(minutes=1),
        id='cleanup_expired_slot_holds_job',
        name='Clean expired slot holds',
        replace_existing=True
    )

    # 2. Dispatch due medication reminders every 1 minute
    scheduler.add_job(
        dispatch_due_medication_reminders,
        trigger=IntervalTrigger(minutes=1),
        id='dispatch_due_medication_reminders_job',
        name='Dispatch due medication reminders',
        replace_existing=True
    )

    # 3. Retry failed emails every 2 minutes
    scheduler.add_job(
        retry_failed_email_notifications,
        trigger=IntervalTrigger(minutes=2),
        id='retry_failed_email_notifications_job',
        name='Retry failed email notifications',
        replace_existing=True
    )

    scheduler.start()
    print("[APScheduler]: Healthcare background scheduler started successfully.")
