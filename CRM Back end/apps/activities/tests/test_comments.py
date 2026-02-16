"""
Tests for Comment model and API endpoints, including file attachments.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.documents.models import Document
from tests.factories import (
    ContactFactory,
    CorporationFactory,
    DepartmentClientFolderFactory,
    DepartmentFactory,
)

# Valid PDF magic bytes (minimal PDF structure)
VALID_PDF_CONTENT = (
    b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
)

BASE = "/api/v1/comments/"


@pytest.mark.django_db
class TestCommentCreate:
    """Tests for creating comments."""

    def test_create_comment_on_contact(self, authenticated_client, preparer_user):
        """Test creating a comment on a contact."""
        contact = ContactFactory()
        resp = authenticated_client.post(
            BASE,
            {
                "content": "This is a test comment",
                "entity_type": "contact",
                "entity_id": str(contact.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["content"] == "This is a test comment"
        # Create serializer may not include author - just verify comment was created
        from apps.activities.models import Comment

        comment = Comment.objects.filter(content="This is a test comment").first()
        assert comment is not None
        assert comment.author == preparer_user

    def test_create_comment_on_corporation(self, authenticated_client):
        """Test creating a comment on a corporation."""
        corp = CorporationFactory()
        resp = authenticated_client.post(
            BASE,
            {
                "content": "Corporation comment",
                "entity_type": "corporation",
                "entity_id": str(corp.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestCommentWithAttachments:
    """Tests for creating comments with file attachments."""

    def test_comment_with_attachment_creates_document(
        self, authenticated_client, preparer_user
    ):
        """Test that creating a comment with attachment creates a document."""
        contact = ContactFactory()
        dept = DepartmentFactory()
        folder = DepartmentClientFolderFactory(
            department=dept,
            contact=contact,
        )

        test_file = SimpleUploadedFile(
            "test_doc.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        resp = authenticated_client.post(
            BASE,
            {
                "content": "See attached document",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        # Verify document was created
        doc = Document.objects.filter(department_folder=folder).first()
        assert doc is not None
        assert doc.title == "test_doc.pdf"
        assert doc.uploaded_by == preparer_user
        assert doc.contact == contact

    def test_attachment_saves_mime_type(self, authenticated_client):
        """Test that attachment saves correct mime_type."""
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(contact=contact)

        test_file = SimpleUploadedFile(
            "report.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        authenticated_client.post(
            BASE,
            {
                "content": "PDF attached",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        doc = Document.objects.filter(department_folder=folder).first()
        assert doc is not None
        assert doc.mime_type == "application/pdf"

    def test_attachment_saves_file_size(self, authenticated_client):
        """Test that attachment saves correct file_size."""
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(contact=contact)

        test_file = SimpleUploadedFile(
            "test.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        authenticated_client.post(
            BASE,
            {
                "content": "With size",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        doc = Document.objects.filter(department_folder=folder).first()
        assert doc is not None
        assert doc.file_size == len(VALID_PDF_CONTENT)

    def test_attachment_detects_mime_type_from_filename(self, authenticated_client):
        """Test that mime_type is detected from filename when content_type is generic."""
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(contact=contact)

        # File with generic content type but .pdf extension
        test_file = SimpleUploadedFile(
            "document.pdf", VALID_PDF_CONTENT, content_type="application/octet-stream"
        )

        authenticated_client.post(
            BASE,
            {
                "content": "PDF by extension",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        doc = Document.objects.filter(department_folder=folder).first()
        assert doc is not None
        assert doc.mime_type == "application/pdf"

    def test_multiple_attachments(self, authenticated_client):
        """Test creating comment with multiple attachments."""
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(contact=contact)

        file1 = SimpleUploadedFile(
            "doc1.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )
        file2 = SimpleUploadedFile(
            "doc2.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        resp = authenticated_client.post(
            BASE,
            {
                "content": "Multiple files",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [file1, file2],
            },
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        docs = Document.objects.filter(department_folder=folder)
        assert docs.count() == 2

    def test_attachment_links_to_correct_client(self, authenticated_client):
        """Test that attachment is linked to the correct contact."""
        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(contact=contact)

        test_file = SimpleUploadedFile(
            "test.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        authenticated_client.post(
            BASE,
            {
                "content": "Contact doc",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        doc = Document.objects.filter(department_folder=folder).first()
        assert doc is not None
        assert doc.contact == contact
        assert doc.corporation is None

    def test_attachment_for_corporation(self, authenticated_client):
        """Test that attachment is linked to the correct corporation."""
        corp = CorporationFactory()
        folder = DepartmentClientFolderFactory(corporation=corp, contact=None)

        test_file = SimpleUploadedFile(
            "corp_doc.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        authenticated_client.post(
            BASE,
            {
                "content": "Corp doc",
                "entity_type": "corporation",
                "entity_id": str(corp.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        doc = Document.objects.filter(department_folder=folder).first()
        assert doc is not None
        assert doc.corporation == corp
        assert doc.contact is None

    def test_comment_stores_attachment_references(self, authenticated_client):
        """Test that comment metadata contains attachment references."""
        from apps.activities.models import Comment

        contact = ContactFactory()
        folder = DepartmentClientFolderFactory(contact=contact)

        test_file = SimpleUploadedFile(
            "ref_test.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        resp = authenticated_client.post(
            BASE,
            {
                "content": "With refs",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        assert resp.status_code == status.HTTP_201_CREATED
        # Check the comment metadata directly (create response may not include it)
        comment = Comment.objects.filter(content="With refs").first()
        assert comment is not None
        assert "attachments" in comment.metadata
        assert len(comment.metadata["attachments"]) == 1
        assert comment.metadata["attachments"][0]["title"] == "ref_test.pdf"

    def test_comment_without_folder_does_not_create_document(
        self, authenticated_client
    ):
        """Test that attachment without department_folder is ignored."""
        contact = ContactFactory()

        test_file = SimpleUploadedFile(
            "no_folder.pdf", VALID_PDF_CONTENT, content_type="application/pdf"
        )

        initial_count = Document.objects.count()

        resp = authenticated_client.post(
            BASE,
            {
                "content": "No folder specified",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "attachments": [test_file],
            },
            format="multipart",
        )

        assert resp.status_code == status.HTTP_201_CREATED
        # No document should be created without department_folder
        assert Document.objects.count() == initial_count


@pytest.mark.django_db
class TestCommentDepartmentFolderInfo:
    """Tests for department folder info in comments."""

    def test_comment_includes_department_folder_info(self, authenticated_client):
        """Test that comment response includes department folder info."""
        from apps.activities.models import Comment

        contact = ContactFactory()
        dept = DepartmentFactory(name="Accounting")
        folder = DepartmentClientFolderFactory(
            name="Tax Documents",
            department=dept,
            contact=contact,
        )

        resp = authenticated_client.post(
            BASE,
            {
                "content": "With folder info",
                "entity_type": "contact",
                "entity_id": str(contact.id),
                "department_folder": str(folder.id),
            },
            format="json",
        )

        assert resp.status_code == status.HTTP_201_CREATED
        assert str(resp.data["department_folder"]) == str(folder.id)
        # Check the comment directly for folder info
        comment = Comment.objects.filter(content="With folder info").first()
        assert comment is not None
        assert comment.department_folder == folder
        assert comment.department_folder.name == "Tax Documents"
        assert comment.department_folder.department.name == "Accounting"
