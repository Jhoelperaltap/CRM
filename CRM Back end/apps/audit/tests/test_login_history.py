import pytest
from rest_framework import status

from tests.factories import LoginHistoryFactory

BASE = "/api/v1/settings/login-history/"


@pytest.mark.django_db
class TestLoginHistoryAccess:
    def test_admin_can_list(self, admin_client):
        LoginHistoryFactory.create_batch(3)
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(BASE)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestLoginHistoryFilter:
    def test_filter_by_status(self, admin_client):
        LoginHistoryFactory(status="success")
        LoginHistoryFactory(status="failed")
        resp = admin_client.get(f"{BASE}?status=failed")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["status"] == "failed"

    def test_filter_by_user(self, admin_client, admin_user):
        LoginHistoryFactory(user=admin_user, email_attempted=admin_user.email)
        LoginHistoryFactory()  # different user
        resp = admin_client.get(f"{BASE}?user={admin_user.id}")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert str(result["user"]) == str(admin_user.id)
