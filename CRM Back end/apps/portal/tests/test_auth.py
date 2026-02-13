import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.portal.auth import create_portal_tokens, decode_portal_token
from tests.factories import ClientPortalAccessFactory, ContactFactory


@pytest.mark.django_db
class TestPortalLogin:
    """Tests for POST /api/v1/portal/auth/login/."""

    URL = "/api/v1/portal/auth/login/"

    def test_valid_credentials(self):
        contact = ContactFactory(email="client@test.com")
        ClientPortalAccessFactory(
            contact=contact,
            email="client@test.com",
            password_hash=make_password("PortalPass123!"),
        )
        client = APIClient()
        resp = client.post(
            self.URL,
            {"email": "client@test.com", "password": "PortalPass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert resp.data["contact"]["email"] == "client@test.com"

    def test_invalid_password(self):
        contact = ContactFactory(email="client2@test.com")
        ClientPortalAccessFactory(
            contact=contact,
            email="client2@test.com",
            password_hash=make_password("PortalPass123!"),
        )
        client = APIClient()
        resp = client.post(
            self.URL,
            {"email": "client2@test.com", "password": "wrong"},
            format="json",
        )
        assert resp.status_code == 401

    def test_nonexistent_email(self):
        client = APIClient()
        resp = client.post(
            self.URL,
            {"email": "nobody@test.com", "password": "anything"},
            format="json",
        )
        assert resp.status_code == 401

    def test_inactive_account(self):
        contact = ContactFactory(email="inactive@test.com")
        ClientPortalAccessFactory(
            contact=contact,
            email="inactive@test.com",
            password_hash=make_password("PortalPass123!"),
            is_active=False,
        )
        client = APIClient()
        resp = client.post(
            self.URL,
            {"email": "inactive@test.com", "password": "PortalPass123!"},
            format="json",
        )
        assert resp.status_code == 401


@pytest.mark.django_db
class TestPortalTokenClaims:
    """Tests for portal JWT claims."""

    def test_token_has_portal_claim(self):
        contact = ContactFactory()
        access = ClientPortalAccessFactory(contact=contact)
        tokens = create_portal_tokens(access)
        payload = decode_portal_token(tokens["access"])
        assert payload["portal"] is True
        assert payload["contact_id"] == str(contact.id)

    def test_token_type_access(self):
        contact = ContactFactory()
        access = ClientPortalAccessFactory(contact=contact)
        tokens = create_portal_tokens(access)
        payload = decode_portal_token(tokens["access"])
        assert payload["token_type"] == "access"


@pytest.mark.django_db
class TestPortalMe:
    """Tests for GET /api/v1/portal/auth/me/."""

    URL = "/api/v1/portal/auth/me/"

    def test_returns_profile(self, portal_authenticated_client, portal_contact):
        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["contact"]["email"] == portal_contact.email

    def test_unauthenticated(self):
        client = APIClient()
        resp = client.get(self.URL)
        assert resp.status_code in (401, 403)


@pytest.mark.django_db
class TestPortalPasswordReset:
    """Tests for password reset flow."""

    def test_request_reset(self, portal_client_access):
        client = APIClient()
        resp = client.post(
            "/api/v1/portal/auth/password-reset/",
            {"email": portal_client_access.email},
            format="json",
        )
        assert resp.status_code == 200

    def test_request_reset_unknown_email(self):
        client = APIClient()
        resp = client.post(
            "/api/v1/portal/auth/password-reset/",
            {"email": "unknown@test.com"},
            format="json",
        )
        # Should still return 200 to not reveal email existence
        assert resp.status_code == 200
