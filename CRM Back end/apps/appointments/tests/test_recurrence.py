import datetime

import pytest
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.appointments.recurrence import (
    delete_recurring_series,
    generate_recurring_appointments,
    update_recurring_series,
)
from tests.factories import AppointmentFactory, ContactFactory


@pytest.mark.django_db
class TestGenerateRecurring:
    """Tests for generate_recurring_appointments()."""

    def test_daily_generates_instances(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            recurrence_end_date=None,
            start_datetime=now - datetime.timedelta(days=1),
            end_datetime=now - datetime.timedelta(days=1) + datetime.timedelta(hours=1),
        )

        instances = generate_recurring_appointments(parent, days_ahead=7)
        # Should create instances for the next 7 days (skipping parent's date)
        assert len(instances) > 0
        for inst in instances:
            assert inst.parent_appointment == parent
            assert inst.recurrence_pattern == "none"

    def test_weekly_generates_correct_days(self):
        contact = ContactFactory()
        # Start on a known Monday
        monday = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
        while monday.weekday() != 0:
            monday -= datetime.timedelta(days=1)

        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="weekly",
            recurrence_config={"days_of_week": [0, 2, 4]},  # Mon, Wed, Fri
            start_datetime=monday - datetime.timedelta(weeks=1),
            end_datetime=monday
            - datetime.timedelta(weeks=1)
            + datetime.timedelta(hours=1),
        )

        instances = generate_recurring_appointments(parent, days_ahead=14)
        assert len(instances) > 0
        for inst in instances:
            assert inst.start_datetime.weekday() in [0, 2, 4]

    def test_monthly_generates_instances(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="monthly",
            recurrence_config={"day_of_month": 15},
            start_datetime=now.replace(day=15) - datetime.timedelta(days=60),
            end_datetime=now.replace(day=15)
            - datetime.timedelta(days=60)
            + datetime.timedelta(hours=1),
        )

        instances = generate_recurring_appointments(parent, days_ahead=60)
        assert len(instances) > 0
        for inst in instances:
            assert inst.start_datetime.day == 15

    def test_respects_end_date(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            recurrence_end_date=(now + datetime.timedelta(days=3)).date(),
            start_datetime=now - datetime.timedelta(days=1),
            end_datetime=now - datetime.timedelta(days=1) + datetime.timedelta(hours=1),
        )

        instances = generate_recurring_appointments(parent, days_ahead=30)
        for inst in instances:
            assert inst.start_datetime.date() <= parent.recurrence_end_date

    def test_no_duplicates(self):
        contact = ContactFactory()
        now = timezone.now()
        # Start the parent further in the past to avoid date boundary issues
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            start_datetime=now - datetime.timedelta(days=7),
            end_datetime=now - datetime.timedelta(days=7) + datetime.timedelta(hours=1),
        )

        # First call creates instances
        first_instances = generate_recurring_appointments(parent, days_ahead=5)
        # Second call with same range should create no new instances
        instances2 = generate_recurring_appointments(parent, days_ahead=5)
        # Second call should create no new instances since all dates already exist
        assert (
            len(instances2) == 0
        ), f"Expected 0 new instances, got {len(instances2)}. First call created {len(first_instances)} instances."

    def test_none_pattern_no_instances(self):
        contact = ContactFactory()
        parent = AppointmentFactory(contact=contact, recurrence_pattern="none")
        instances = generate_recurring_appointments(parent)
        assert instances == []


@pytest.mark.django_db
class TestUpdateRecurringSeries:
    """Tests for update_recurring_series()."""

    def test_this_only_updates_single(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            title="Parent",
            start_datetime=now,
            end_datetime=now + datetime.timedelta(hours=1),
        )
        instances = generate_recurring_appointments(parent, days_ahead=5)
        instance = instances[0]

        update_recurring_series(
            parent, "this_only", {"title": "Updated"}, from_instance=instance
        )
        instance.refresh_from_db()
        assert instance.title == "Updated"
        parent.refresh_from_db()
        assert parent.title == "Parent"

    def test_all_updates_series(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            title="Original",
            start_datetime=now,
            end_datetime=now + datetime.timedelta(hours=1),
        )
        generate_recurring_appointments(parent, days_ahead=5)

        update_recurring_series(parent, "all", {"title": "All Updated"})
        parent.refresh_from_db()
        assert parent.title == "All Updated"


@pytest.mark.django_db
class TestDeleteRecurringSeries:
    """Tests for delete_recurring_series()."""

    def test_this_only_deletes_single(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            start_datetime=now,
            end_datetime=now + datetime.timedelta(hours=1),
        )
        instances = generate_recurring_appointments(parent, days_ahead=5)
        count_before = Appointment.objects.filter(parent_appointment=parent).count()

        delete_recurring_series(parent, "this_only", from_instance=instances[0])
        count_after = Appointment.objects.filter(parent_appointment=parent).count()
        assert count_after == count_before - 1

    def test_all_deletes_everything(self):
        contact = ContactFactory()
        now = timezone.now()
        parent = AppointmentFactory(
            contact=contact,
            recurrence_pattern="daily",
            start_datetime=now,
            end_datetime=now + datetime.timedelta(hours=1),
        )
        generate_recurring_appointments(parent, days_ahead=5)

        delete_recurring_series(parent, "all")
        assert not Appointment.objects.filter(pk=parent.pk).exists()
