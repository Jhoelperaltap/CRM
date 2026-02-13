import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.factories import ContactFactory


BASE = "/api/v1/contacts/"


@pytest.mark.django_db
class TestContactList:
    def test_list(self, authenticated_client):
        ContactFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert "results" in resp.data
        assert resp.data["count"] >= 3


@pytest.mark.django_db
class TestContactCreate:
    def test_create(self, authenticated_client):
        resp = authenticated_client.post(
            BASE,
            {"first_name": "Jane", "last_name": "Doe", "email": "jane@example.com"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["first_name"] == "Jane"

    def test_create_missing_required(self, authenticated_client):
        resp = authenticated_client.post(BASE, {"first_name": "Jane"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestContactRetrieve:
    def test_retrieve(self, authenticated_client):
        contact = ContactFactory()
        resp = authenticated_client.get(f"{BASE}{contact.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(contact.id)


@pytest.mark.django_db
class TestContactUpdate:
    def test_patch(self, authenticated_client):
        contact = ContactFactory()
        resp = authenticated_client.patch(
            f"{BASE}{contact.id}/", {"first_name": "Updated"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["first_name"] == "Updated"


@pytest.mark.django_db
class TestContactDelete:
    def test_admin_can_delete(self, admin_client):
        contact = ContactFactory()
        resp = admin_client.delete(f"{BASE}{contact.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_cannot_delete(self, authenticated_client):
        contact = ContactFactory()
        resp = authenticated_client.delete(f"{BASE}{contact.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestContactStar:
    def test_star_toggle(self, authenticated_client):
        contact = ContactFactory()
        # Star
        resp = authenticated_client.post(f"{BASE}{contact.id}/star/")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["starred"] is True
        # Unstar
        resp = authenticated_client.post(f"{BASE}{contact.id}/star/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["starred"] is False

    def test_starred_list(self, authenticated_client):
        c1 = ContactFactory()
        c2 = ContactFactory()
        authenticated_client.post(f"{BASE}{c1.id}/star/")
        resp = authenticated_client.get(f"{BASE}starred/")
        assert resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in resp.data["results"]]
        assert str(c1.id) in ids
        assert str(c2.id) not in ids


@pytest.mark.django_db
class TestContactCSVImport:
    def test_import_csv(self, authenticated_client):
        csv_content = "first_name,last_name,email,phone\nJohn,Doe,john@example.com,555-0001\nJane,Smith,jane@example.com,555-0002"
        csv_file = SimpleUploadedFile(
            "contacts.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        resp = authenticated_client.post(
            f"{BASE}import_csv/", {"file": csv_file}, format="multipart"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] == 2

    def test_import_csv_dedup_email(self, authenticated_client):
        ContactFactory(email="dup@example.com", first_name="Existing", last_name="User")
        csv_content = "first_name,last_name,email\nDup,User,dup@example.com"
        csv_file = SimpleUploadedFile(
            "contacts.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        resp = authenticated_client.post(
            f"{BASE}import_csv/", {"file": csv_file}, format="multipart"
        )
        assert resp.data["created"] == 0
        assert len(resp.data["skipped"]) == 1
        assert "Duplicate email" in resp.data["skipped"][0]["reason"]

    def test_import_no_file(self, authenticated_client):
        resp = authenticated_client.post(f"{BASE}import_csv/", {}, format="multipart")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestContactCSVExport:
    def test_export_csv(self, authenticated_client):
        ContactFactory.create_batch(2)
        resp = authenticated_client.get(f"{BASE}export_csv/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp["Content-Type"] == "text/csv"
        assert "contacts_export.csv" in resp["Content-Disposition"]
