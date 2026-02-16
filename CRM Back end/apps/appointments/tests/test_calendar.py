import datetime

import pytest
from django.utils import timezone

from tests.factories import AppointmentFactory, ContactFactory


@pytest.mark.django_db
class TestCalendarEndpoint:
    """Tests for GET /api/v1/appointments/calendar/."""

    URL = "/api/v1/appointments/calendar/"

    def test_requires_date_params(self, authenticated_client):
        resp = authenticated_client.get(self.URL)
        assert resp.status_code == 400
        assert "start_date" in resp.data["detail"]

    def test_returns_appointments_in_range(self, authenticated_client, preparer_user):
        now = timezone.now()
        contact = ContactFactory()

        # Inside range
        appt1 = AppointmentFactory(
            title="In Range",
            contact=contact,
            start_datetime=now + datetime.timedelta(days=1),
            end_datetime=now + datetime.timedelta(days=1, hours=1),
            assigned_to=preparer_user,
        )
        # Outside range
        AppointmentFactory(
            title="Out of Range",
            contact=contact,
            start_datetime=now + datetime.timedelta(days=60),
            end_datetime=now + datetime.timedelta(days=60, hours=1),
        )

        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + datetime.timedelta(days=7)).strftime("%Y-%m-%d")

        resp = authenticated_client.get(
            self.URL, {"start_date": start_date, "end_date": end_date}
        )
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.data]
        assert str(appt1.id) in ids

    def test_filter_by_assigned_to(
        self, authenticated_client, preparer_user, admin_user
    ):
        now = timezone.now()
        contact = ContactFactory()

        appt1 = AppointmentFactory(
            contact=contact,
            start_datetime=now + datetime.timedelta(days=1),
            end_datetime=now + datetime.timedelta(days=1, hours=1),
            assigned_to=preparer_user,
        )
        AppointmentFactory(
            contact=contact,
            start_datetime=now + datetime.timedelta(days=1),
            end_datetime=now + datetime.timedelta(days=1, hours=1),
            assigned_to=admin_user,
        )

        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + datetime.timedelta(days=7)).strftime("%Y-%m-%d")

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
        now = timezone.now()
        contact = ContactFactory()
        AppointmentFactory(
            contact=contact,
            status="confirmed",
            start_datetime=now + datetime.timedelta(days=1),
            end_datetime=now + datetime.timedelta(days=1, hours=1),
        )

        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + datetime.timedelta(days=7)).strftime("%Y-%m-%d")

        resp = authenticated_client.get(
            self.URL, {"start_date": start_date, "end_date": end_date}
        )
        assert resp.status_code == 200
        assert len(resp.data) > 0
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
