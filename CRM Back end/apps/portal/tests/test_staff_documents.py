import pytest

from apps.portal.models import PortalDocumentUpload
from tests.factories import (
    ContactFactory,
    DocumentFactory,
    PortalDocumentUploadFactory,
)


@pytest.fixture
def pending_upload(portal_contact, db):
    doc = DocumentFactory()
    return PortalDocumentUploadFactory(
        contact=portal_contact,
        document=doc,
        status="pending",
    )


@pytest.mark.django_db
class TestStaffDocumentReviewList:
    """Tests for GET /api/v1/settings/portal/documents/."""

    URL = "/api/v1/settings/portal/documents/"

    def test_admin_can_list_uploads(self, admin_client, pending_upload):
        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_filter_by_status(self, admin_client, pending_upload):
        resp = admin_client.get(self.URL, {"status": "pending"})
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

        resp = admin_client.get(self.URL, {"status": "approved"})
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_filter_by_contact(self, admin_client, pending_upload, portal_contact):
        resp = admin_client.get(self.URL, {"contact": str(portal_contact.id)})
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

        other = ContactFactory()
        resp = admin_client.get(self.URL, {"contact": str(other.id)})
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_non_admin_cannot_list(self, authenticated_client):
        resp = authenticated_client.get(self.URL)
        assert resp.status_code == 403


@pytest.mark.django_db
class TestStaffDocumentApprove:
    """Tests for POST /api/v1/settings/portal/documents/{id}/approve/."""

    def test_approve_upload(self, admin_client, admin_user, pending_upload):
        url = f"/api/v1/settings/portal/documents/{pending_upload.id}/approve/"
        resp = admin_client.post(url)
        assert resp.status_code == 200
        assert resp.data["status"] == "approved"

        pending_upload.refresh_from_db()
        assert pending_upload.status == PortalDocumentUpload.Status.APPROVED
        assert pending_upload.reviewed_by == admin_user
        assert pending_upload.reviewed_at is not None


@pytest.mark.django_db
class TestStaffDocumentReject:
    """Tests for POST /api/v1/settings/portal/documents/{id}/reject/."""

    def test_reject_with_reason(self, admin_client, admin_user, pending_upload):
        url = f"/api/v1/settings/portal/documents/{pending_upload.id}/reject/"
        resp = admin_client.post(
            url,
            {"rejection_reason": "Document is blurry"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "rejected"

        pending_upload.refresh_from_db()
        assert pending_upload.status == PortalDocumentUpload.Status.REJECTED
        assert pending_upload.rejection_reason == "Document is blurry"
        assert pending_upload.reviewed_by == admin_user

    def test_reject_without_reason(self, admin_client, pending_upload):
        url = f"/api/v1/settings/portal/documents/{pending_upload.id}/reject/"
        resp = admin_client.post(url, format="json")
        assert resp.status_code == 200
        assert resp.data["status"] == "rejected"
