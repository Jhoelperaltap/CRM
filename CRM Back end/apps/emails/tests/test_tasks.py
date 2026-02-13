from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.emails.models import EmailMessage, EmailSyncLog
from apps.emails.tasks import (
    check_no_reply_emails,
    check_unassigned_emails,
    sync_email_account,
)
from tests.factories import (
    ContactFactory,
    EmailAccountFactory,
    EmailMessageFactory,
    EmailThreadFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestSyncEmailAccount:
    @patch("apps.emails.tasks.IMAPClient")
    def test_sync_creates_messages(self, mock_imap_cls):
        account = EmailAccountFactory()

        parsed = MagicMock()
        parsed.message_id = "<test-123@example.com>"
        parsed.in_reply_to = ""
        parsed.references = ""
        parsed.subject = "Test Subject"
        parsed.from_address = ["sender@example.com"]
        parsed.to_addresses = ["office@example.com"]
        parsed.cc_addresses = []
        parsed.date = timezone.now()
        parsed.body_text = "Test body"
        parsed.attachments = []
        parsed.uid = "100"
        parsed.raw_headers = {}

        mock_client = MagicMock()
        mock_client.fetch_new_messages.return_value = [parsed]
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_imap_cls.return_value = mock_client

        sync_email_account(str(account.id))

        assert EmailMessage.objects.filter(message_id="<test-123@example.com>").exists()
        assert EmailSyncLog.objects.filter(account=account, status="success").exists()

    @patch("apps.emails.tasks.IMAPClient")
    def test_sync_auto_links_contact(self, mock_imap_cls):
        contact = ContactFactory(email="sender@example.com")
        account = EmailAccountFactory()

        parsed = MagicMock()
        parsed.message_id = "<auto-link@example.com>"
        parsed.in_reply_to = ""
        parsed.references = ""
        parsed.subject = "Auto Link Test"
        parsed.from_address = ["sender@example.com"]
        parsed.to_addresses = ["office@example.com"]
        parsed.cc_addresses = []
        parsed.date = timezone.now()
        parsed.body_text = "Body"
        parsed.attachments = []
        parsed.uid = "200"
        parsed.raw_headers = {}

        mock_client = MagicMock()
        mock_client.fetch_new_messages.return_value = [parsed]
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_imap_cls.return_value = mock_client

        sync_email_account(str(account.id))

        msg = EmailMessage.objects.get(message_id="<auto-link@example.com>")
        assert msg.contact == contact


@pytest.mark.django_db
class TestCheckUnassignedEmails:
    def test_counts_unassigned(self):
        account = EmailAccountFactory()
        EmailMessageFactory(
            account=account,
            direction="inbound",
            assigned_to=None,
            is_read=False,
            folder="inbox",
            sent_at=timezone.now() - timezone.timedelta(minutes=30),
        )
        count = check_unassigned_emails()
        assert count >= 1

    def test_ignores_assigned(self):
        account = EmailAccountFactory()
        user = UserFactory()
        EmailMessageFactory(
            account=account,
            direction="inbound",
            assigned_to=user,
            is_read=False,
            folder="inbox",
            sent_at=timezone.now() - timezone.timedelta(minutes=30),
        )
        count = check_unassigned_emails()
        assert count == 0


@pytest.mark.django_db
class TestCheckNoReplyEmails:
    def test_counts_no_reply_threads(self):
        account = EmailAccountFactory()
        thread = EmailThreadFactory()
        EmailMessageFactory(
            account=account,
            thread=thread,
            direction="inbound",
            folder="inbox",
            sent_at=timezone.now() - timezone.timedelta(days=2),
        )
        count = check_no_reply_emails()
        assert count >= 1
