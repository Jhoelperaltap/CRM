import pytest
from rest_framework import status

from tests.factories import RoleFactory, UserFactory

BASE = "/api/v1/roles/"


@pytest.mark.django_db
class TestRoleTree:
    def test_tree_endpoint(self, authenticated_client, admin_role, manager_role):
        resp = authenticated_client.get(f"{BASE}tree/")
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)
        # Admin should be a root node
        root_slugs = [r["slug"] for r in resp.data]
        assert "admin" in root_slugs

    def test_tree_has_children(self, authenticated_client, admin_role, manager_role):
        resp = authenticated_client.get(f"{BASE}tree/")
        admin_node = next(r for r in resp.data if r["slug"] == "admin")
        child_slugs = [c["slug"] for c in admin_node["children"]]
        assert "manager" in child_slugs


@pytest.mark.django_db
class TestRoleHierarchyMethods:
    def test_get_descendants(self, admin_role, manager_role, preparer_role):
        descendants = admin_role.get_descendants()
        descendant_slugs = [r.slug for r in descendants]
        assert "manager" in descendant_slugs
        assert "preparer" in descendant_slugs

    def test_get_ancestors(self, admin_role, manager_role, preparer_role):
        ancestors = preparer_role.get_ancestors()
        ancestor_slugs = [r.slug for r in ancestors]
        assert "manager" in ancestor_slugs
        assert "admin" in ancestor_slugs

    def test_get_subordinate_user_ids(self, admin_role, manager_role):
        user1 = UserFactory(role=admin_role)
        user2 = UserFactory(role=manager_role)
        ids = admin_role.get_subordinate_user_ids()
        assert user1.pk in ids
        assert user2.pk in ids


@pytest.mark.django_db
class TestRoleCRUD:
    def test_admin_can_create_role(self, admin_client):
        resp = admin_client.post(
            BASE,
            {"name": "Intern", "slug": "intern", "department": "Tax Preparation"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["slug"] == "intern"

    def test_preparer_cannot_create_role(self, authenticated_client):
        resp = authenticated_client.post(
            BASE,
            {"name": "Intern", "slug": "intern"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_circular_reference_prevented(self, admin_client, admin_role, manager_role):
        # Try to set admin's parent to manager (which is admin's child)
        resp = admin_client.patch(
            f"{BASE}{admin_role.id}/",
            {"parent": str(manager_role.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_role_without_users(self, admin_client):
        role = RoleFactory(name="Temp", slug="temp-role")
        resp = admin_client.delete(f"{BASE}{role.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
