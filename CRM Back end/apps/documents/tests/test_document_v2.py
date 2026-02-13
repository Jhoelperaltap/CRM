import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import DocumentAccessLog
from tests.factories import DocumentFactory

# Valid PDF magic bytes (minimal PDF structure)
VALID_PDF_CONTENT = (
    b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
)


@pytest.mark.django_db
class TestDocumentVersioning:
    """Tests for document version chain."""

    URL = "/api/v1/documents/"

    def test_create_new_version(self, admin_client, admin_user):
        parent = DocumentFactory(uploaded_by=admin_user, version=1)
        url = f"{self.URL}{parent.id}/new-version/"

        file = SimpleUploadedFile(
            "v2.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )
        resp = admin_client.post(
            url,
            {"title": "Updated Doc", "file": file, "doc_type": "other"},
            format="multipart",
        )
        assert resp.status_code == 201
        assert resp.data["version"] == 2
        assert str(resp.data["parent_document"]) == str(parent.id)

    def test_list_versions(self, admin_client, admin_user):
        parent = DocumentFactory(uploaded_by=admin_user, version=1)
        DocumentFactory(
            uploaded_by=admin_user,
            version=2,
            parent_document=parent,
            title=parent.title,
        )
        url = f"{self.URL}{parent.id}/versions/"
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert len(resp.data) == 2


@pytest.mark.django_db
class TestDocumentAccessLogging:
    """Tests for document download access logging."""

    URL = "/api/v1/documents/"

    def test_download_creates_access_log(self, admin_client, admin_user):
        doc = DocumentFactory(uploaded_by=admin_user)
        url = f"{self.URL}{doc.id}/download/"
        resp = admin_client.get(url)
        assert resp.status_code == 200

        logs = DocumentAccessLog.objects.filter(document=doc)
        assert logs.count() == 1
        assert logs.first().action == "download"
        assert logs.first().user == admin_user

    def test_access_logs_endpoint(self, admin_client, admin_user):
        doc = DocumentFactory(uploaded_by=admin_user)
        DocumentAccessLog.objects.create(
            document=doc,
            user=admin_user,
            action="download",
            ip_address="127.0.0.1",
        )
        url = f"{self.URL}{doc.id}/access-logs/"
        resp = admin_client.get(url)
        assert resp.status_code == 200
        # Response could be paginated or a list
        data = (
            resp.data.get("results", resp.data)
            if isinstance(resp.data, dict)
            else resp.data
        )
        assert len(data) >= 1


@pytest.mark.django_db
class TestDocumentEncryptionFields:
    """Tests that encryption fields are exposed in the API."""

    URL = "/api/v1/documents/"

    def test_encrypted_flag_in_detail(self, admin_client, admin_user):
        doc = DocumentFactory(
            uploaded_by=admin_user, is_encrypted=True, encryption_key_id="key-001"
        )
        url = f"{self.URL}{doc.id}/"
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["is_encrypted"] is True
        assert resp.data["encryption_key_id"] == "key-001"
