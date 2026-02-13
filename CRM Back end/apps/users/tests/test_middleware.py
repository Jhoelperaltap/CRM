import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import UserSession
from tests.factories import (
    AuthenticationPolicyFactory,
    LoginIPWhitelistFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestSessionTimeoutMiddleware:
    def test_active_session_passes(self, admin_role):
        """A session with recent activity should not be timed out."""
        AuthenticationPolicyFactory(idle_session_timeout_minutes=240)
        user = UserFactory(role=admin_role)
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        jti = str(access["jti"])
        UserSession.objects.create(
            user=user, jti=jti, ip_address="127.0.0.1", is_active=True,
        )

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_200_OK

    def test_idle_session_returns_401(self, admin_role):
        """A session idle beyond the timeout should return 401."""
        AuthenticationPolicyFactory(idle_session_timeout_minutes=1)
        user = UserFactory(role=admin_role)
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        jti = str(access["jti"])
        session = UserSession.objects.create(
            user=user, jti=jti, ip_address="127.0.0.1", is_active=True,
        )
        # Backdate last_activity beyond timeout
        UserSession.objects.filter(pk=session.pk).update(
            last_activity=timezone.now() - timezone.timedelta(minutes=10)
        )

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestIPWhitelistMiddleware:
    def test_no_entries_allows_all(self, admin_client):
        """When no whitelist entries exist, all IPs are allowed."""
        resp = admin_client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_200_OK

    def test_matching_ip_allowed(self, admin_role, admin_user):
        """When whitelist entries exist and IP matches, allow through."""
        LoginIPWhitelistFactory(
            ip_address="127.0.0.1", role=admin_role, is_active=True,
        )
        client = APIClient()
        refresh = RefreshToken.for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        resp = client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_200_OK

    def test_non_matching_ip_blocked(self, admin_role, admin_user):
        """When whitelist entries exist and IP does not match, block."""
        LoginIPWhitelistFactory(
            ip_address="10.0.0.99", role=admin_role, is_active=True,
        )
        client = APIClient()
        refresh = RefreshToken.for_user(admin_user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        resp = client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestConcurrentSessionMiddleware:
    def test_within_limit_passes(self, admin_role):
        """Active sessions within the limit should work normally."""
        AuthenticationPolicyFactory(max_concurrent_sessions=4)
        user = UserFactory(role=admin_role)
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        jti = str(access["jti"])
        UserSession.objects.create(
            user=user, jti=jti, ip_address="127.0.0.1", is_active=True,
        )

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_200_OK

    def test_deactivated_session_returns_401(self, admin_role):
        """A session that has been deactivated should return 401."""
        user = UserFactory(role=admin_role)
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        jti = str(access["jti"])
        UserSession.objects.create(
            user=user, jti=jti, ip_address="127.0.0.1", is_active=False,
        )

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get("/api/v1/users/me/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
