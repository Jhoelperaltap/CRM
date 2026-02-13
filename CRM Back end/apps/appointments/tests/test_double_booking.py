import datetime

import pytest
from django.utils import timezone

from apps.appointments.models import Appointment
from tests.factories import AppointmentFactory, ContactFactory, UserFactory


@pytest.mark.django_db
class TestDoubleBookingPrevention:
    """Tests that overlapping appointments for the same staff member are rejected."""

    URL = "/api/v1/appointments/"

    def test_overlapping_appointment_rejected(self, admin_client, admin_user):
        contact = ContactFactory()
        start = timezone.now() + datetime.timedelta(days=5)
        end = start + datetime.timedelta(hours=1)

        # Create first appointment
        AppointmentFactory(
            assigned_to=admin_user,
            start_datetime=start,
            end_datetime=end,
            status="scheduled",
        )

        # Try to create overlapping appointment
        resp = admin_client.post(
            self.URL,
            {
                "title": "Overlap Test",
                "contact": str(contact.id),
                "assigned_to": str(admin_user.id),
                "start_datetime": (start + datetime.timedelta(minutes=30)).isoformat(),
                "end_datetime": (end + datetime.timedelta(minutes=30)).isoformat(),
                "location": "office",
            },
            format="json",
        )
        assert resp.status_code == 400
        assert "conflicting" in str(resp.data).lower()

    def test_non_overlapping_appointment_allowed(self, admin_client, admin_user):
        contact = ContactFactory()
        start = timezone.now() + datetime.timedelta(days=5)
        end = start + datetime.timedelta(hours=1)

        AppointmentFactory(
            assigned_to=admin_user,
            start_datetime=start,
            end_datetime=end,
            status="scheduled",
        )

        # Non-overlapping (after the first one ends)
        resp = admin_client.post(
            self.URL,
            {
                "title": "After Test",
                "contact": str(contact.id),
                "assigned_to": str(admin_user.id),
                "start_datetime": (end + datetime.timedelta(minutes=15)).isoformat(),
                "end_datetime": (
                    end + datetime.timedelta(hours=1, minutes=15)
                ).isoformat(),
                "location": "office",
            },
            format="json",
        )
        assert resp.status_code == 201

    def test_cancelled_appointment_ignored(self, admin_client, admin_user):
        """Cancelled appointments should not cause double-booking errors."""
        contact = ContactFactory()
        start = timezone.now() + datetime.timedelta(days=5)
        end = start + datetime.timedelta(hours=1)

        AppointmentFactory(
            assigned_to=admin_user,
            start_datetime=start,
            end_datetime=end,
            status="cancelled",
        )

        resp = admin_client.post(
            self.URL,
            {
                "title": "After Cancel",
                "contact": str(contact.id),
                "assigned_to": str(admin_user.id),
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
                "location": "office",
            },
            format="json",
        )
        assert resp.status_code == 201

    def test_different_staff_not_conflicting(self, admin_client, admin_user):
        """Different staff members can have overlapping appointments."""
        contact = ContactFactory()
        other_user = UserFactory()
        start = timezone.now() + datetime.timedelta(days=5)
        end = start + datetime.timedelta(hours=1)

        AppointmentFactory(
            assigned_to=other_user,
            start_datetime=start,
            end_datetime=end,
            status="scheduled",
        )

        resp = admin_client.post(
            self.URL,
            {
                "title": "Different Staff",
                "contact": str(contact.id),
                "assigned_to": str(admin_user.id),
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
                "location": "office",
            },
            format="json",
        )
        assert resp.status_code == 201


@pytest.mark.django_db
class TestCheckedInStatus:
    """Tests for the new CHECKED_IN appointment status."""

    def test_checked_in_status_exists(self):
        assert "checked_in" in [c[0] for c in Appointment.Status.choices]

    def test_create_checked_in_appointment(self, admin_client):
        contact = ContactFactory()
        start = timezone.now() + datetime.timedelta(days=1)
        end = start + datetime.timedelta(hours=1)

        resp = admin_client.post(
            "/api/v1/appointments/",
            {
                "title": "Walk-in",
                "contact": str(contact.id),
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
                "status": "checked_in",
                "location": "office",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["status"] == "checked_in"
