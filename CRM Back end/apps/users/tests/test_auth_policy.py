import pytest
from rest_framework import status

from apps.users.models import AuthenticationPolicy

BASE = "/api/v1/settings/auth-policy/"


@pytest.mark.django_db
class TestAuthenticationPolicy:
    def test_singleton_behavior(self, db):
        p1 = AuthenticationPolicy.load()
        p2 = AuthenticationPolicy.load()
        assert p1.pk == p2.pk

    def test_get_policy(self, admin_client, auth_policy):
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert "password_reset_frequency_days" in resp.data
        assert "max_concurrent_sessions" in resp.data

    def test_update_policy(self, admin_client, auth_policy):
        resp = admin_client.patch(
            BASE,
            {"max_concurrent_sessions": 8},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["max_concurrent_sessions"] == 8

    def test_preparer_denied(self, authenticated_client, auth_policy):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_settings_log_created_on_change(self, admin_client, auth_policy):
        from apps.audit.models import SettingsLog

        admin_client.patch(
            BASE,
            {"idle_session_timeout_minutes": 120},
            format="json",
        )
        logs = SettingsLog.objects.filter(
            setting_area="authentication_policy",
            setting_key="idle_session_timeout_minutes",
        )
        assert logs.exists()
