import pytest

from apps.portal.models import PortalMessage
from tests.factories import ContactFactory, PortalMessageFactory, UserFactory


@pytest.mark.django_db
class TestPortalMessageList:
    """Tests for GET /api/v1/portal/messages/."""

    URL = "/api/v1/portal/messages/"

    def test_list_own_messages(self, portal_authenticated_client, portal_contact):
        PortalMessageFactory(contact=portal_contact, subject="My Message")
        PortalMessageFactory(contact=portal_contact, subject="Another")

        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data) == 2

    def test_cannot_see_other_contacts_messages(
        self, portal_authenticated_client, portal_contact
    ):
        other_contact = ContactFactory()
        PortalMessageFactory(contact=other_contact)

        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data) == 0


@pytest.mark.django_db
class TestPortalMessageCreate:
    """Tests for POST /api/v1/portal/messages/."""

    URL = "/api/v1/portal/messages/"

    def test_send_message(self, portal_authenticated_client, portal_contact):
        resp = portal_authenticated_client.post(
            self.URL,
            {"subject": "Question", "body": "I have a question about my return."},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["subject"] == "Question"
        assert resp.data["message_type"] == "client_to_staff"
        assert resp.data["contact"] == str(portal_contact.id)


@pytest.mark.django_db
class TestPortalMessageDetail:
    """Tests for GET /api/v1/portal/messages/{id}/."""

    def test_view_own_message(self, portal_authenticated_client, portal_contact):
        msg = PortalMessageFactory(contact=portal_contact)
        resp = portal_authenticated_client.get(
            f"/api/v1/portal/messages/{msg.id}/"
        )
        assert resp.status_code == 200

    def test_cannot_view_other_contacts_message(
        self, portal_authenticated_client
    ):
        other_contact = ContactFactory()
        msg = PortalMessageFactory(contact=other_contact)
        resp = portal_authenticated_client.get(
            f"/api/v1/portal/messages/{msg.id}/"
        )
        assert resp.status_code == 404


@pytest.mark.django_db
class TestPortalStaffReply:
    """Test that staff replies appear for the client."""

    def test_staff_reply_visible(self, portal_authenticated_client, portal_contact):
        msg = PortalMessageFactory(
            contact=portal_contact,
            message_type="client_to_staff",
            subject="Help",
        )
        staff_user = UserFactory()
        reply = PortalMessageFactory(
            contact=portal_contact,
            message_type="staff_to_client",
            subject="Re: Help",
            sender_user=staff_user,
            parent_message=msg,
        )

        resp = portal_authenticated_client.get("/api/v1/portal/messages/")
        assert resp.status_code == 200
        ids = [m["id"] for m in resp.data]
        assert str(reply.id) in ids


@pytest.mark.django_db
class TestPortalMarkRead:
    """Tests for POST /api/v1/portal/messages/{id}/mark-read/."""

    def test_mark_as_read(self, portal_authenticated_client, portal_contact):
        msg = PortalMessageFactory(contact=portal_contact, is_read=False)
        resp = portal_authenticated_client.post(
            f"/api/v1/portal/messages/{msg.id}/mark-read/"
        )
        assert resp.status_code == 200

        msg.refresh_from_db()
        assert msg.is_read is True

    def test_cannot_mark_other_contacts_message(
        self, portal_authenticated_client
    ):
        other_contact = ContactFactory()
        msg = PortalMessageFactory(contact=other_contact)
        resp = portal_authenticated_client.post(
            f"/api/v1/portal/messages/{msg.id}/mark-read/"
        )
        assert resp.status_code == 404
