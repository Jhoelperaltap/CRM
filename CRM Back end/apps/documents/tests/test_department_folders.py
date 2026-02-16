"""
Tests for DepartmentClientFolder model and API endpoints.
"""
import pytest
from rest_framework import status

from tests.factories import (
    ContactFactory,
    CorporationFactory,
    DepartmentClientFolderFactory,
    DepartmentFactory,
    DocumentFactory,
    UserFactory,
)


BASE = "/api/v1/department-folders/"


@pytest.mark.django_db
class TestDepartmentClientFolderModel:
    """Tests for the DepartmentClientFolder model."""

    def test_create_folder_for_contact(self):
        """Test creating a folder linked to a contact."""
        dept = DepartmentFactory()
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(
            name="Tax Documents",
            department=dept,
            contact=contact,
        )
        assert folder.name == "Tax Documents"
        assert folder.department == dept
        assert folder.contact == contact
        assert folder.corporation is None

    def test_create_folder_for_corporation(self):
        """Test creating a folder linked to a corporation."""
        dept = DepartmentFactory()
        corp = CorporationFactory()
        folder = DepartmentClientFolderFactory(
            name="Corporate Docs",
            department=dept,
            corporation=corp,
            contact=None,  # Must be None when corporation is set
        )
        assert folder.corporation == corp
        assert folder.contact is None

    def test_folder_hierarchy(self):
        """Test creating nested folders."""
        dept = DepartmentFactory()
        contact = ContactFactory()
        parent = DepartmentClientFolderFactory(
            name="Parent",
            department=dept,
            contact=contact,
        )
        child = DepartmentClientFolderFactory(
            name="Child",
            department=dept,
            contact=contact,
            parent=parent,
        )
        assert child.parent == parent
        assert parent.children.first() == child

    def test_folder_str(self):
        """Test folder string representation contains folder name."""
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(name="My Folder", contact=contact)
        assert "My Folder" in str(folder)


@pytest.mark.django_db
class TestDepartmentClientFolderList:
    """Tests for listing department folders."""

    def test_list_folders(self, authenticated_client):
        """Test listing all folders."""
        DepartmentClientFolderFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_filter_by_department(self, authenticated_client):
        """Test filtering folders by department."""
        dept1 = DepartmentFactory()
        dept2 = DepartmentFactory()
        DepartmentClientFolderFactory(department=dept1)
        DepartmentClientFolderFactory(department=dept1)
        DepartmentClientFolderFactory(department=dept2)

        resp = authenticated_client.get(BASE, {"department": str(dept1.id)})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2

    def test_filter_by_contact(self, authenticated_client):
        """Test filtering folders by contact."""
        contact = ContactFactory()
        DepartmentClientFolderFactory(contact=contact)
        DepartmentClientFolderFactory(contact=contact)
        DepartmentClientFolderFactory()  # No contact

        resp = authenticated_client.get(BASE, {"contact": str(contact.id)})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2

    def test_filter_by_corporation(self, authenticated_client):
        """Test filtering folders by corporation."""
        corp = CorporationFactory()
        DepartmentClientFolderFactory(corporation=corp, contact=None)
        DepartmentClientFolderFactory()  # With contact (default)

        resp = authenticated_client.get(BASE, {"corporation": str(corp.id)})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1


@pytest.mark.django_db
class TestDepartmentClientFolderCreate:
    """Tests for creating department folders."""

    def test_create_folder(self, authenticated_client):
        """Test creating a new folder."""
        dept = DepartmentFactory()
        contact = ContactFactory()
        resp = authenticated_client.post(
            BASE,
            {
                "name": "New Folder",
                "department": str(dept.id),
                "contact": str(contact.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Folder"

    def test_create_subfolder(self, authenticated_client):
        """Test creating a subfolder."""
        parent = DepartmentClientFolderFactory()
        resp = authenticated_client.post(
            BASE,
            {
                "name": "Subfolder",
                "department": str(parent.department.id),
                "contact": str(parent.contact.id),  # Same contact as parent
                "parent": str(parent.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert str(resp.data["parent"]) == str(parent.id)


@pytest.mark.django_db
class TestDepartmentClientFolderTree:
    """Tests for folder tree endpoints."""

    def test_tree_requires_client(self, authenticated_client):
        """Test that tree endpoint requires contact or corporation."""
        resp = authenticated_client.get(f"{BASE}tree/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_tree_for_contact(self, authenticated_client):
        """Test getting folder tree for a contact."""
        contact = ContactFactory()
        dept = DepartmentFactory()
        parent = DepartmentClientFolderFactory(
            department=dept,
            contact=contact,
        )
        DepartmentClientFolderFactory(
            department=dept,
            contact=contact,
            parent=parent,
        )

        resp = authenticated_client.get(f"{BASE}tree/", {"contact": str(contact.id)})
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 1

    def test_client_tree_grouped_by_department(self, authenticated_client):
        """Test client-tree returns folders grouped by department."""
        contact = ContactFactory()
        dept1 = DepartmentFactory(name="Accounting")
        dept2 = DepartmentFactory(name="Payroll")
        DepartmentClientFolderFactory(department=dept1, contact=contact)
        DepartmentClientFolderFactory(department=dept2, contact=contact)

        resp = authenticated_client.get(
            f"{BASE}client-tree/", {"contact": str(contact.id)}
        )
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2  # Two departments
        dept_names = [d["name"] for d in resp.data]
        assert "Accounting" in dept_names
        assert "Payroll" in dept_names

    def test_all_departments_tree(self, authenticated_client):
        """Test all-departments-tree returns all folders."""
        dept = DepartmentFactory()
        contact1 = ContactFactory()
        contact2 = ContactFactory()
        DepartmentClientFolderFactory(department=dept, contact=contact1)
        DepartmentClientFolderFactory(department=dept, contact=contact2)

        resp = authenticated_client.get(f"{BASE}all-departments-tree/")
        assert resp.status_code == status.HTTP_200_OK
        # Should have at least one department group
        assert len(resp.data) >= 1
        # Each folder should have client_name
        for dept_group in resp.data:
            for folder in dept_group["folders"]:
                assert "client_name" in folder


@pytest.mark.django_db
class TestDepartmentClientFolderDelete:
    """Tests for deleting department folders."""

    def test_delete_empty_folder(self, admin_client):
        """Test deleting an empty folder."""
        folder = DepartmentClientFolderFactory()
        resp = admin_client.delete(f"{BASE}{folder.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_cannot_delete_default_folder(self, admin_client):
        """Test that default folders cannot be deleted."""
        folder = DepartmentClientFolderFactory(is_default=True)
        resp = admin_client.delete(f"{BASE}{folder.id}/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_delete_folder_with_documents(self, admin_client):
        """Test that folders with documents cannot be deleted."""
        folder = DepartmentClientFolderFactory()
        DocumentFactory(department_folder=folder)
        resp = admin_client.delete(f"{BASE}{folder.id}/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_delete_folder_with_children(self, admin_client):
        """Test that folders with subfolders cannot be deleted."""
        parent = DepartmentClientFolderFactory()
        DepartmentClientFolderFactory(parent=parent, department=parent.department)
        resp = admin_client.delete(f"{BASE}{parent.id}/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDepartmentClientFolderInitialize:
    """Tests for initializing default folders."""

    def test_initialize_folders_for_contact(self, authenticated_client):
        """Test initializing default folders for a contact."""
        DepartmentFactory.create_batch(2)
        contact = ContactFactory()
        resp = authenticated_client.post(
            f"{BASE}initialize/",
            {"contact": str(contact.id)},
            format="json",
        )
        # API returns 200 or 201 depending on implementation
        assert resp.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert "created_count" in resp.data
        assert resp.data["created_count"] > 0

    def test_initialize_folders_for_corporation(self, authenticated_client):
        """Test initializing default folders for a corporation."""
        DepartmentFactory.create_batch(2)
        corp = CorporationFactory()
        resp = authenticated_client.post(
            f"{BASE}initialize/",
            {"corporation": str(corp.id)},
            format="json",
        )
        # API returns 200 or 201 depending on implementation
        assert resp.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

    def test_initialize_requires_client(self, authenticated_client):
        """Test that initialize requires a client."""
        resp = authenticated_client.post(
            f"{BASE}initialize/",
            {},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDepartmentFolderDocumentFiltering:
    """Tests for filtering documents by department folder."""

    def test_filter_documents_by_department_folder(self, authenticated_client):
        """Test filtering documents by department folder."""
        folder = DepartmentClientFolderFactory()
        doc1 = DocumentFactory(department_folder=folder)
        doc2 = DocumentFactory(department_folder=folder)
        DocumentFactory()  # Not in folder

        resp = authenticated_client.get(
            "/api/v1/documents/",
            {"department_folder": str(folder.id)},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        doc_ids = [d["id"] for d in resp.data["results"]]
        assert str(doc1.id) in doc_ids
        assert str(doc2.id) in doc_ids
