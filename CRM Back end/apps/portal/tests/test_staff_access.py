import pytest

from apps.portal.models import ClientPortalAccess
from tests.factories import ContactFactory


@pytest.mark.django_db
class TestStaffPortalAccessList:
    """Tests for GET /api/v1/settings/portal/accounts/."""

    URL = "/api/v1/settings/portal/accounts/"

    def test_admin_can_list_accounts(self, admin_client, portal_client_access):
        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_non_admin_cannot_list(self, authenticated_client):
        resp = authenticated_client.get(self.URL)
        assert resp.status_code == 403


@pytest.mark.django_db
class TestStaffPortalAccessInvite:
    """Tests for POST /api/v1/settings/portal/accounts/."""

    URL = "/api/v1/settings/portal/accounts/"

    def test_admin_can_invite_client(self, admin_client):
        contact = ContactFactory(email="new-client@example.com")
        resp = admin_client.post(
            self.URL,
            {"contact": str(contact.id)},
            format="json",
        )
        assert resp.status_code == 201
        assert "temp_password" in resp.data
        assert resp.data["email"] == "new-client@example.com"

        # Verify record was created
        assert ClientPortalAccess.objects.filter(contact=contact).exists()

    def test_invite_with_custom_email(self, admin_client):
        contact = ContactFactory(email="original@example.com")
        resp = admin_client.post(
            self.URL,
            {"contact": str(contact.id), "email": "override@example.com"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["email"] == "override@example.com"

    def test_cannot_invite_twice(
        self, admin_client, portal_contact, portal_client_access
    ):
        resp = admin_client.post(
            self.URL,
            {"contact": str(portal_contact.id)},
            format="json",
        )
        assert resp.status_code == 400

    def test_non_admin_cannot_invite(self, authenticated_client):
        contact = ContactFactory()
        resp = authenticated_client.post(
            self.URL,
            {"contact": str(contact.id)},
            format="json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestStaffPortalAccessUpdate:
    """Tests for PATCH /api/v1/settings/portal/accounts/{id}/."""

    def test_admin_can_deactivate(self, admin_client, portal_client_access):
        url = f"/api/v1/settings/portal/accounts/{portal_client_access.id}/"
        resp = admin_client.patch(url, {"is_active": False}, format="json")
        assert resp.status_code == 200

        portal_client_access.refresh_from_db()
        assert portal_client_access.is_active is False

    def test_admin_can_activate(self, admin_client, portal_client_access):
        portal_client_access.is_active = False
        portal_client_access.save()

        url = f"/api/v1/settings/portal/accounts/{portal_client_access.id}/"
        resp = admin_client.patch(url, {"is_active": True}, format="json")
        assert resp.status_code == 200

        portal_client_access.refresh_from_db()
        assert portal_client_access.is_active is True


@pytest.mark.django_db
class TestStaffPortalAccessDelete:
    """Tests for DELETE /api/v1/settings/portal/accounts/{id}/."""

    def test_admin_can_delete(self, admin_client, portal_client_access):
        access_id = portal_client_access.id
        url = f"/api/v1/settings/portal/accounts/{access_id}/"
        resp = admin_client.delete(url)
        assert resp.status_code == 204

        assert not ClientPortalAccess.objects.filter(pk=access_id).exists()

    def test_non_admin_cannot_delete(self, authenticated_client, portal_client_access):
        url = f"/api/v1/settings/portal/accounts/{portal_client_access.id}/"
        resp = authenticated_client.delete(url)
        assert resp.status_code == 403
