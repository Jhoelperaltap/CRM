import pytest
from rest_framework import status

from tests.factories import BranchFactory, UserFactory

pytestmark = pytest.mark.django_db

BRANCHES_URL = "/api/v1/branches/"


def branch_detail_url(branch_id):
    return f"{BRANCHES_URL}{branch_id}/"


class TestBranchList:
    def test_admin_can_list_branches(self, admin_client):
        BranchFactory.create_batch(3)
        resp = admin_client.get(BRANCHES_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 3

    def test_non_admin_cannot_list_branches(self, authenticated_client):
        resp = authenticated_client.get(BRANCHES_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_list(self, api_client):
        resp = api_client.get(BRANCHES_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestBranchCreate:
    def test_admin_can_create_branch(self, admin_client):
        payload = {"name": "New York Office", "code": "NYC", "city": "New York", "state": "NY"}
        resp = admin_client.post(BRANCHES_URL, payload)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New York Office"
        assert resp.data["code"] == "NYC"

    def test_duplicate_code_rejected(self, admin_client):
        BranchFactory(code="NYC")
        payload = {"name": "Another Office", "code": "NYC"}
        resp = admin_client.post(BRANCHES_URL, payload)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_admin_cannot_create(self, authenticated_client):
        payload = {"name": "Office", "code": "OFF"}
        resp = authenticated_client.post(BRANCHES_URL, payload)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestBranchDetail:
    def test_admin_can_retrieve_branch(self, admin_client):
        branch = BranchFactory(name="Main", code="MAIN", is_headquarters=True)
        resp = admin_client.get(branch_detail_url(branch.id))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_headquarters"] is True
        assert "user_count" in resp.data

    def test_user_count_reflects_assigned_users(self, admin_client, admin_role):
        branch = BranchFactory()
        UserFactory.create_batch(2, role=admin_role, branch=branch)
        resp = admin_client.get(branch_detail_url(branch.id))
        assert resp.data["user_count"] == 2


class TestBranchUpdate:
    def test_admin_can_update_branch(self, admin_client):
        branch = BranchFactory(is_active=True)
        resp = admin_client.patch(branch_detail_url(branch.id), {"is_active": False})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_active"] is False


class TestBranchDelete:
    def test_admin_can_delete_branch(self, admin_client):
        branch = BranchFactory()
        resp = admin_client.delete(branch_detail_url(branch.id))
        assert resp.status_code == status.HTTP_204_NO_CONTENT
