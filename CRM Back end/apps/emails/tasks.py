"""
Celery tasks for email sync, send, and notification checks.
"""

import logging
import re
from datetime import timedelta
from io import BytesIO

from celery import shared_task
from django.core.files.base import ContentFile
from django.db.models import Q
from django.utils import timezone

from apps.emails.imap_client import IMAPClient

logger = logging.getLogger(__name__)


def _normalize_subject(subject: str) -> str:
    """Strip Re:/Fwd: prefixes for thread matching."""
    return re.sub(r"^(re|fwd?)\s*:\s*", "", subject.strip(), flags=re.IGNORECASE).strip()


def _find_or_create_thread(parsed, account):
    """Find an existing thread by In-Reply-To / References, or create a new one."""
    from apps.emails.models import EmailMessage, EmailThread

    # Try matching by In-Reply-To
    if parsed.in_reply_to:
        existing = EmailMessage.objects.filter(
            message_id=parsed.in_reply_to, thread__isnull=False
        ).select_related("thread").first()
        if existing:
            return existing.thread

    # Try matching by References header
    if parsed.references:
        ref_ids = parsed.references.split()
        for ref_id in reversed(ref_ids):
            ref_id = ref_id.strip()
            if ref_id:
                existing = EmailMessage.objects.filter(
                    message_id=ref_id, thread__isnull=False
                ).select_related("thread").first()
                if existing:
                    return existing.thread

    # Fallback: match by normalized subject
    normalized = _normalize_subject(parsed.subject)
    if normalized:
        thread = EmailThread.objects.filter(
            subject=normalized,
            messages__account=account,
        ).first()
        if thread:
            return thread

    # Create new thread
    return EmailThread.objects.create(subject=_normalize_subject(parsed.subject))


def _auto_link_contact(from_address: str):
    """Try to find a Contact by email address."""
    from apps.contacts.models import Contact
    return Contact.objects.filter(email__iexact=from_address).first()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_email_account(self, account_id: str):
    """Sync a single email account via IMAP."""
    from apps.emails.models import (
        EmailAccount,
        EmailAttachment,
        EmailMessage,
        EmailSyncLog,
    )

    started_at = timezone.now()

    try:
        account = EmailAccount.objects.get(id=account_id, is_active=True)
    except EmailAccount.DoesNotExist:
        logger.warning("Email account %s not found or inactive", account_id)
        return

    # Determine the last known IMAP UID
    last_msg = (
        EmailMessage.objects.filter(account=account, direction="inbound")
        .exclude(imap_uid="")
        .order_by("-imap_uid")
        .values_list("imap_uid", flat=True)
        .first()
    )
    since_uid = last_msg or ""

    messages_fetched = 0
    try:
        with IMAPClient(
            host=account.imap_host,
            port=account.imap_port,
            use_ssl=account.imap_use_ssl,
            username=account.username,
            password=account.password,
        ) as client:
            parsed_emails = client.fetch_new_messages(since_uid=since_uid)

            for parsed in parsed_emails:
                if not parsed.message_id:
                    continue

                # Skip duplicates
                if EmailMessage.objects.filter(message_id=parsed.message_id).exists():
                    continue

                # Find or create thread
                thread = _find_or_create_thread(parsed, account)

                # Auto-link contact
                from_addr = parsed.from_address[0] if parsed.from_address else ""
                contact = _auto_link_contact(from_addr) if from_addr else None

                # Create message
                msg = EmailMessage.objects.create(
                    account=account,
                    thread=thread,
                    message_id=parsed.message_id,
                    in_reply_to=parsed.in_reply_to,
                    references=parsed.references,
                    direction=EmailMessage.Direction.INBOUND,
                    from_address=from_addr,
                    to_addresses=parsed.to_addresses,
                    cc_addresses=parsed.cc_addresses,
                    subject=parsed.subject,
                    body_text=parsed.body_text,
                    sent_at=parsed.date,
                    folder=EmailMessage.Folder.INBOX,
                    imap_uid=parsed.uid,
                    raw_headers=parsed.raw_headers,
                    contact=contact,
                    case=contact.tax_cases.order_by("-created_at").first()
                    if contact
                    else None,
                )

                # Save attachments
                for att in parsed.attachments:
                    EmailAttachment.objects.create(
                        email=msg,
                        file=ContentFile(att["data"], name=att["filename"]),
                        filename=att["filename"],
                        mime_type=att["mime_type"],
                        file_size=att["size"],
                    )

                messages_fetched += 1

                # Update thread stats
                thread.last_message_at = msg.sent_at or msg.created_at
                thread.message_count = thread.messages.count()
                if contact and not thread.contact:
                    thread.contact = contact
                thread.save(update_fields=[
                    "last_message_at", "message_count", "contact", "updated_at"
                ])

        account.last_sync_at = timezone.now()
        account.save(update_fields=["last_sync_at", "updated_at"])

        EmailSyncLog.objects.create(
            account=account,
            status=EmailSyncLog.Status.SUCCESS,
            messages_fetched=messages_fetched,
            started_at=started_at,
            completed_at=timezone.now(),
        )

    except Exception as exc:
        logger.exception("Error syncing account %s", account_id)
        EmailSyncLog.objects.create(
            account=account,
            status=EmailSyncLog.Status.ERROR,
            messages_fetched=messages_fetched,
            error_message=str(exc),
            started_at=started_at,
            completed_at=timezone.now(),
        )
        raise self.retry(exc=exc)


@shared_task
def sync_all_accounts():
    """Dispatch sync tasks for all active email accounts."""
    from apps.emails.models import EmailAccount

    for account_id in EmailAccount.objects.filter(
        is_active=True
    ).values_list("id", flat=True):
        sync_email_account.delay(str(account_id))


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(self, message_id: str):
    """Send an outbound email via SMTP."""
    from apps.emails.imap_client import SMTPClient
    from apps.emails.models import EmailMessage

    try:
        msg = EmailMessage.objects.select_related("account").get(id=message_id)
    except EmailMessage.DoesNotExist:
        logger.warning("EmailMessage %s not found", message_id)
        return

    account = msg.account

    # Gather attachment data
    attachments = []
    for att in msg.attachments.all():
        if att.file:
            att.file.seek(0)
            attachments.append({
                "filename": att.filename,
                "data": att.file.read(),
            })

    try:
        with SMTPClient(
            host=account.smtp_host,
            port=account.smtp_port,
            use_tls=account.smtp_use_tls,
            username=account.username,
            password=account.password,
        ) as client:
            generated_id = client.send_message(
                from_addr=account.email_address,
                to_addrs=msg.to_addresses,
                subject=msg.subject,
                body_text=msg.body_text,
                cc_addrs=msg.cc_addresses or None,
                bcc_addrs=msg.bcc_addresses or None,
                in_reply_to=msg.in_reply_to,
                references=msg.references,
                attachments=attachments if attachments else None,
            )

        # Update the message with the generated Message-ID if it was a placeholder
        if msg.message_id.startswith("draft-"):
            msg.message_id = generated_id
        msg.sent_at = timezone.now()
        msg.folder = EmailMessage.Folder.SENT
        msg.save(update_fields=["message_id", "sent_at", "folder", "updated_at"])

        # Update thread
        if msg.thread:
            msg.thread.last_message_at = msg.sent_at
            msg.thread.message_count = msg.thread.messages.count()
            msg.thread.save(update_fields=[
                "last_message_at", "message_count", "updated_at"
            ])

    except Exception as exc:
        logger.exception("Error sending email %s", message_id)
        raise self.retry(exc=exc)


@shared_task
def check_unassigned_emails():
    """Flag inbound emails older than 15 minutes with no assignee.

    Creates an audit-style notification via Django's logging.
    In a production system this would push to a notification service.
    """
    from apps.emails.models import EmailMessage

    cutoff = timezone.now() - timedelta(minutes=15)
    unassigned = EmailMessage.objects.filter(
        direction=EmailMessage.Direction.INBOUND,
        assigned_to__isnull=True,
        is_read=False,
        folder=EmailMessage.Folder.INBOX,
        sent_at__lte=cutoff,
    )
    count = unassigned.count()
    if count:
        logger.info(
            "NOTIFICATION: %d unassigned inbound email(s) older than 15 minutes",
            count,
        )
    return count


@shared_task
def check_no_reply_emails():
    """Find inbound emails > 1 day old with no outbound reply in thread."""
    from apps.emails.models import EmailMessage, EmailThread

    one_day_ago = timezone.now() - timedelta(days=1)

    # Threads with inbound messages older than 1 day
    threads_needing_reply = EmailThread.objects.filter(
        messages__direction=EmailMessage.Direction.INBOUND,
        messages__sent_at__lte=one_day_ago,
        messages__folder=EmailMessage.Folder.INBOX,
    ).exclude(
        # Exclude threads that already have an outbound reply after the inbound
        messages__direction=EmailMessage.Direction.OUTBOUND,
    ).distinct()

    count = threads_needing_reply.count()
    if count:
        logger.info(
            "NOTIFICATION: %d email thread(s) have no reply after 1 day",
            count,
        )
    return count
