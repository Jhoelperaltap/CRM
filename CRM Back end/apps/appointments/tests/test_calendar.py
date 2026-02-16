import datetime

import pytest
from django.core.cache import cache
from django.utils import timezone

from tests.factories import AppointmentFactory, ContactFactory


@pytest.mark.django_db
class TestCalendarEndpoint:
    """Tests for GET /api/v1/appointments/calendar/."""

    URL = "/api/v1/appointments/calendar/"

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        """Clear cache before each test to avoid stale module_active cache."""
        cache.clear()
        yield
        cache.clear()

    def test_requires_date_params(self, authenticated_client):
        resp = authenticated_client.get(self.URL)
        assert resp.status_code == 400
        assert "start_date" in resp.data["detail"]

    def test_returns_appointments_in_range(self, authenticated_client, preparer_user):
        # Use a fixed reference point at noon UTC to avoid timezone boundary issues
        now = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0)
        contact = ContactFactory()

        # Inside range - 3 days from now at noon
        appt1 = AppointmentFactory(
            title="In Range",
            contact=contact,
            start_datetime=now + datetime.timedelta(days=3),
            end_datetime=now + datetime.timedelta(days=3, hours=1),
            assigned_to=preparer_user,
        )
        # Outside range - 60 days from now
        AppointmentFactory(
            title="Out of Range",
            contact=contact,
            start_datetime=now + datetime.timedelta(days=60),
            end_datetime=now + datetime.timedelta(days=60, hours=1),
        )

        # Query with a wide range to ensure the appointment is included
        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + datetime.timedelta(days=14)).strftime("%Y-%m-%d")

        resp = authenticated_client.get(
            self.URL, {"start_date": start_date, "end_date": end_date}
        )
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.data]
        assert str(appt1.id) in ids

    def test_filter_by_assigned_to(
        self, authenticated_client, preparer_user, admin_user
    ):
        # Use a fixed reference point at noon UTC to avoid timezone boundary issues
        now = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0)
        contact = ContactFactory()

        appt1 = AppointmentFactory(
            contact=contact,
            start_datetime=now + datetime.timedelta(days=3),
            end_datetime=now + datetime.timedelta(days=3, hours=1),
            assigned_to=preparer_user,
        )
        AppointmentFactory(
            contact=contact,
            start_datetime=now + datetime.timedelta(days=3),
            end_datetime=now + datetime.timedelta(days=3, hours=1),
            assigned_to=admin_user,
        )

        # Query with a wide range
        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + datetime.timedelta(days=14)).strftime("%Y-%m-%d")

        resp = authenticated_client.get(
            self.URL,
            {
                "start_date": start_date,
                "end_date": end_date,
                "assigned_to": str(preparer_user.id),
            },
        )
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.data]
        assert str(appt1.id) in ids
        assert len(ids) == 1

    def test_calendar_includes_color(self, authenticated_client):
        # Use a fixed reference point at noon UTC to avoid timezone boundary issues
        now = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0)
        contact = ContactFactory()
        appt = AppointmentFactory(
            contact=contact,
            status="confirmed",
            start_datetime=now + datetime.timedelta(days=3),
            end_datetime=now + datetime.timedelta(days=3, hours=1),
        )

        # Query with a wide range
        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + datetime.timedelta(days=14)).strftime("%Y-%m-%d")

        resp = authenticated_client.get(
            self.URL, {"start_date": start_date, "end_date": end_date}
        )
        assert resp.status_code == 200
        assert (
            len(resp.data) > 0
        ), f"Expected appointments but got empty response. Appointment: {appt.id}, start: {appt.start_datetime}, range: {start_date} to {end_date}"
        assert resp.data[0]["color"] == "#10b981"  # confirmed = green


@pytest.mark.django_db
class TestQuickCreate:
    """Tests for POST /api/v1/appointments/quick-create/."""

    URL = "/api/v1/appointments/quick-create/"

    def test_quick_create_minimal(self, authenticated_client):
        contact = ContactFactory()
        now = timezone.now()

        resp = authenticated_client.post(
            self.URL,
            {
                "title": "Quick Meeting",
                "contact": str(contact.id),
                "start_datetime": (now + datetime.timedelta(hours=1)).isoformat(),
                "end_datetime": (now + datetime.timedelta(hours=2)).isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["title"] == "Quick Meeting"

    def test_quick_create_validates_times(self, authenticated_client):
        contact = ContactFactory()
        now = timezone.now()

        resp = authenticated_client.post(
            self.URL,
            {
                "title": "Bad Time",
                "contact": str(contact.id),
                "start_datetime": (now + datetime.timedelta(hours=2)).isoformat(),
                "end_datetime": (now + datetime.timedelta(hours=1)).isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 400
