import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.factories import ContactFactory, CorporationFactory, TaxCaseFactory


BASE = "/api/v1/corporations/"


@pytest.mark.django_db
class TestCorporationList:
    def test_list(self, authenticated_client):
        CorporationFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3


@pytest.mark.django_db
class TestCorporationCreate:
    def test_create(self, authenticated_client):
        resp = authenticated_client.post(
            BASE,
            {"name": "Acme Inc", "entity_type": "llc"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "Acme Inc"

    def test_create_missing_name(self, authenticated_client):
        resp = authenticated_client.post(BASE, {"entity_type": "llc"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCorporationRetrieve:
    def test_retrieve(self, authenticated_client):
        corp = CorporationFactory()
        resp = authenticated_client.get(f"{BASE}{corp.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(corp.id)


@pytest.mark.django_db
class TestCorporationUpdate:
    def test_patch(self, authenticated_client):
        corp = CorporationFactory()
        resp = authenticated_client.patch(
            f"{BASE}{corp.id}/", {"name": "Updated Corp"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Updated Corp"


@pytest.mark.django_db
class TestCorporationDelete:
    def test_admin_can_delete(self, admin_client):
        corp = CorporationFactory()
        resp = admin_client.delete(f"{BASE}{corp.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_cannot_delete(self, authenticated_client):
        corp = CorporationFactory()
        resp = authenticated_client.delete(f"{BASE}{corp.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCorporationLinkedContacts:
    def test_linked_contacts(self, authenticated_client):
        corp = CorporationFactory()
        ContactFactory(corporation=corp)
        ContactFactory(corporation=corp)
        resp = authenticated_client.get(f"{BASE}{corp.id}/contacts/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2


@pytest.mark.django_db
class TestCorporationLinkedCases:
    def test_linked_cases(self, authenticated_client):
        corp = CorporationFactory()
        TaxCaseFactory(corporation=corp)
        resp = authenticated_client.get(f"{BASE}{corp.id}/cases/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1


@pytest.mark.django_db
class TestCorporationCSVImport:
    def test_import_csv(self, authenticated_client):
        csv_content = "name,entity_type,ein\nTest Corp,llc,12-3456789\nAnother Corp,s_corp,98-7654321"
        csv_file = SimpleUploadedFile(
            "corps.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        resp = authenticated_client.post(
            f"{BASE}import_csv/", {"file": csv_file}, format="multipart"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] == 2

    def test_import_dedup_ein(self, authenticated_client):
        CorporationFactory(ein="12-3456789")
        csv_content = "name,entity_type,ein\nDup Corp,llc,12-3456789"
        csv_file = SimpleUploadedFile(
            "corps.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        resp = authenticated_client.post(
            f"{BASE}import_csv/", {"file": csv_file}, format="multipart"
        )
        assert resp.data["created"] == 0
        assert len(resp.data["skipped"]) == 1
        assert "Duplicate EIN" in resp.data["skipped"][0]["reason"]

    def test_import_dedup_name(self, authenticated_client):
        CorporationFactory(name="Existing Corp", ein="")
        csv_content = "name,entity_type\nExisting Corp,llc"
        csv_file = SimpleUploadedFile(
            "corps.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        resp = authenticated_client.post(
            f"{BASE}import_csv/", {"file": csv_file}, format="multipart"
        )
        assert resp.data["created"] == 0
        assert len(resp.data["skipped"]) == 1


@pytest.mark.django_db
class TestCorporationCSVExport:
    def test_export(self, authenticated_client):
        CorporationFactory.create_batch(2)
        resp = authenticated_client.get(f"{BASE}export_csv/")
        assert resp.status_code == status.HTTP_200_OK
        assert "corporations_export.csv" in resp["Content-Disposition"]
