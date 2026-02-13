"""
Celery tasks for appointment reminders and recurring instance generation.
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def process_appointment_reminders():
    """
    Check for appointments whose reminder_at has passed but no notification
    has been created yet. Runs every 15 minutes.
    """
    from apps.appointments.models import Appointment
    from apps.notifications.models import Notification

    now = timezone.now()
    appointments = Appointment.objects.filter(
        reminder_at__lte=now,
        reminder_at__isnull=False,
        status__in=["scheduled", "confirmed"],
        start_datetime__gt=now,
    ).select_related("assigned_to", "contact")

    created_count = 0
    for appt in appointments:
        if not appt.assigned_to:
            continue

        # Check if we already sent a reminder for this appointment
        existing = Notification.objects.filter(
            notification_type="appointment_reminder",
            related_object_id=str(appt.id),
            recipient=appt.assigned_to,
        ).exists()

        if existing:
            continue

        contact_name = (
            f"{appt.contact.first_name} {appt.contact.last_name}".strip()
            if appt.contact
            else "Unknown"
        )
        Notification.objects.create(
            recipient=appt.assigned_to,
            notification_type="appointment_reminder",
            title=f"Upcoming: {appt.title}",
            message=(
                f"Appointment with {contact_name} at "
                f"{appt.start_datetime:%I:%M %p on %b %d, %Y}"
            ),
            severity="info",
            related_object_id=str(appt.id),
            related_object_type="appointment",
        )
        created_count += 1

    logger.info("Created %d appointment reminders", created_count)
    return created_count


@shared_task
def generate_recurring_instances():
    """
    Generate recurring appointment instances for the next 30 days.
    Runs daily at 1 AM.
    """
    from apps.appointments.models import Appointment
    from apps.appointments.recurrence import generate_recurring_appointments

    parents = Appointment.objects.filter(
        recurrence_pattern__in=["daily", "weekly", "monthly"],
        parent_appointment__isnull=True,
    ).select_related("contact", "assigned_to", "created_by", "case")

    total_created = 0
    for parent in parents:
        # Skip if recurrence has ended
        if (
            parent.recurrence_end_date
            and parent.recurrence_end_date < timezone.now().date()
        ):
            continue
        instances = generate_recurring_appointments(parent)
        total_created += len(instances)

    logger.info("Generated %d recurring appointment instances", total_created)
    return total_created
