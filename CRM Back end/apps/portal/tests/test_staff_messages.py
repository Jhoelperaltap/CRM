import pytest

from apps.portal.models import PortalMessage
from tests.factories import ContactFactory, PortalMessageFactory


@pytest.mark.django_db
class TestStaffPortalMessageList:
    """Tests for GET /api/v1/settings/portal/messages/."""

    URL = "/api/v1/settings/portal/messages/"

    def test_admin_can_list_messages(self, admin_client, portal_contact):
        PortalMessageFactory(contact=portal_contact, subject="Hello")
        PortalMessageFactory(contact=portal_contact, subject="Follow-up")

        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data["count"] == 2

    def test_filter_by_contact(self, admin_client, portal_contact):
        PortalMessageFactory(contact=portal_contact)
        other = ContactFactory()
        PortalMessageFactory(contact=other)

        resp = admin_client.get(self.URL, {"contact": str(portal_contact.id)})
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_filter_by_is_read(self, admin_client, portal_contact):
        PortalMessageFactory(contact=portal_contact, is_read=False)
        PortalMessageFactory(contact=portal_contact, is_read=True)

        resp = admin_client.get(self.URL, {"is_read": "false"})
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_filter_by_message_type(self, admin_client, portal_contact):
        PortalMessageFactory(contact=portal_contact, message_type="client_to_staff")

        resp = admin_client.get(self.URL, {"message_type": "client_to_staff"})
        assert resp.status_code == 200
        assert resp.data["count"] == 1

        resp = admin_client.get(self.URL, {"message_type": "staff_to_client"})
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_non_admin_cannot_list(self, authenticated_client):
        resp = authenticated_client.get(self.URL)
        assert resp.status_code == 403


@pytest.mark.django_db
class TestStaffPortalMessageReply:
    """Tests for POST /api/v1/settings/portal/messages/{id}/reply/."""

    def test_reply_to_client_message(self, admin_client, admin_user, portal_contact):
        msg = PortalMessageFactory(
            contact=portal_contact,
            message_type="client_to_staff",
            subject="Help me",
        )

        url = f"/api/v1/settings/portal/messages/{msg.id}/reply/"
        resp = admin_client.post(
            url,
            {"body": "Here is the info you need."},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["message_type"] == "staff_to_client"
        assert resp.data["subject"] == "Re: Help me"
        assert resp.data["body"] == "Here is the info you need."
        assert str(resp.data["sender_user"]) == str(admin_user.id)
        assert str(resp.data["parent_message"]) == str(msg.id)
        assert str(resp.data["contact"]) == str(portal_contact.id)

    def test_reply_with_custom_subject(self, admin_client, portal_contact):
        msg = PortalMessageFactory(contact=portal_contact, subject="Question")
        url = f"/api/v1/settings/portal/messages/{msg.id}/reply/"
        resp = admin_client.post(
            url,
            {"body": "Response text", "subject": "Custom Subject"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["subject"] == "Custom Subject"

    def test_reply_creates_correct_record(
        self, admin_client, admin_user, portal_contact
    ):
        msg = PortalMessageFactory(
            contact=portal_contact, message_type="client_to_staff"
        )
        url = f"/api/v1/settings/portal/messages/{msg.id}/reply/"
        admin_client.post(url, {"body": "Reply body"}, format="json")

        reply = PortalMessage.objects.filter(parent_message=msg).first()
        assert reply is not None
        assert reply.sender_user == admin_user
        assert reply.message_type == PortalMessage.MessageType.STAFF_TO_CLIENT
