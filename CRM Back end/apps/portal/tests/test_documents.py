import pytest

from tests.factories import (
    ContactFactory,
    DocumentFactory,
    PortalDocumentUploadFactory,
)


@pytest.mark.django_db
class TestPortalDocumentList:
    """Tests for GET /api/v1/portal/documents/."""

    URL = "/api/v1/portal/documents/"

    def test_list_own_documents(self, portal_authenticated_client, portal_contact):
        doc = DocumentFactory(contact=portal_contact)
        PortalDocumentUploadFactory(contact=portal_contact, document=doc)

        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data) == 1

    def test_cannot_see_other_contacts_documents(
        self, portal_authenticated_client, portal_contact
    ):
        other_contact = ContactFactory()
        doc = DocumentFactory(contact=other_contact)
        PortalDocumentUploadFactory(contact=other_contact, document=doc)

        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data) == 0


@pytest.mark.django_db
class TestPortalDocumentRetrieve:
    """Tests for GET /api/v1/portal/documents/{id}/."""

    def test_view_own_document(self, portal_authenticated_client, portal_contact):
        doc = DocumentFactory(contact=portal_contact)
        upload = PortalDocumentUploadFactory(contact=portal_contact, document=doc)

        resp = portal_authenticated_client.get(
            f"/api/v1/portal/documents/{upload.id}/"
        )
        assert resp.status_code == 200

    def test_cannot_view_other_contacts_document(
        self, portal_authenticated_client
    ):
        other_contact = ContactFactory()
        doc = DocumentFactory(contact=other_contact)
        upload = PortalDocumentUploadFactory(contact=other_contact, document=doc)

        resp = portal_authenticated_client.get(
            f"/api/v1/portal/documents/{upload.id}/"
        )
        assert resp.status_code == 404
