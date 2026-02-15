import pytest
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import PasswordHistory
from tests.factories import AuthenticationPolicyFactory, UserFactory

# Passwords that meet the complexity requirements:
# - At least 12 characters
# - Uppercase, lowercase, digit, special character
OLD_PASSWORD = "OldSecure#Pass1"
NEW_PASSWORD = "NewSecure#Pass2"
REUSE_PASSWORD_1 = "First#Secure1pw"
REUSE_PASSWORD_2 = "Second#Secure2pw"


@pytest.mark.django_db
class TestPasswordHistory:
    def test_password_saved_on_change(self, admin_role):
        """Changing password should create a PasswordHistory entry."""
        user = UserFactory(role=admin_role, password=OLD_PASSWORD)
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        resp = client.post(
            "/api/v1/auth/change-password/",
            {
                "old_password": OLD_PASSWORD,
                "new_password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert PasswordHistory.objects.filter(user=user).count() == 1

    def test_reuse_within_count_rejected(self, admin_role):
        """Reusing a password within the history count should be rejected
        (when PasswordHistoryValidator is active)."""
        AuthenticationPolicyFactory(password_history_count=3)
        user = UserFactory(role=admin_role, password=REUSE_PASSWORD_1)

        # Simulate stored history
        PasswordHistory.objects.create(
            user=user, password_hash=make_password(REUSE_PASSWORD_1)
        )

        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Change to a new password first
        client.post(
            "/api/v1/auth/change-password/",
            {
                "old_password": REUSE_PASSWORD_1,
                "new_password": REUSE_PASSWORD_2,
                "confirm_password": REUSE_PASSWORD_2,
            },
            format="json",
        )
        user.refresh_from_db()

        # Now try to reuse the first password — validator should reject
        refresh2 = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh2.access_token}")
        resp = client.post(
            "/api/v1/auth/change-password/",
            {
                "old_password": REUSE_PASSWORD_2,
                "new_password": REUSE_PASSWORD_1,
                "confirm_password": REUSE_PASSWORD_1,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
