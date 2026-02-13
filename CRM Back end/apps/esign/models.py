from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class EsignDocument(TimeStampedModel):
    """
    An electronic-signature request.  Contains one document (uploaded file,
    internal CRM document reference, or related-module reference) that one
    or more signees must sign.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SENT = "sent", _("Sent")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        DECLINED = "declined", _("Declined")
        VOIDED = "voided", _("Voided")
        EXPIRED = "expired", _("Expired")

    class DocumentSource(models.TextChoices):
        UPLOAD = "upload", _("Upload File")
        INTERNAL = "internal", _("Internal Document")
        RELATED = "related", _("Related Module")

    # --- Core fields ---
    title = models.CharField(_("title"), max_length=255, blank=True, default="")
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    # --- Document source ---
    document_source = models.CharField(
        _("document source"),
        max_length=10,
        choices=DocumentSource.choices,
        default=DocumentSource.UPLOAD,
    )
    file = models.FileField(
        _("uploaded file"),
        upload_to="esign/%Y/%m/",
        blank=True,
        null=True,
    )
    internal_document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="esign_requests",
        verbose_name=_("internal document"),
    )
    related_module = models.CharField(
        _("related module"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("Module name when source is 'related'."),
    )
    related_record_id = models.UUIDField(
        _("related record ID"),
        null=True,
        blank=True,
    )

    # --- Email details ---
    email_subject = models.CharField(_("email subject"), max_length=255)
    email_note = models.TextField(_("email note"), blank=True, default="")

    # --- Meta ---
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="esign_documents",
        verbose_name=_("created by"),
    )
    sent_at = models.DateTimeField(_("sent at"), null=True, blank=True)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)
    expires_at = models.DateTimeField(_("expires at"), null=True, blank=True)

    class Meta:
        db_table = "crm_esign_documents"
        ordering = ["-created_at"]
        verbose_name = _("esign document")
        verbose_name_plural = _("esign documents")

    def __str__(self):
        return self.title or f"Esign #{str(self.id)[:8]}"


class EsignSignee(TimeStampedModel):
    """
    A single signee (recipient) on an esign document.  Can reference a CRM
    contact or just carry a raw email address.
    """

    class SigneeType(models.TextChoices):
        CONTACT = "contact", _("Contact")
        USER = "user", _("User")
        EXTERNAL = "external", _("External")

    class SigneeStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        SENT = "sent", _("Sent")
        VIEWED = "viewed", _("Viewed")
        SIGNED = "signed", _("Signed")
        DECLINED = "declined", _("Declined")

    esign_document = models.ForeignKey(
        EsignDocument,
        on_delete=models.CASCADE,
        related_name="signees",
        verbose_name=_("esign document"),
    )
    order = models.PositiveSmallIntegerField(
        _("signing order"),
        default=1,
    )

    # --- Who ---
    signee_type = models.CharField(
        _("signee type"),
        max_length=10,
        choices=SigneeType.choices,
        default=SigneeType.CONTACT,
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="esign_signees",
        verbose_name=_("contact"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="esign_signees",
        verbose_name=_("user"),
    )
    recipient_email = models.EmailField(_("recipient email"), blank=True, default="")

    # --- Signature tracking ---
    status = models.CharField(
        _("status"),
        max_length=10,
        choices=SigneeStatus.choices,
        default=SigneeStatus.PENDING,
        db_index=True,
    )
    signed_at = models.DateTimeField(_("signed at"), null=True, blank=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)

    class Meta:
        db_table = "crm_esign_signees"
        ordering = ["order", "created_at"]
        verbose_name = _("esign signee")
        verbose_name_plural = _("esign signees")

    def __str__(self):
        return self.recipient_email or f"Signee #{self.order}"
