from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Email Account (IMAP/SMTP connection config)
# ---------------------------------------------------------------------------
class EmailAccount(TimeStampedModel):
    """Stores IMAP/SMTP credentials for an email account used by the CRM."""

    name = models.CharField(_("account name"), max_length=100)
    email_address = models.EmailField(_("email address"), unique=True)

    # IMAP
    imap_host = models.CharField(_("IMAP host"), max_length=255)
    imap_port = models.PositiveIntegerField(_("IMAP port"), default=993)
    imap_use_ssl = models.BooleanField(_("IMAP use SSL"), default=True)

    # SMTP
    smtp_host = models.CharField(_("SMTP host"), max_length=255)
    smtp_port = models.PositiveIntegerField(_("SMTP port"), default=587)
    smtp_use_tls = models.BooleanField(_("SMTP use TLS"), default=True)

    # Credentials
    username = models.CharField(_("username"), max_length=255)
    password = models.CharField(_("password"), max_length=255)

    is_active = models.BooleanField(_("active"), default=True)
    last_sync_at = models.DateTimeField(_("last sync"), null=True, blank=True)
    sync_interval_minutes = models.PositiveIntegerField(
        _("sync interval (minutes)"), default=5
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_accounts",
        verbose_name=_("created by"),
    )

    class Meta:
        db_table = "crm_email_accounts"
        verbose_name = _("email account")
        verbose_name_plural = _("email accounts")

    def __str__(self):
        return f"{self.name} <{self.email_address}>"


# ---------------------------------------------------------------------------
# Email Thread
# ---------------------------------------------------------------------------
class EmailThread(TimeStampedModel):
    """Groups related email messages into a conversation thread."""

    subject = models.CharField(_("subject"), max_length=500, blank=True, default="")
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_threads",
        verbose_name=_("contact"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_threads",
        verbose_name=_("case"),
    )
    last_message_at = models.DateTimeField(_("last message at"), null=True, blank=True)
    message_count = models.PositiveIntegerField(_("message count"), default=0)
    is_archived = models.BooleanField(_("archived"), default=False)

    class Meta:
        db_table = "crm_email_threads"
        ordering = ["-last_message_at"]
        verbose_name = _("email thread")
        verbose_name_plural = _("email threads")

    def __str__(self):
        return self.subject or "(no subject)"


# ---------------------------------------------------------------------------
# Email Message
# ---------------------------------------------------------------------------
class EmailMessage(TimeStampedModel):
    """A single email message (inbound or outbound)."""

    class Direction(models.TextChoices):
        INBOUND = "inbound", _("Inbound")
        OUTBOUND = "outbound", _("Outbound")

    class Folder(models.TextChoices):
        INBOX = "inbox", _("Inbox")
        SENT = "sent", _("Sent")
        DRAFTS = "drafts", _("Drafts")
        TRASH = "trash", _("Trash")

    account = models.ForeignKey(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("account"),
    )
    thread = models.ForeignKey(
        EmailThread,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
        verbose_name=_("thread"),
    )
    message_id = models.CharField(
        _("Message-ID header"), max_length=500, unique=True, db_index=True
    )
    in_reply_to = models.CharField(
        _("In-Reply-To header"), max_length=500, blank=True, default=""
    )
    references = models.TextField(_("References header"), blank=True, default="")
    direction = models.CharField(
        _("direction"),
        max_length=10,
        choices=Direction.choices,
        db_index=True,
    )
    from_address = models.EmailField(_("from"))
    to_addresses = models.JSONField(_("to"), default=list)
    cc_addresses = models.JSONField(_("cc"), default=list, blank=True)
    bcc_addresses = models.JSONField(_("bcc"), default=list, blank=True)
    subject = models.CharField(_("subject"), max_length=500, blank=True, default="")
    body_text = models.TextField(_("body (plain text)"), blank=True, default="")
    sent_at = models.DateTimeField(_("sent at"), null=True, blank=True, db_index=True)

    is_read = models.BooleanField(_("read"), default=False)
    is_starred = models.BooleanField(_("starred"), default=False)

    folder = models.CharField(
        _("folder"),
        max_length=20,
        choices=Folder.choices,
        default=Folder.INBOX,
        db_index=True,
    )
    imap_uid = models.CharField(_("IMAP UID"), max_length=100, blank=True, default="")
    raw_headers = models.JSONField(_("raw headers"), default=dict, blank=True)

    # Relationships
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails",
        verbose_name=_("contact"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails",
        verbose_name=_("case"),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_emails",
        verbose_name=_("assigned to"),
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_emails",
        verbose_name=_("sent by"),
    )

    class Meta:
        db_table = "crm_email_messages"
        ordering = ["-sent_at"]
        verbose_name = _("email message")
        verbose_name_plural = _("email messages")
        indexes = [
            models.Index(fields=["account", "folder", "-sent_at"]),
            models.Index(fields=["contact", "-sent_at"]),
            models.Index(fields=["case", "-sent_at"]),
        ]

    def __str__(self):
        return f"{self.direction}: {self.subject}"


# ---------------------------------------------------------------------------
# Email Attachment
# ---------------------------------------------------------------------------
class EmailAttachment(TimeStampedModel):
    """A file attached to an email message."""

    email = models.ForeignKey(
        EmailMessage,
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name=_("email"),
    )
    file = models.FileField(_("file"), upload_to="email_attachments/%Y/%m/")
    filename = models.CharField(_("filename"), max_length=255)
    mime_type = models.CharField(_("MIME type"), max_length=100, blank=True, default="")
    file_size = models.PositiveIntegerField(_("file size (bytes)"), default=0)

    # Optional link to a CRM document
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_attachments",
        verbose_name=_("linked document"),
    )

    class Meta:
        db_table = "crm_email_attachments"
        verbose_name = _("email attachment")
        verbose_name_plural = _("email attachments")

    def __str__(self):
        return self.filename


# ---------------------------------------------------------------------------
# Email Template (plain text)
# ---------------------------------------------------------------------------
class EmailTemplate(TimeStampedModel):
    """A reusable plain-text email template with {{variable}} placeholders."""

    name = models.CharField(_("template name"), max_length=200, unique=True)
    subject = models.CharField(_("subject"), max_length=500)
    body_text = models.TextField(_("body (plain text)"))
    variables = models.JSONField(
        _("available variables"),
        default=list,
        blank=True,
        help_text=_(
            "List of placeholder variable names, e.g. ['contact_name', 'case_number']"
        ),
    )
    is_active = models.BooleanField(_("active"), default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_templates",
        verbose_name=_("created by"),
    )

    class Meta:
        db_table = "crm_email_templates"
        verbose_name = _("email template")
        verbose_name_plural = _("email templates")

    def __str__(self):
        return self.name

    def render(self, context: dict) -> tuple[str, str]:
        """Render subject and body by substituting {{variable}} placeholders."""
        subject = self.subject
        body = self.body_text
        for key, value in context.items():
            placeholder = "{{" + key + "}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        return subject, body


# ---------------------------------------------------------------------------
# Email Sync Log
# ---------------------------------------------------------------------------
class EmailSyncLog(TimeStampedModel):
    """Log entry for each IMAP sync operation."""

    class Status(models.TextChoices):
        SUCCESS = "success", _("Success")
        ERROR = "error", _("Error")

    account = models.ForeignKey(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="sync_logs",
        verbose_name=_("account"),
    )
    status = models.CharField(
        _("status"),
        max_length=10,
        choices=Status.choices,
        db_index=True,
    )
    messages_fetched = models.PositiveIntegerField(_("messages fetched"), default=0)
    error_message = models.TextField(_("error message"), blank=True, default="")
    started_at = models.DateTimeField(_("started at"))
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)

    class Meta:
        db_table = "crm_email_sync_logs"
        ordering = ["-started_at"]
        verbose_name = _("email sync log")
        verbose_name_plural = _("email sync logs")

    def __str__(self):
        return f"{self.account} — {self.status} ({self.started_at:%Y-%m-%d %H:%M})"


# ---------------------------------------------------------------------------
# Email Settings (singleton — one row for the entire CRM)
# ---------------------------------------------------------------------------
class EmailSettings(TimeStampedModel):
    """Global email configuration settings for the CRM (singleton)."""

    class ServerType(models.TextChoices):
        GMAIL = "gmail", "Gmail"
        GSUITE = "gsuite", "GSuite"
        OFFICE365 = "office365", "Microsoft / Office365"
        YAHOO = "yahoo", "Yahoo"
        CUSTOM = "custom", "Custom SMTP"
        OTHER = "other", "Others"

    class ReplyToOption(models.TextChoices):
        PRIMARY_EMAIL = "primary_email", "User's Primary Email Address"
        GROUP_EMAIL = "group_email", "User's Primary Group Email"
        OUTGOING_EMAIL = "outgoing_email", "Outgoing Email Address"
        HELPDESK_EMAIL = "helpdesk_email", "Helpdesk Email"
        TICKET_EMAIL = "ticket_email", "Internal Ticket Email"
        OTHER = "other", "Other"

    class OptInType(models.TextChoices):
        DOUBLE_AND_SINGLE = "double_single", "Double opt-ins and Single User opt-ins"
        SINGLE = "single", "Single opt-in"
        NONE = "none", "None"

    # Mail Server Settings (SMTP)
    server_type = models.CharField(
        max_length=20, choices=ServerType.choices, default=ServerType.CUSTOM
    )
    smtp_host = models.CharField(max_length=255, blank=True, default="")
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True, default="")
    smtp_password = models.CharField(max_length=255, blank=True, default="")
    smtp_use_tls = models.BooleanField(default=True)

    # Email Tracking
    email_tracking_enabled = models.BooleanField(default=True)

    # Email Footer
    include_email_footer = models.BooleanField(default=True)
    email_footer_text = models.TextField(blank=True, default="")

    # Reply-to for Case replies
    case_reply_to = models.CharField(
        max_length=30,
        choices=ReplyToOption.choices,
        default=ReplyToOption.HELPDESK_EMAIL,
    )
    case_allow_group_value = models.BooleanField(default=False)
    case_bcc_address = models.EmailField(blank=True, default="")

    # Reply-to for Internal Ticket Emails
    ticket_reply_to = models.CharField(
        max_length=30, choices=ReplyToOption.choices, default=ReplyToOption.TICKET_EMAIL
    )
    ticket_reply_to_address = models.EmailField(blank=True, default="")
    ticket_from_name = models.CharField(max_length=255, blank=True, default="")
    ticket_bcc_address = models.EmailField(blank=True, default="")

    # Reply-to for Ad Hoc Emails
    adhoc_reply_to = models.CharField(
        max_length=30,
        choices=ReplyToOption.choices,
        default=ReplyToOption.OUTGOING_EMAIL,
    )

    # System Notifications to Users
    sys_notif_from_name = models.CharField(max_length=255, blank=True, default="")
    sys_notif_from_reply_to = models.EmailField(blank=True, default="")

    # Font
    email_font_family = models.CharField(max_length=100, default="Arial")
    email_font_size = models.PositiveIntegerField(default=14)

    # Required Opt-In for Email Delivery
    email_opt_in = models.CharField(
        max_length=20, choices=OptInType.choices, default=OptInType.DOUBLE_AND_SINGLE
    )
    allow_adhoc_opted_out = models.BooleanField(default=False)
    allow_workflow_opted_out = models.BooleanField(default=False)
    auto_double_opt_in = models.BooleanField(default=True)

    # System Notifications to Customers
    customer_notif_from_name = models.CharField(max_length=255, blank=True, default="")
    customer_notif_from_email = models.EmailField(blank=True, default="")

    # Undo Send
    undo_send_enabled = models.BooleanField(default=False)
    undo_send_duration = models.PositiveIntegerField(
        default=5, help_text="Undo send duration in seconds"
    )

    class Meta:
        db_table = "crm_email_settings"
        verbose_name = _("email settings")
        verbose_name_plural = _("email settings")

    def __str__(self):
        return "Email Settings"

    def save(self, *args, **kwargs):
        # Enforce singleton: always use pk=1
        self.pk = self.pk or 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
