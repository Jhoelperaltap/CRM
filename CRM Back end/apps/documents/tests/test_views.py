import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.factories import DocumentFactory


BASE = "/api/v1/documents/"

# Valid PDF magic bytes (minimal PDF structure)
VALID_PDF_CONTENT = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


@pytest.mark.django_db
class TestDocumentList:
    def test_list(self, authenticated_client):
        DocumentFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3


@pytest.mark.django_db
class TestDocumentUpload:
    def test_upload(self, authenticated_client):
        test_file = SimpleUploadedFile(
            "test.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )
        resp = authenticated_client.post(
            BASE,
            {"title": "Tax Return 2025", "doc_type": "tax_return", "file": test_file},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Tax Return 2025"
        assert resp.data["file_size"] == len(VALID_PDF_CONTENT)
        assert resp.data["mime_type"] == "application/pdf"


@pytest.mark.django_db
class TestDocumentRetrieve:
    def test_retrieve(self, authenticated_client):
        doc = DocumentFactory()
        resp = authenticated_client.get(f"{BASE}{doc.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(doc.id)


@pytest.mark.django_db
class TestDocumentUpdate:
    def test_patch_metadata(self, authenticated_client):
        doc = DocumentFactory()
        resp = authenticated_client.patch(
            f"{BASE}{doc.id}/", {"title": "Renamed Doc"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Renamed Doc"


@pytest.mark.django_db
class TestDocumentDelete:
    def test_admin_can_delete(self, admin_client):
        doc = DocumentFactory()
        resp = admin_client.delete(f"{BASE}{doc.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_cannot_delete(self, authenticated_client):
        doc = DocumentFactory()
        resp = authenticated_client.delete(f"{BASE}{doc.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDocumentDownload:
    def test_download(self, authenticated_client):
        doc = DocumentFactory()
        resp = authenticated_client.get(f"{BASE}{doc.id}/download/")
        assert resp.status_code == status.HTTP_200_OK
        assert "Content-Disposition" in resp
