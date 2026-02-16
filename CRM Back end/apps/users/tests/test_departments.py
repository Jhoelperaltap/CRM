"""
Tests for Department model and API endpoints.
"""
import pytest
from rest_framework import status

from tests.factories import DepartmentFactory, UserFactory


BASE = "/api/v1/departments/"


@pytest.mark.django_db
class TestDepartmentModel:
    """Tests for the Department model."""

    def test_create_department(self):
        """Test creating a department."""
        dept = DepartmentFactory(name="Accounting", code="ACCT")
        assert dept.name == "Accounting"
        assert dept.code == "ACCT"
        assert dept.is_active is True

    def test_department_str(self):
        """Test department string representation."""
        dept = DepartmentFactory(name="Payroll")
        assert str(dept) == "Payroll"

    def test_department_ordering(self):
        """Test departments are ordered by order field."""
        from apps.users.models import Department

        DepartmentFactory(name="Third", order=3)
        DepartmentFactory(name="First", order=1)
        DepartmentFactory(name="Second", order=2)

        depts = list(Department.objects.all())
        assert depts[0].name == "First"
        assert depts[1].name == "Second"
        assert depts[2].name == "Third"


@pytest.mark.django_db
class TestDepartmentList:
    """Tests for listing departments."""

    def test_list_departments(self, authenticated_client):
        """Test listing all departments."""
        DepartmentFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 3

    def test_list_includes_inactive(self, authenticated_client):
        """Test that both active and inactive departments are listed."""
        active = DepartmentFactory(is_active=True)
        inactive = DepartmentFactory(is_active=False)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        # Both should be in the list
        dept_ids = [d["id"] for d in resp.data]
        assert str(active.id) in dept_ids
        assert str(inactive.id) in dept_ids


@pytest.mark.django_db
class TestDepartmentCreate:
    """Tests for creating departments."""

    def test_admin_can_create(self, admin_client):
        """Test admin can create a department."""
        resp = admin_client.post(
            BASE,
            {
                "name": "New Department",
                "code": "NEW",
                "color": "#FF0000",
                "icon": "Building",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Department"
        assert resp.data["code"] == "NEW"

    def test_non_admin_cannot_create(self, authenticated_client):
        """Test non-admin cannot create a department."""
        resp = authenticated_client.post(
            BASE,
            {"name": "Test", "code": "TST"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unique_code_required(self, admin_client):
        """Test that department code must be unique."""
        DepartmentFactory(code="UNIQUE")
        resp = admin_client.post(
            BASE,
            {"name": "Another", "code": "UNIQUE"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDepartmentRetrieve:
    """Tests for retrieving a single department."""

    def test_retrieve(self, authenticated_client):
        """Test retrieving a department."""
        dept = DepartmentFactory()
        resp = authenticated_client.get(f"{BASE}{dept.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(dept.id)
        assert resp.data["name"] == dept.name


@pytest.mark.django_db
class TestDepartmentUpdate:
    """Tests for updating departments."""

    def test_admin_can_update(self, admin_client):
        """Test admin can update a department."""
        dept = DepartmentFactory(name="Old Name")
        resp = admin_client.patch(
            f"{BASE}{dept.id}/",
            {"name": "New Name"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "New Name"

    def test_non_admin_cannot_update(self, authenticated_client):
        """Test non-admin cannot update a department."""
        dept = DepartmentFactory()
        resp = authenticated_client.patch(
            f"{BASE}{dept.id}/",
            {"name": "Changed"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDepartmentDelete:
    """Tests for deleting departments."""

    def test_admin_can_delete(self, admin_client):
        """Test admin can delete a department."""
        dept = DepartmentFactory()
        resp = admin_client.delete(f"{BASE}{dept.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_non_admin_cannot_delete(self, authenticated_client):
        """Test non-admin cannot delete a department."""
        dept = DepartmentFactory()
        resp = authenticated_client.delete(f"{BASE}{dept.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestUserDepartmentAssignment:
    """Tests for assigning users to departments."""

    def test_user_can_be_assigned_to_department(self):
        """Test that a user can be assigned to a department."""
        dept = DepartmentFactory()
        user = UserFactory(department=dept)
        assert user.department == dept
        assert user.department.name == dept.name

    def test_user_without_department(self):
        """Test that a user can exist without a department."""
        user = UserFactory(department=None)
        assert user.department is None

    def test_department_user_count(self, admin_client):
        """Test that department user count is returned."""
        dept = DepartmentFactory()
        UserFactory.create_batch(3, department=dept)
        resp = admin_client.get(f"{BASE}{dept.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["user_count"] == 3
