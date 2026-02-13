import pytest
from rest_framework import status

from tests.factories import EmailAccountFactory, EmailSyncLogFactory


ACCOUNTS_BASE = "/api/v1/settings/email-accounts/"
LOGS_BASE = "/api/v1/settings/email-logs/"


@pytest.mark.django_db
class TestEmailAccountSettings:
    def test_admin_can_list(self, admin_client):
        EmailAccountFactory.create_batch(2)
        resp = admin_client.get(ACCOUNTS_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 2

    def test_admin_can_create(self, admin_client):
        resp = admin_client.post(
            ACCOUNTS_BASE,
            {
                "name": "New Account",
                "email_address": "new@example.com",
                "imap_host": "imap.example.com",
                "imap_port": 993,
                "smtp_host": "smtp.example.com",
                "smtp_port": 587,
                "username": "new@example.com",
                "password": "secret123",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Account"
        assert "password" not in resp.data

    def test_admin_can_update(self, admin_client):
        account = EmailAccountFactory()
        resp = admin_client.patch(
            f"{ACCOUNTS_BASE}{account.id}/",
            {"name": "Updated Name"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Updated Name"

    def test_admin_can_delete(self, admin_client):
        account = EmailAccountFactory()
        resp = admin_client.delete(f"{ACCOUNTS_BASE}{account.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(ACCOUNTS_BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(ACCOUNTS_BASE)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestEmailSyncLogs:
    def test_admin_can_list(self, admin_client):
        EmailSyncLogFactory.create_batch(3)
        resp = admin_client.get(LOGS_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(LOGS_BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_filter_by_status(self, admin_client):
        EmailSyncLogFactory(status="success")
        EmailSyncLogFactory(status="error", error_message="timeout")
        resp = admin_client.get(f"{LOGS_BASE}?status=error")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["status"] == "error"
