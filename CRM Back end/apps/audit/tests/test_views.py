import pytest
from rest_framework import status

from tests.factories import AuditLogFactory


BASE = "/api/v1/audit/"


@pytest.mark.django_db
class TestAuditLogAdminAccess:
    def test_admin_can_list(self, admin_client):
        AuditLogFactory.create_batch(3)
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
class TestAuditLogFilter:
    def test_filter_by_module(self, admin_client):
        AuditLogFactory(module="contacts", action="create")
        AuditLogFactory(module="cases", action="update")
        resp = admin_client.get(f"{BASE}?module=contacts")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["module"] == "contacts"

    def test_filter_by_action(self, admin_client):
        AuditLogFactory(action="create")
        AuditLogFactory(action="delete")
        resp = admin_client.get(f"{BASE}?action=delete")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["action"] == "delete"


@pytest.mark.django_db
class TestAuditLogReadOnly:
    def test_cannot_create(self, admin_client):
        resp = admin_client.post(
            BASE,
            {"action": "create", "module": "contacts", "object_id": "123"},
            format="json",
        )
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_cannot_delete(self, admin_client):
        log = AuditLogFactory()
        resp = admin_client.delete(f"{BASE}{log.id}/")
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
