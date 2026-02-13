import datetime

import pytest
from django.utils import timezone

from apps.appointments.tasks import (
    generate_recurring_instances,
    process_appointment_reminders,
)
from apps.notifications.models import Notification
from tests.factories import AppointmentFactory, ContactFactory, UserFactory


@pytest.mark.django_db
class TestProcessAppointmentReminders:
    """Tests for the reminder Celery task."""

    def test_creates_notification(self):
        user = UserFactory()
        contact = ContactFactory()
        now = timezone.now()

        AppointmentFactory(
            contact=contact,
            assigned_to=user,
            status="scheduled",
            reminder_at=now - datetime.timedelta(minutes=5),
            start_datetime=now + datetime.timedelta(hours=1),
            end_datetime=now + datetime.timedelta(hours=2),
        )

        count = process_appointment_reminders()
        assert count == 1
        notif = Notification.objects.get(
            recipient=user,
            notification_type="appointment_reminder",
        )
        assert "Upcoming:" in notif.title

    def test_no_duplicate_reminders(self):
        user = UserFactory()
        contact = ContactFactory()
        now = timezone.now()

        AppointmentFactory(
            contact=contact,
            assigned_to=user,
            status="scheduled",
            reminder_at=now - datetime.timedelta(minutes=5),
            start_datetime=now + datetime.timedelta(hours=1),
            end_datetime=now + datetime.timedelta(hours=2),
        )

        process_appointment_reminders()
        count = process_appointment_reminders()
        assert count == 0  # No duplicates

    def test_skips_past_appointments(self):
        user = UserFactory()
        contact = ContactFactory()
        now = timezone.now()

        AppointmentFactory(
            contact=contact,
            assigned_to=user,
            status="scheduled",
            reminder_at=now - datetime.timedelta(hours=2),
            start_datetime=now - datetime.timedelta(hours=1),  # already past
            end_datetime=now,
        )

        count = process_appointment_reminders()
        assert count == 0

    def test_skips_cancelled(self):
        user = UserFactory()
        contact = ContactFactory()
        now = timezone.now()

        AppointmentFactory(
            contact=contact,
            assigned_to=user,
            status="cancelled",
            reminder_at=now - datetime.timedelta(minutes=5),
            start_datetime=now + datetime.timedelta(hours=1),
            end_datetime=now + datetime.timedelta(hours=2),
        )

        count = process_appointment_reminders()
        assert count == 0


@pytest.mark.django_db
class TestGenerateRecurringInstances:
    """Tests for the daily recurring generation task."""

    def test_generates_instances_for_recurring_parents(self):
        contact = ContactFactory()
        now = timezone.now()

        AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            start_datetime=now - datetime.timedelta(days=1),
            end_datetime=now - datetime.timedelta(days=1) + datetime.timedelta(hours=1),
        )

        count = generate_recurring_instances()
        assert count > 0

    def test_skips_expired_recurrence(self):
        contact = ContactFactory()
        now = timezone.now()

        AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            recurrence_end_date=(now - datetime.timedelta(days=5)).date(),
            start_datetime=now - datetime.timedelta(days=10),
            end_datetime=now
            - datetime.timedelta(days=10)
            + datetime.timedelta(hours=1),
        )

        count = generate_recurring_instances()
        assert count == 0
