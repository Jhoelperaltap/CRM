from unittest.mock import patch

import pytest
from rest_framework import status

from tests.factories import (
    ContactFactory,
    EmailMessageFactory,
    EmailTemplateFactory,
    EmailThreadFactory,
    TaxCaseFactory,
)


MESSAGES_BASE = "/api/v1/emails/messages/"
THREADS_BASE = "/api/v1/emails/threads/"
TEMPLATES_BASE = "/api/v1/emails/templates/"


@pytest.mark.django_db
class TestEmailMessageList:
    def test_admin_can_list(self, admin_client, email_account):
        EmailMessageFactory.create_batch(3, account=email_account)
        resp = admin_client.get(MESSAGES_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_filter_by_folder(self, admin_client, email_account):
        EmailMessageFactory(account=email_account, folder="inbox")
        EmailMessageFactory(account=email_account, folder="sent", direction="outbound")
        resp = admin_client.get(f"{MESSAGES_BASE}?folder=sent")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["folder"] == "sent"

    def test_filter_by_contact(self, admin_client, email_account):
        contact = ContactFactory()
        EmailMessageFactory(account=email_account, contact=contact)
        EmailMessageFactory(account=email_account)
        resp = admin_client.get(f"{MESSAGES_BASE}?contact={contact.id}")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert str(result["contact"]) == str(contact.id)

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(MESSAGES_BASE)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestEmailMessageActions:
    def test_mark_read(self, admin_client, email_account):
        msg = EmailMessageFactory(account=email_account, is_read=False)
        resp = admin_client.post(f"{MESSAGES_BASE}{msg.id}/mark-read/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_read"] is True

    def test_mark_unread(self, admin_client, email_account):
        msg = EmailMessageFactory(account=email_account, is_read=True)
        resp = admin_client.post(f"{MESSAGES_BASE}{msg.id}/mark-unread/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_read"] is False

    def test_toggle_star(self, admin_client, email_account):
        msg = EmailMessageFactory(account=email_account, is_starred=False)
        resp = admin_client.post(f"{MESSAGES_BASE}{msg.id}/toggle-star/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_starred"] is True

    def test_assign_email(self, admin_client, email_account, admin_user):
        msg = EmailMessageFactory(account=email_account)
        resp = admin_client.post(
            f"{MESSAGES_BASE}{msg.id}/assign/",
            {"user_id": str(admin_user.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert str(resp.data["assigned_to"]) == str(admin_user.id)

    def test_link_contact(self, admin_client, email_account):
        msg = EmailMessageFactory(account=email_account)
        contact = ContactFactory()
        resp = admin_client.post(
            f"{MESSAGES_BASE}{msg.id}/link-contact/",
            {"contact_id": str(contact.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert str(resp.data["contact"]) == str(contact.id)

    def test_link_case(self, admin_client, email_account):
        msg = EmailMessageFactory(account=email_account)
        case = TaxCaseFactory()
        resp = admin_client.post(
            f"{MESSAGES_BASE}{msg.id}/link-case/",
            {"case_id": str(case.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert str(resp.data["case"]) == str(case.id)

    def test_move_to_trash(self, admin_client, email_account):
        msg = EmailMessageFactory(account=email_account, folder="inbox")
        resp = admin_client.post(f"{MESSAGES_BASE}{msg.id}/move-to-trash/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["folder"] == "trash"


@pytest.mark.django_db
class TestEmailCompose:
    @patch("apps.emails.views.send_email_task")
    def test_compose_sends_email(self, mock_send, admin_client, admin_user, email_account):
        # Assign email account to admin user (required for compose)
        admin_user.email_account = email_account
        admin_user.save()

        resp = admin_client.post(
            f"{MESSAGES_BASE}compose/",
            {
                "account": str(email_account.id),
                "to_addresses": ["recipient@example.com"],
                "subject": "Test Subject",
                "body_text": "Test body content",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["subject"] == "Test Subject"
        assert resp.data["direction"] == "outbound"

    @patch("apps.emails.views.send_email_task")
    def test_compose_with_template(self, mock_send, admin_client, admin_user, email_account):
        # Assign email account to admin user (required for compose)
        admin_user.email_account = email_account
        admin_user.save()

        template = EmailTemplateFactory()
        resp = admin_client.post(
            f"{MESSAGES_BASE}compose/",
            {
                "account": str(email_account.id),
                "to_addresses": ["recipient@example.com"],
                "subject": "Ignored",
                "body_text": "Ignored",
                "template_id": str(template.id),
                "template_context": {
                    "contact_name": "John Doe",
                    "case_number": "TC-2025-0001",
                },
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert "John Doe" in resp.data["subject"]

    def test_compose_without_email_account_fails(self, admin_client):
        """Test that users without assigned email accounts cannot compose emails."""
        resp = admin_client.post(
            f"{MESSAGES_BASE}compose/",
            {
                "to_addresses": ["recipient@example.com"],
                "subject": "Test",
                "body_text": "Test body",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "email account" in resp.data["detail"].lower()


@pytest.mark.django_db
class TestEmailThreads:
    def test_list_threads(self, admin_client):
        EmailThreadFactory.create_batch(3)
        resp = admin_client.get(THREADS_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_thread_detail_includes_messages(self, admin_client, email_account):
        thread = EmailThreadFactory()
        EmailMessageFactory(account=email_account, thread=thread)
        EmailMessageFactory(account=email_account, thread=thread)
        resp = admin_client.get(f"{THREADS_BASE}{thread.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["messages"]) == 2

    def test_archive_thread(self, admin_client):
        thread = EmailThreadFactory(is_archived=False)
        resp = admin_client.post(f"{THREADS_BASE}{thread.id}/archive/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_archived"] is True


@pytest.mark.django_db
class TestEmailTemplates:
    def test_admin_can_crud(self, admin_client):
        resp = admin_client.post(
            TEMPLATES_BASE,
            {
                "name": "Welcome",
                "subject": "Welcome {{contact_name}}",
                "body_text": "Dear {{contact_name}}, welcome!",
                "variables": ["contact_name"],
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        template_id = resp.data["id"]

        resp = admin_client.get(TEMPLATES_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1

        resp = admin_client.patch(
            f"{TEMPLATES_BASE}{template_id}/",
            {"subject": "Updated Subject"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["subject"] == "Updated Subject"

        resp = admin_client.delete(f"{TEMPLATES_BASE}{template_id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_render_preview(self, admin_client):
        template = EmailTemplateFactory()
        resp = admin_client.post(
            f"{TEMPLATES_BASE}{template.id}/render/",
            {"context": {"contact_name": "Jane", "case_number": "TC-001"}},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "Jane" in resp.data["subject"]
        assert "TC-001" in resp.data["body_text"]
