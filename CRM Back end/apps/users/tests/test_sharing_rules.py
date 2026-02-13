import pytest
from rest_framework import status

from tests.factories import SharingRuleFactory


BASE = "/api/v1/settings/sharing-rules/"


@pytest.mark.django_db
class TestSharingRuleCRUD:
    def test_create(self, admin_client):
        resp = admin_client.post(
            BASE,
            {
                "module": "contacts",
                "default_access": "private",
                "share_type": "role_hierarchy",
                "access_level": "read_only",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["module"] == "contacts"

    def test_list(self, admin_client):
        SharingRuleFactory.create_batch(3)
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_update(self, admin_client):
        rule = SharingRuleFactory()
        resp = admin_client.patch(
            f"{BASE}{rule.id}/",
            {"access_level": "read_write"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["access_level"] == "read_write"

    def test_delete(self, admin_client):
        rule = SharingRuleFactory()
        resp = admin_client.delete(f"{BASE}{rule.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSharingRuleWithRoles:
    def test_create_with_role_hierarchy(self, admin_client, admin_role, manager_role):
        resp = admin_client.post(
            BASE,
            {
                "module": "cases",
                "default_access": "private",
                "share_type": "role_hierarchy",
                "shared_from_role": str(admin_role.id),
                "shared_to_role": str(manager_role.id),
                "access_level": "read_write",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert str(resp.data["shared_from_role"]) == str(admin_role.id)
