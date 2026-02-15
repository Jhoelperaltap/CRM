import pytest
from rest_framework import status

from tests.factories import UserGroupFactory

BASE = "/api/v1/settings/groups/"


@pytest.mark.django_db
class TestGroupCRUD:
    def test_create_group(self, admin_client):
        resp = admin_client.post(
            BASE,
            {"name": "Auditors", "description": "Internal auditing team"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "Auditors"

    def test_list_groups(self, admin_client):
        UserGroupFactory.create_batch(3)
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_retrieve_group(self, admin_client, test_group):
        resp = admin_client.get(f"{BASE}{test_group.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Tax Team"
        assert "members" in resp.data

    def test_update_group(self, admin_client, test_group):
        resp = admin_client.patch(
            f"{BASE}{test_group.id}/",
            {"description": "Updated description"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["description"] == "Updated description"

    def test_delete_group(self, admin_client, test_group):
        resp = admin_client.delete(f"{BASE}{test_group.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestGroupMembers:
    def test_add_member(self, admin_client, test_group, preparer_user):
        resp = admin_client.post(
            f"{BASE}{test_group.id}/members/",
            {"user_id": str(preparer_user.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_add_duplicate_member(self, admin_client, test_group, preparer_user):
        admin_client.post(
            f"{BASE}{test_group.id}/members/",
            {"user_id": str(preparer_user.id)},
            format="json",
        )
        resp = admin_client.post(
            f"{BASE}{test_group.id}/members/",
            {"user_id": str(preparer_user.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_member(self, admin_client, test_group, preparer_user):
        admin_client.post(
            f"{BASE}{test_group.id}/members/",
            {"user_id": str(preparer_user.id)},
            format="json",
        )
        resp = admin_client.delete(f"{BASE}{test_group.id}/members/{preparer_user.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
