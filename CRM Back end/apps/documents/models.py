import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Document Folder
# ---------------------------------------------------------------------------
class DocumentFolder(TimeStampedModel):
    """Hierarchical folder structure for organising documents."""

    name = models.CharField(_("name"), max_length=255)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name=_("parent folder"),
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="document_folders",
        verbose_name=_("owner"),
    )
    description = models.TextField(_("description"), blank=True, default="")
    is_default = models.BooleanField(
        _("default folder"),
        default=False,
        help_text=_("System folders cannot be deleted."),
    )

    class Meta:
        db_table = "crm_document_folders"
        ordering = ["name"]
        verbose_name = _("document folder")
        verbose_name_plural = _("document folders")
        constraints = [
            models.UniqueConstraint(
                fields=["name", "parent"],
                name="unique_folder_name_per_parent",
            ),
        ]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Document Tag
# ---------------------------------------------------------------------------
class DocumentTag(TimeStampedModel):
    """Colour-coded tag that can be shared or personal."""

    class TagType(models.TextChoices):
        SHARED = "shared", _("Shared")
        PERSONAL = "personal", _("Personal")

    name = models.CharField(_("name"), max_length=100)
    color = models.CharField(_("color"), max_length=7, default="#6366f1")
    tag_type = models.CharField(
        _("tag type"),
        max_length=10,
        choices=TagType.choices,
        default=TagType.SHARED,
        db_index=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="document_tags",
        verbose_name=_("owner"),
        help_text=_("Null for shared tags."),
    )

    class Meta:
        db_table = "crm_document_tags"
        ordering = ["name"]
        verbose_name = _("document tag")
        verbose_name_plural = _("document tags")

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------
class Document(TimeStampedModel):
    """
    Represents a file document attached to a contact, corporation, or case.
    """

    class DocType(models.TextChoices):
        W2 = "w2", _("W-2")
        FORM_1099 = "1099", _("1099")
        TAX_RETURN = "tax_return", _("Tax Return")
        ID_DOCUMENT = "id_document", _("ID Document")
        BANK_STATEMENT = "bank_statement", _("Bank Statement")
        AUTHORIZATION = "authorization", _("Authorization")
        CORRESPONDENCE = "correspondence", _("Correspondence")
        RECEIPT = "receipt", _("Receipt")
        OTHER = "other", _("Other")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    title = models.CharField(_("title"), max_length=255)
    file = models.FileField(_("file"), upload_to="documents/%Y/%m/")
    doc_type = models.CharField(
        _("document type"),
        max_length=20,
        choices=DocType.choices,
        default=DocType.OTHER,
        db_index=True,
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    description = models.TextField(_("description"), blank=True, default="")
    file_size = models.PositiveIntegerField(_("file size (bytes)"), default=0)
    mime_type = models.CharField(_("MIME type"), max_length=100, blank=True, default="")
    version = models.PositiveIntegerField(_("version"), default=1)

    # --- Encryption ---
    is_encrypted = models.BooleanField(_("encrypted"), default=False)
    encryption_key_id = models.CharField(
        _("encryption key ID"),
        max_length=64,
        blank=True,
        default="",
        help_text=_("Identifier for the encryption key used."),
    )

    # --- Versioning ---
    parent_document = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="versions",
        verbose_name=_("parent document"),
        help_text=_("Previous version of this document."),
    )

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name=_("contact"),
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name=_("corporation"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name=_("case"),
    )
    folder = models.ForeignKey(
        DocumentFolder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name=_("folder"),
    )
    tags = models.ManyToManyField(
        DocumentTag,
        blank=True,
        related_name="documents",
        verbose_name=_("tags"),
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
        verbose_name=_("uploaded by"),
    )

    class Meta:
        db_table = "crm_documents"
        ordering = ["-created_at"]
        verbose_name = _("document")
        verbose_name_plural = _("documents")

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# Document Access Log
# ---------------------------------------------------------------------------
class DocumentAccessLog(TimeStampedModel):
    """
    Tracks who accessed or downloaded a document and when.
    """

    class Action(models.TextChoices):
        VIEW = "view", _("View")
        DOWNLOAD = "download", _("Download")

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="access_logs",
        verbose_name=_("document"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_access_logs",
        verbose_name=_("user"),
    )
    action = models.CharField(
        _("action"),
        max_length=10,
        choices=Action.choices,
    )
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True, default="")

    class Meta:
        db_table = "crm_document_access_logs"
        ordering = ["-created_at"]
        verbose_name = _("document access log")
        verbose_name_plural = _("document access logs")

    def __str__(self):
        return f"{self.user} {self.action} {self.document} at {self.created_at}"


# ---------------------------------------------------------------------------
# Document Link (external URL references)
# ---------------------------------------------------------------------------
class DocumentLink(TimeStampedModel):
    """An external URL reference stored alongside documents."""

    title = models.CharField(_("title"), max_length=255)
    url = models.URLField(_("URL"), max_length=2048)
    description = models.TextField(_("description"), blank=True, default="")
    folder = models.ForeignKey(
        DocumentFolder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="links",
        verbose_name=_("folder"),
    )
    tags = models.ManyToManyField(
        DocumentTag,
        blank=True,
        related_name="links",
        verbose_name=_("tags"),
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="document_links",
        verbose_name=_("contact"),
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="document_links",
        verbose_name=_("corporation"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="document_links",
        verbose_name=_("case"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="document_links",
        verbose_name=_("created by"),
    )

    class Meta:
        db_table = "crm_document_links"
        ordering = ["-created_at"]
        verbose_name = _("document link")
        verbose_name_plural = _("document links")

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# Document Download Token (Secure single-use download tokens)
# ---------------------------------------------------------------------------
class DocumentDownloadToken(models.Model):
    """
    Secure, single-use, short-lived tokens for document downloads.

    SECURITY: This replaces the insecure pattern of passing JWT tokens in URLs.
    - Tokens are 64-character cryptographic random strings
    - Tokens expire after 5 minutes (configurable)
    - Tokens are single-use and marked as used after first access
    - Tokens are tied to a specific document and user
    """

    TOKEN_EXPIRY_MINUTES = 5

    token = models.CharField(
        _("token"),
        max_length=64,
        unique=True,
        db_index=True,
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="download_tokens",
        verbose_name=_("document"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_download_tokens",
        verbose_name=_("user"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    expires_at = models.DateTimeField(_("expires at"))
    is_used = models.BooleanField(_("used"), default=False)
    used_at = models.DateTimeField(_("used at"), null=True, blank=True)
    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
        help_text=_("IP address that used this token"),
    )

    class Meta:
        db_table = "crm_document_download_tokens"
        ordering = ["-created_at"]
        verbose_name = _("document download token")
        verbose_name_plural = _("document download tokens")
        indexes = [
            models.Index(fields=["token", "is_used", "expires_at"]),
        ]

    def __str__(self):
        return f"Token for {self.document} by {self.user}"

    @classmethod
    def create_token(cls, document, user):
        """Generate a new secure download token."""
        token = secrets.token_urlsafe(48)  # 64 characters
        expires_at = timezone.now() + timedelta(minutes=cls.TOKEN_EXPIRY_MINUTES)

        return cls.objects.create(
            token=token,
            document=document,
            user=user,
            expires_at=expires_at,
        )

    def is_valid(self):
        """Check if token is still valid."""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True

    def mark_used(self, ip_address=None):
        """Mark token as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.ip_address = ip_address
        self.save(update_fields=["is_used", "used_at", "ip_address"])

    @classmethod
    def cleanup_expired(cls, days=7):
        """Remove tokens older than specified days."""
        cutoff = timezone.now() - timedelta(days=days)
        return cls.objects.filter(created_at__lt=cutoff).delete()
