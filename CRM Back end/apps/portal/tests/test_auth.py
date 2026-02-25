import hashlib
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import make_password
from django.utils import timezone
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

    REQUEST_URL = "/api/v1/portal/auth/password-reset/"
    CONFIRM_URL = "/api/v1/portal/auth/password-reset-confirm/"

    def test_request_reset(self, portal_client_access):
        client = APIClient()
        with patch(
            "apps.portal.tasks.send_portal_password_reset_email.delay"
        ) as mock:
            resp = client.post(
                self.REQUEST_URL,
                {"email": portal_client_access.email},
                format="json",
            )
        assert resp.status_code == 200
        # Verify email task was called
        mock.assert_called_once()
        call_kwargs = mock.call_args.kwargs
        assert call_kwargs["email"] == portal_client_access.email
        assert "reset_token" in call_kwargs

    def test_request_reset_unknown_email(self):
        client = APIClient()
        resp = client.post(
            self.REQUEST_URL,
            {"email": "unknown@test.com"},
            format="json",
        )
        # Should still return 200 to not reveal email existence
        assert resp.status_code == 200

    def test_request_reset_stores_hashed_token(self, portal_client_access):
        """SECURITY: Reset token is hashed before storage."""
        client = APIClient()
        with patch(
            "apps.portal.tasks.send_portal_password_reset_email.delay"
        ) as mock:
            resp = client.post(
                self.REQUEST_URL,
                {"email": portal_client_access.email},
                format="json",
            )
        assert resp.status_code == 200

        # Get the plain token that was sent in the email
        plain_token = mock.call_args.kwargs["reset_token"]

        # Verify the stored token is hashed
        portal_client_access.refresh_from_db()
        expected_hash = hashlib.sha256(plain_token.encode()).hexdigest()
        assert portal_client_access.reset_token == expected_hash
        assert portal_client_access.reset_token != plain_token

    def test_request_reset_sets_expiry(self, portal_client_access):
        client = APIClient()
        with patch("apps.portal.tasks.send_portal_password_reset_email.delay"):
            client.post(
                self.REQUEST_URL,
                {"email": portal_client_access.email},
                format="json",
            )

        portal_client_access.refresh_from_db()
        assert portal_client_access.reset_token_expires_at is not None
        # Token should expire in ~24 hours
        expected_expiry = timezone.now() + timedelta(hours=24)
        time_diff = abs(
            (
                portal_client_access.reset_token_expires_at - expected_expiry
            ).total_seconds()
        )
        assert time_diff < 60  # Within 1 minute

    def test_confirm_reset_valid_token(self, portal_client_access):
        """Test password reset with valid token."""
        client = APIClient()

        # Generate a valid token
        plain_token = "test-token-123"
        token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
        portal_client_access.reset_token = token_hash
        portal_client_access.reset_token_expires_at = timezone.now() + timedelta(
            hours=1
        )
        portal_client_access.save()

        resp = client.post(
            self.CONFIRM_URL,
            {"token": plain_token, "new_password": "NewPassword123!"},
            format="json",
        )

        assert resp.status_code == 200
        assert "reset" in resp.data["detail"].lower()

        # Verify token was cleared
        portal_client_access.refresh_from_db()
        assert portal_client_access.reset_token == ""
        assert portal_client_access.reset_token_expires_at is None

    def test_confirm_reset_invalid_token(self, portal_client_access):
        """Test password reset with invalid token."""
        client = APIClient()

        # Set up a valid token
        portal_client_access.reset_token = hashlib.sha256(b"valid").hexdigest()
        portal_client_access.reset_token_expires_at = timezone.now() + timedelta(
            hours=1
        )
        portal_client_access.save()

        resp = client.post(
            self.CONFIRM_URL,
            {"token": "invalid-token", "new_password": "NewPassword123!"},
            format="json",
        )

        assert resp.status_code == 400
        assert (
            "invalid" in resp.data["detail"].lower()
            or "expired" in resp.data["detail"].lower()
        )

    def test_confirm_reset_expired_token(self, portal_client_access):
        """Test password reset with expired token."""
        client = APIClient()

        plain_token = "expired-token"
        token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
        portal_client_access.reset_token = token_hash
        portal_client_access.reset_token_expires_at = timezone.now() - timedelta(
            hours=1
        )
        portal_client_access.save()

        resp = client.post(
            self.CONFIRM_URL,
            {"token": plain_token, "new_password": "NewPassword123!"},
            format="json",
        )

        assert resp.status_code == 400
        assert (
            "expired" in resp.data["detail"].lower()
            or "invalid" in resp.data["detail"].lower()
        )

    def test_confirm_reset_inactive_account(self, portal_client_access):
        """Test password reset fails for inactive accounts."""
        client = APIClient()

        plain_token = "test-token"
        token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
        portal_client_access.reset_token = token_hash
        portal_client_access.reset_token_expires_at = timezone.now() + timedelta(
            hours=1
        )
        portal_client_access.is_active = False
        portal_client_access.save()

        resp = client.post(
            self.CONFIRM_URL,
            {"token": plain_token, "new_password": "NewPassword123!"},
            format="json",
        )

        assert resp.status_code == 400

    def test_confirm_reset_can_login_with_new_password(self, portal_client_access):
        """Test that user can login with new password after reset."""
        api_client = APIClient()

        # Reset the password
        plain_token = "test-token"
        token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
        portal_client_access.reset_token = token_hash
        portal_client_access.reset_token_expires_at = timezone.now() + timedelta(
            hours=1
        )
        portal_client_access.save()

        new_password = "NewSecurePassword123!"
        resp = api_client.post(
            self.CONFIRM_URL,
            {"token": plain_token, "new_password": new_password},
            format="json",
        )
        assert resp.status_code == 200

        # Try to login with new password
        resp = api_client.post(
            "/api/v1/portal/auth/login/",
            {"email": portal_client_access.email, "password": new_password},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.data

    def test_request_reset_case_insensitive_email(self, portal_client_access):
        """Test that password reset request is case-insensitive."""
        client = APIClient()
        uppercase_email = portal_client_access.email.upper()

        with patch(
            "apps.portal.tasks.send_portal_password_reset_email.delay"
        ) as mock:
            resp = client.post(
                self.REQUEST_URL,
                {"email": uppercase_email},
                format="json",
            )

        assert resp.status_code == 200
        mock.assert_called_once()


@pytest.mark.django_db
class TestPortalPasswordResetEmailTask:
    """Tests for the password reset email Celery task."""

    def test_task_sends_email(self):
        """Test that the task sends an email."""
        from apps.portal.tasks import send_portal_password_reset_email

        with patch("apps.portal.tasks.send_mail") as mock_send:
            result = send_portal_password_reset_email(
                email="test@example.com",
                reset_token="test-token-123",
                portal_url="https://portal.example.com",
            )

        assert result["status"] == "sent"
        assert result["email"] == "test@example.com"
        mock_send.assert_called_once()

        # Verify email content
        call_args = mock_send.call_args
        assert "Password Reset" in call_args.kwargs["subject"]
        assert "test-token-123" in call_args.kwargs["message"]
        assert "https://portal.example.com" in call_args.kwargs["message"]
        assert "test@example.com" in call_args.kwargs["recipient_list"]

    def test_task_uses_default_portal_url(self):
        """Test that task uses default URL when not provided."""
        from apps.portal.tasks import send_portal_password_reset_email

        with patch("apps.portal.tasks.send_mail") as mock_send:
            send_portal_password_reset_email(
                email="test@example.com",
                reset_token="token123",
            )

        call_args = mock_send.call_args
        # Should contain some URL
        assert "http" in call_args.kwargs["message"]
        assert "token123" in call_args.kwargs["message"]

    def test_task_retries_on_failure(self):
        """Test that task retries on email failure."""
        from apps.portal.tasks import send_portal_password_reset_email

        with patch("apps.portal.tasks.send_mail") as mock_send:
            mock_send.side_effect = Exception("SMTP error")

            with pytest.raises(Exception):
                send_portal_password_reset_email(
                    email="test@example.com",
                    reset_token="token",
                )
