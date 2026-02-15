import pyotp
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.totp import (
    check_recovery_code,
    generate_recovery_codes,
    generate_totp_secret,
    hash_recovery_code,
    verify_totp,
)
from tests.factories import UserFactory

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user_with_2fa(admin_role, db):
    """User with 2FA fully enabled."""
    user = UserFactory(role=admin_role)
    secret = generate_totp_secret()
    raw_codes = generate_recovery_codes(count=4)
    hashed_codes = [hash_recovery_code(c) for c in raw_codes]
    user.totp_secret = secret
    user.is_2fa_enabled = True
    user.recovery_codes = hashed_codes
    user.save()
    user._raw_recovery_codes = raw_codes
    return user


@pytest.fixture
def user_2fa_client(user_with_2fa):
    """APIClient authenticated as a 2FA-enabled user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user_with_2fa)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ---------------------------------------------------------------------------
# TOTP utility tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTOTPUtilities:
    def test_generate_secret(self):
        secret = generate_totp_secret()
        assert len(secret) == 32

    def test_verify_valid_code(self):
        secret = generate_totp_secret()
        totp = pyotp.TOTP(secret)
        code = totp.now()
        assert verify_totp(secret, code) is True

    def test_verify_invalid_code(self):
        secret = generate_totp_secret()
        assert verify_totp(secret, "000000") is False

    def test_recovery_codes(self):
        codes = generate_recovery_codes(count=4)
        assert len(codes) == 4
        assert all(len(c) == 8 for c in codes)

    def test_hash_and_check_recovery_code(self, admin_role, db):
        user = UserFactory(role=admin_role)
        raw_codes = generate_recovery_codes(count=2)
        hashed = [hash_recovery_code(c) for c in raw_codes]
        user.recovery_codes = hashed
        user.save()

        # Valid code
        assert check_recovery_code(user, raw_codes[0]) is True
        # Same code should be consumed
        user.refresh_from_db()
        assert len(user.recovery_codes) == 1

        # Invalid code
        assert check_recovery_code(user, "XXXXXXXX") is False


# ---------------------------------------------------------------------------
# 2FA Setup flow
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTwoFactorSetup:
    """Tests for POST /api/v1/auth/2fa/setup/."""

    URL = "/api/v1/auth/2fa/setup/"

    def test_setup_returns_qr_and_secret(self, admin_client, admin_user):
        resp = admin_client.post(self.URL)
        assert resp.status_code == 200
        assert "secret" in resp.data
        assert "qr_code" in resp.data
        assert len(resp.data["secret"]) == 32

        admin_user.refresh_from_db()
        assert admin_user.totp_secret == resp.data["secret"]

    def test_setup_fails_if_already_enabled(self, user_2fa_client):
        resp = user_2fa_client.post(self.URL)
        assert resp.status_code == 400

    def test_unauthenticated_cannot_setup(self, api_client):
        resp = api_client.post(self.URL)
        assert resp.status_code == 401


@pytest.mark.django_db
class TestTwoFactorVerifySetup:
    """Tests for POST /api/v1/auth/2fa/verify-setup/."""

    URL = "/api/v1/auth/2fa/verify-setup/"

    def test_verify_valid_code_enables_2fa(self, admin_client, admin_user):
        # First do setup
        admin_client.post("/api/v1/auth/2fa/setup/")
        admin_user.refresh_from_db()
        secret = admin_user.totp_secret

        totp = pyotp.TOTP(secret)
        code = totp.now()

        resp = admin_client.post(self.URL, {"code": code}, format="json")
        assert resp.status_code == 200
        assert "recovery_codes" in resp.data
        assert len(resp.data["recovery_codes"]) == 8

        admin_user.refresh_from_db()
        assert admin_user.is_2fa_enabled is True

    def test_verify_invalid_code_fails(self, admin_client):
        admin_client.post("/api/v1/auth/2fa/setup/")

        resp = admin_client.post(self.URL, {"code": "000000"}, format="json")
        assert resp.status_code == 400

    def test_verify_without_setup_fails(self, admin_client, admin_user):
        # Ensure no secret stored
        admin_user.totp_secret = ""
        admin_user.save()

        resp = admin_client.post(self.URL, {"code": "123456"}, format="json")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 2FA Disable
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTwoFactorDisable:
    """Tests for POST /api/v1/auth/2fa/disable/."""

    URL = "/api/v1/auth/2fa/disable/"

    def test_disable_with_valid_credentials(self, user_2fa_client, user_with_2fa):
        totp = pyotp.TOTP(user_with_2fa.totp_secret)
        code = totp.now()

        resp = user_2fa_client.post(
            self.URL,
            {"password": "TestPass123!", "code": code},
            format="json",
        )
        assert resp.status_code == 200

        user_with_2fa.refresh_from_db()
        assert user_with_2fa.is_2fa_enabled is False
        assert user_with_2fa.totp_secret == ""

    def test_disable_wrong_password(self, user_2fa_client, user_with_2fa):
        totp = pyotp.TOTP(user_with_2fa.totp_secret)
        code = totp.now()

        resp = user_2fa_client.post(
            self.URL,
            {"password": "WrongPass!", "code": code},
            format="json",
        )
        assert resp.status_code == 400

    def test_disable_wrong_code(self, user_2fa_client):
        resp = user_2fa_client.post(
            self.URL,
            {"password": "TestPass123!", "code": "000000"},
            format="json",
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Login with 2FA
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLoginWith2FA:
    """Tests for the 2FA-aware login flow."""

    LOGIN_URL = "/api/v1/auth/login/"
    VERIFY_URL = "/api/v1/auth/2fa/verify/"
    RECOVERY_URL = "/api/v1/auth/2fa/recovery/"

    def test_login_returns_requires_2fa(self, api_client, user_with_2fa):
        resp = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["requires_2fa"] is True
        assert "temp_token" in resp.data
        assert "access" not in resp.data

    def test_verify_with_valid_code(self, api_client, user_with_2fa):
        # Login to get temp token
        login_resp = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        temp_token = login_resp.data["temp_token"]

        # Verify with TOTP
        totp = pyotp.TOTP(user_with_2fa.totp_secret)
        code = totp.now()

        verify_resp = api_client.post(
            self.VERIFY_URL,
            {"temp_token": temp_token, "code": code},
            format="json",
        )
        assert verify_resp.status_code == 200
        assert "access" in verify_resp.data
        assert "refresh" in verify_resp.data
        assert "user" in verify_resp.data

    def test_verify_with_invalid_code_returns_401(self, api_client, user_with_2fa):
        login_resp = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        temp_token = login_resp.data["temp_token"]

        verify_resp = api_client.post(
            self.VERIFY_URL,
            {"temp_token": temp_token, "code": "000000"},
            format="json",
        )
        assert verify_resp.status_code == 401

    def test_verify_with_invalid_token(self, api_client):
        verify_resp = api_client.post(
            self.VERIFY_URL,
            {"temp_token": "invalid-token", "code": "123456"},
            format="json",
        )
        assert verify_resp.status_code == 401

    def test_recovery_code_works(self, api_client, user_with_2fa):
        login_resp = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        temp_token = login_resp.data["temp_token"]

        recovery_code = user_with_2fa._raw_recovery_codes[0]
        resp = api_client.post(
            self.RECOVERY_URL,
            {"temp_token": temp_token, "recovery_code": recovery_code},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.data

    def test_recovery_code_consumed(self, api_client, user_with_2fa):
        # Use the first recovery code
        login_resp = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        temp_token = login_resp.data["temp_token"]

        recovery_code = user_with_2fa._raw_recovery_codes[0]
        api_client.post(
            self.RECOVERY_URL,
            {"temp_token": temp_token, "recovery_code": recovery_code},
            format="json",
        )

        # Try to use the same code again
        login_resp2 = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        temp_token2 = login_resp2.data["temp_token"]

        resp = api_client.post(
            self.RECOVERY_URL,
            {"temp_token": temp_token2, "recovery_code": recovery_code},
            format="json",
        )
        assert resp.status_code == 401

    def test_invalid_recovery_code(self, api_client, user_with_2fa):
        login_resp = api_client.post(
            self.LOGIN_URL,
            {"email": user_with_2fa.email, "password": "TestPass123!"},
            format="json",
        )
        temp_token = login_resp.data["temp_token"]

        resp = api_client.post(
            self.RECOVERY_URL,
            {"temp_token": temp_token, "recovery_code": "XXXXXXXX"},
            format="json",
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 2FA Status
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTwoFactorStatus:
    """Tests for GET /api/v1/auth/2fa/status/."""

    URL = "/api/v1/auth/2fa/status/"

    def test_status_disabled(self, admin_client, admin_user):
        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["is_enabled"] is False

    def test_status_enabled(self, user_2fa_client):
        resp = user_2fa_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["is_enabled"] is True

    def test_enforce_required_flag(self, admin_client, auth_policy):
        auth_policy.enforce_2fa = True
        auth_policy.save()

        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["enforce_required"] is True


# ---------------------------------------------------------------------------
# Enforce 2FA Policy
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEnforce2FAPolicy:
    """Tests that the enforce_2fa flag surfaces correctly on login."""

    LOGIN_URL = "/api/v1/auth/login/"

    def test_login_flags_2fa_setup_required(self, api_client, admin_user, auth_policy):
        auth_policy.enforce_2fa = True
        auth_policy.save()

        resp = api_client.post(
            self.LOGIN_URL,
            {"email": admin_user.email, "password": "TestPass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data.get("requires_2fa_setup") is True
        # Tokens should still be returned
        assert "access" in resp.data

    def test_login_no_flag_when_not_enforced(self, api_client, admin_user, auth_policy):
        auth_policy.enforce_2fa = False
        auth_policy.save()

        resp = api_client.post(
            self.LOGIN_URL,
            {"email": admin_user.email, "password": "TestPass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert "requires_2fa_setup" not in resp.data
