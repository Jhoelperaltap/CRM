import pytest
from rest_framework import status

from tests.factories import AuthenticationPolicyFactory, SettingsLogFactory

BASE = "/api/v1/settings/settings-log/"


@pytest.mark.django_db
class TestSettingsLogAccess:
    def test_admin_can_list(self, admin_client):
        SettingsLogFactory.create_batch(3)
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSettingsLogCreation:
    def test_created_on_policy_change(self, admin_client):
        from apps.audit.models import SettingsLog

        AuthenticationPolicyFactory()
        admin_client.patch(
            "/api/v1/settings/auth-policy/",
            {"max_concurrent_sessions": 10},
            format="json",
        )
        assert SettingsLog.objects.filter(setting_area="authentication_policy").exists()
