"""
Recurrence generation and management for appointments.

Handles daily, weekly, and monthly patterns with configurable end dates
and series update/delete operations.
"""

import datetime

from django.utils import timezone

from apps.appointments.models import Appointment


def generate_recurring_appointments(parent, days_ahead=30):
    """
    Generate recurring instances for the next `days_ahead` days from today.

    Skips dates that already have an instance for the parent.
    Returns the list of newly created instances.
    """
    if parent.recurrence_pattern == Appointment.RecurrencePattern.NONE:
        return []

    today = timezone.now().date()
    end_boundary = today + datetime.timedelta(days=days_ahead)

    # Respect the recurrence end date if set
    if parent.recurrence_end_date and parent.recurrence_end_date < end_boundary:
        end_boundary = parent.recurrence_end_date

    # Collect existing instance dates to avoid duplicates
    existing_dates = set(
        parent.recurring_instances.values_list("start_datetime__date", flat=True)
    )

    # Also include the parent's own date
    existing_dates.add(parent.start_datetime.date())

    dates = _compute_dates(parent, today, end_boundary)
    duration = parent.end_datetime - parent.start_datetime

    created = []
    for d in dates:
        if d in existing_dates:
            continue
        if d <= parent.start_datetime.date():
            continue

        start_dt = datetime.datetime.combine(
            d, parent.start_datetime.time(), tzinfo=parent.start_datetime.tzinfo
        )

        # Final check: ensure no duplicate exists for this exact datetime
        # This handles race conditions and timezone edge cases
        if Appointment.objects.filter(
            parent_appointment=parent, start_datetime=start_dt
        ).exists():
            continue

        instance = Appointment.objects.create(
            title=parent.title,
            description=parent.description,
            start_datetime=start_dt,
            end_datetime=start_dt + duration,
            location=parent.location,
            status=Appointment.Status.SCHEDULED,
            contact=parent.contact,
            assigned_to=parent.assigned_to,
            created_by=parent.created_by,
            case=parent.case,
            reminder_at=_compute_reminder(parent, start_dt),
            notes=parent.notes,
            recurrence_pattern=Appointment.RecurrencePattern.NONE,
            parent_appointment=parent,
        )
        created.append(instance)

    return created


def _compute_dates(parent, start_date, end_date):
    """Compute all candidate dates for the recurrence pattern."""
    dates = []
    config = parent.recurrence_config or {}
    current = start_date

    if parent.recurrence_pattern == Appointment.RecurrencePattern.DAILY:
        while current <= end_date:
            dates.append(current)
            current += datetime.timedelta(days=1)

    elif parent.recurrence_pattern == Appointment.RecurrencePattern.WEEKLY:
        days_of_week = config.get("days_of_week")
        if not days_of_week:
            # Default to same weekday as parent
            days_of_week = [parent.start_datetime.weekday()]
        while current <= end_date:
            if current.weekday() in days_of_week:
                dates.append(current)
            current += datetime.timedelta(days=1)

    elif parent.recurrence_pattern == Appointment.RecurrencePattern.MONTHLY:
        day_of_month = config.get("day_of_month", parent.start_datetime.day)
        month = current.month
        year = current.year
        while True:
            try:
                candidate = datetime.date(year, month, day_of_month)
            except ValueError:
                # e.g. Feb 30 — skip
                candidate = None
            if candidate and start_date <= candidate <= end_date:
                dates.append(candidate)
            month += 1
            if month > 12:
                month = 1
                year += 1
            if datetime.date(year, month, 1) > end_date:
                break

    return dates


def _compute_reminder(parent, new_start):
    """Compute reminder_at for a recurring instance based on parent's offset."""
    if not parent.reminder_at:
        return None
    offset = parent.start_datetime - parent.reminder_at
    return new_start - offset


def update_recurring_series(parent, update_type, update_data, from_instance=None):
    """
    Update a recurring series.

    update_type: "this_only", "this_and_future", "all"
    update_data: dict of fields to update
    from_instance: the specific instance being edited (for this_and_future)
    """
    if update_type == "this_only" and from_instance:
        for key, value in update_data.items():
            setattr(from_instance, key, value)
        # Detach from series if time changed
        from_instance.save()
        return [from_instance]

    if update_type == "all":
        qs = parent.recurring_instances.all()
        for key, value in update_data.items():
            setattr(parent, key, value)
        parent.save()
        qs.update(**update_data)
        return list(qs) + [parent]

    if update_type == "this_and_future" and from_instance:
        qs = parent.recurring_instances.filter(
            start_datetime__gte=from_instance.start_datetime
        )
        for key, value in update_data.items():
            setattr(from_instance, key, value)
        from_instance.save()
        qs.exclude(pk=from_instance.pk).update(**update_data)
        return list(qs)

    return []


def delete_recurring_series(parent, delete_type, from_instance=None):
    """
    Delete recurring instances.

    delete_type: "this_only", "this_and_future", "all"
    """
    if delete_type == "this_only" and from_instance:
        from_instance.delete()
        return

    if delete_type == "all":
        parent.recurring_instances.all().delete()
        parent.delete()
        return

    if delete_type == "this_and_future" and from_instance:
        parent.recurring_instances.filter(
            start_datetime__gte=from_instance.start_datetime
        ).delete()
        # Update parent's recurrence end to just before this instance
        parent.recurrence_end_date = (
            from_instance.start_datetime.date() - datetime.timedelta(days=1)
        )
        parent.save(update_fields=["recurrence_end_date"])
