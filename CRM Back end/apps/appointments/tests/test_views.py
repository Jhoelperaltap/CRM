import datetime

import pytest
from django.utils import timezone
from rest_framework import status

from tests.factories import AppointmentFactory, ContactFactory

BASE = "/api/v1/appointments/"


@pytest.mark.django_db
class TestAppointmentList:
    def test_list(self, authenticated_client):
        AppointmentFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3


@pytest.mark.django_db
class TestAppointmentCreate:
    def test_create(self, authenticated_client):
        contact = ContactFactory()
        now = timezone.now()
        resp = authenticated_client.post(
            BASE,
            {
                "title": "Tax Consultation",
                "start_datetime": now.isoformat(),
                "end_datetime": (now + timezone.timedelta(hours=1)).isoformat(),
                "contact": str(contact.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Tax Consultation"

    def test_create_missing_contact(self, authenticated_client):
        now = timezone.now()
        resp = authenticated_client.post(
            BASE,
            {
                "title": "No Contact",
                "start_datetime": now.isoformat(),
                "end_datetime": (now + timezone.timedelta(hours=1)).isoformat(),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAppointmentRetrieve:
    def test_retrieve(self, authenticated_client):
        appt = AppointmentFactory()
        resp = authenticated_client.get(f"{BASE}{appt.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(appt.id)


@pytest.mark.django_db
class TestAppointmentUpdate:
    def test_patch(self, authenticated_client):
        appt = AppointmentFactory()
        resp = authenticated_client.patch(
            f"{BASE}{appt.id}/", {"title": "Updated"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Updated"


@pytest.mark.django_db
class TestAppointmentDelete:
    def test_admin_can_delete(self, admin_client):
        appt = AppointmentFactory()
        resp = admin_client.delete(f"{BASE}{appt.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_cannot_delete(self, authenticated_client):
        appt = AppointmentFactory()
        resp = authenticated_client.delete(f"{BASE}{appt.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAppointmentDateFilter:
    def test_date_range_filter(self, authenticated_client):
        now = timezone.now()
        # Create one in range and one out of range
        AppointmentFactory(
            start_datetime=now,
            end_datetime=now + datetime.timedelta(hours=1),
        )
        AppointmentFactory(
            start_datetime=now - datetime.timedelta(days=60),
            end_datetime=now
            - datetime.timedelta(days=60)
            + datetime.timedelta(hours=1),
        )
        date_from = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
        date_to = (now + datetime.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
        resp = authenticated_client.get(
            f"{BASE}?date_from={date_from}&date_to={date_to}"
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        assert resp.data["count"] >= 1
