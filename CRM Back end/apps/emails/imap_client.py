"""
IMAP & SMTP client helpers for email sync and sending.

Uses Python stdlib imaplib / smtplib / email modules.
"""

import email
import email.utils
import imaplib
import logging
import smtplib
from datetime import datetime, timezone
from email.header import decode_header
from email.message import Message
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _decode_header_value(value: str | None) -> str:
    """Decode an RFC 2047 encoded header into a plain string."""
    if not value:
        return ""
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return "".join(decoded)


def _parse_address_list(raw: str | None) -> list[str]:
    """Parse a comma-separated address header into a list of email strings."""
    if not raw:
        return []
    addresses = email.utils.getaddresses([raw])
    return [addr for _, addr in addresses if addr]


def _parse_date(raw: str | None) -> datetime | None:
    """Parse an RFC 2822 date string into a timezone-aware datetime."""
    if not raw:
        return None
    parsed = email.utils.parsedate_to_datetime(raw)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _get_text_body(msg: Message) -> str:
    """Extract the plain-text body from a MIME message."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if content_type == "text/plain" and "attachment" not in disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        return ""
    payload = msg.get_payload(decode=True)
    if payload:
        charset = msg.get_content_charset() or "utf-8"
        return payload.decode(charset, errors="replace")
    return ""


def _get_attachments(msg: Message) -> list[dict]:
    """Extract attachment info from a MIME message.

    Returns list of dicts: {filename, mime_type, data (bytes), size}.
    """
    attachments = []
    if not msg.is_multipart():
        return attachments
    for part in msg.walk():
        disposition = str(part.get("Content-Disposition", ""))
        if "attachment" not in disposition and "inline" not in disposition:
            continue
        if part.get_content_maintype() == "multipart":
            continue
        filename = part.get_filename()
        if filename:
            filename = _decode_header_value(filename)
        else:
            filename = "attachment"
        data = part.get_payload(decode=True)
        if data is None:
            continue
        attachments.append(
            {
                "filename": filename,
                "mime_type": part.get_content_type(),
                "data": data,
                "size": len(data),
            }
        )
    return attachments


class ParsedEmail:
    """Structured representation of a parsed IMAP email."""

    def __init__(self, uid: str, msg: Message):
        self.uid = uid
        self.message_id = msg.get("Message-ID", "").strip()
        self.in_reply_to = msg.get("In-Reply-To", "").strip()
        self.references = msg.get("References", "").strip()
        self.subject = _decode_header_value(msg.get("Subject"))
        self.from_address = _parse_address_list(msg.get("From"))
        self.to_addresses = _parse_address_list(msg.get("To"))
        self.cc_addresses = _parse_address_list(msg.get("Cc"))
        self.date = _parse_date(msg.get("Date"))
        self.body_text = _get_text_body(msg)
        self.attachments = _get_attachments(msg)
        # Store select raw headers
        self.raw_headers = {
            k: msg.get(k, "")
            for k in (
                "From",
                "To",
                "Cc",
                "Subject",
                "Date",
                "Message-ID",
                "In-Reply-To",
                "References",
            )
        }


class IMAPClient:
    """Wraps imaplib for fetching new emails from an account."""

    def __init__(
        self, host: str, port: int, use_ssl: bool, username: str, password: str
    ):
        self.host = host
        self.port = port
        self.use_ssl = use_ssl
        self.username = username
        self.password = password
        self._conn: imaplib.IMAP4 | None = None

    def connect(self):
        if self.use_ssl:
            self._conn = imaplib.IMAP4_SSL(self.host, self.port)
        else:
            self._conn = imaplib.IMAP4(self.host, self.port)
        self._conn.login(self.username, self.password)

    def disconnect(self):
        if self._conn:
            try:
                self._conn.logout()
            except Exception:
                pass
            self._conn = None

    def fetch_new_messages(self, since_uid: str = "") -> list[ParsedEmail]:
        """Fetch messages from INBOX. If since_uid is given, fetch only newer."""
        if not self._conn:
            raise RuntimeError("Not connected. Call connect() first.")

        self._conn.select("INBOX")

        if since_uid:
            # Fetch UIDs greater than the last known UID
            search_criteria = f"(UID {int(since_uid) + 1}:*)"
        else:
            search_criteria = "ALL"

        status, data = self._conn.uid("search", None, search_criteria)
        if status != "OK":
            return []

        uid_list = data[0].split()
        if not uid_list:
            return []

        results = []
        for uid_bytes in uid_list:
            uid_str = uid_bytes.decode()
            status, msg_data = self._conn.uid("fetch", uid_str, "(RFC822)")
            if status != "OK" or not msg_data or not msg_data[0]:
                continue
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            results.append(ParsedEmail(uid=uid_str, msg=msg))

        return results

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()


class SMTPClient:
    """Wraps smtplib for sending outbound email."""

    def __init__(
        self, host: str, port: int, use_tls: bool, username: str, password: str
    ):
        self.host = host
        self.port = port
        self.use_tls = use_tls
        self.username = username
        self.password = password
        self._conn: smtplib.SMTP | None = None

    def connect(self):
        self._conn = smtplib.SMTP(self.host, self.port)
        self._conn.ehlo()
        if self.use_tls:
            self._conn.starttls()
            self._conn.ehlo()
        self._conn.login(self.username, self.password)

    def disconnect(self):
        if self._conn:
            try:
                self._conn.quit()
            except Exception:
                pass
            self._conn = None

    def send_message(
        self,
        from_addr: str,
        to_addrs: list[str],
        subject: str,
        body_text: str,
        cc_addrs: list[str] | None = None,
        bcc_addrs: list[str] | None = None,
        in_reply_to: str = "",
        references: str = "",
        attachments: list[dict] | None = None,
    ) -> str:
        """Send an email and return the generated Message-ID."""
        if not self._conn:
            raise RuntimeError("Not connected. Call connect() first.")

        has_attachments = attachments and len(attachments) > 0

        if has_attachments:
            msg = MIMEMultipart()
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
            for att in attachments:
                part = MIMEApplication(att["data"], Name=att["filename"])
                part["Content-Disposition"] = (
                    f'attachment; filename="{att["filename"]}"'
                )
                msg.attach(part)
        else:
            msg = MIMEText(body_text, "plain", "utf-8")

        msg["From"] = from_addr
        msg["To"] = ", ".join(to_addrs)
        if cc_addrs:
            msg["Cc"] = ", ".join(cc_addrs)
        msg["Subject"] = subject
        if in_reply_to:
            msg["In-Reply-To"] = in_reply_to
        if references:
            msg["References"] = references

        # Generate a Message-ID
        import uuid as _uuid

        domain = from_addr.split("@")[1] if "@" in from_addr else "localhost"
        generated_id = f"<{_uuid.uuid4()}@{domain}>"
        msg["Message-ID"] = generated_id

        all_recipients = list(to_addrs)
        if cc_addrs:
            all_recipients.extend(cc_addrs)
        if bcc_addrs:
            all_recipients.extend(bcc_addrs)

        self._conn.sendmail(from_addr, all_recipients, msg.as_string())
        return generated_id

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
