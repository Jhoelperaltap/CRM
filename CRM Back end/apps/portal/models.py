import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

# Import models from separate files so Django can find them
from apps.portal.models_rental import *  # noqa: F401, F403
from apps.portal.models_commercial import *  # noqa: F401, F403
from apps.portal.models_admin import *  # noqa: F401, F403


class ClientPortalAccess(models.Model):
    """
    Separate authentication record for client portal users.
    Each portal account is linked to exactly one Contact.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.OneToOneField(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_access",
        verbose_name=_("contact"),
    )
    email = models.EmailField(_("email"), unique=True)
    password_hash = models.CharField(_("password hash"), max_length=255)
    is_active = models.BooleanField(_("active"), default=True)
    last_login = models.DateTimeField(_("last login"), null=True, blank=True)
    reset_token = models.CharField(
        _("reset token"), max_length=255, blank=True, default=""
    )
    reset_token_expires_at = models.DateTimeField(
        _("reset token expires"), null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_client_portal_access"
        verbose_name = _("client portal access")
        verbose_name_plural = _("client portal accesses")

    def __str__(self):
        return f"Portal: {self.email}"


class PortalMessage(models.Model):
    """
    Secure messaging between clients and staff via the portal.
    """

    class MessageType(models.TextChoices):
        CLIENT_TO_STAFF = "client_to_staff", _("Client to Staff")
        STAFF_TO_CLIENT = "staff_to_client", _("Staff to Client")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_messages",
        verbose_name=_("contact"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_messages",
        verbose_name=_("case"),
    )
    message_type = models.CharField(
        _("type"),
        max_length=20,
        choices=MessageType.choices,
    )
    subject = models.CharField(_("subject"), max_length=255)
    body = models.TextField(_("body"))
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_messages_sent",
        verbose_name=_("sender (staff)"),
    )
    parent_message = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
        verbose_name=_("parent message"),
    )
    is_read = models.BooleanField(_("read"), default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_portal_messages"
        ordering = ["-created_at"]
        verbose_name = _("portal message")
        verbose_name_plural = _("portal messages")

    def __str__(self):
        return f"{self.subject} ({self.message_type})"


class PortalDocumentUpload(models.Model):
    """
    Tracks documents uploaded by clients through the portal.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending Review")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_uploads",
        verbose_name=_("contact"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_uploads",
        verbose_name=_("case"),
    )
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.CASCADE,
        related_name="portal_upload",
        verbose_name=_("document"),
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_reviews",
        verbose_name=_("reviewed by"),
    )
    reviewed_at = models.DateTimeField(_("reviewed at"), null=True, blank=True)
    rejection_reason = models.TextField(_("rejection reason"), blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_portal_document_uploads"
        ordering = ["-created_at"]
        verbose_name = _("portal document upload")
        verbose_name_plural = _("portal document uploads")

    def __str__(self):
        return f"Upload: {self.document.title} ({self.status})"


# ============================================================================
# Portal Configuration Models
# ============================================================================


class PortalConfiguration(models.Model):
    """
    Global configuration for the customer portal.
    Only one active configuration should exist at a time.
    """

    class DefaultScope(models.TextChoices):
        ALL = "all", _("All")
        OWN = "own", _("Own Records Only")

    class SessionTimeout(models.TextChoices):
        ONE_HOUR = "1", _("1 hour(s)")
        TWO_HOURS = "2", _("2 hour(s)")
        FOUR_HOURS = "4", _("4 hour(s)")
        EIGHT_HOURS = "8", _("8 hour(s)")
        TWELVE_HOURS = "12", _("12 hour(s)")
        TWENTY_FOUR_HOURS = "24", _("24 hour(s)")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portal_url = models.URLField(
        _("portal URL"),
        max_length=500,
        blank=True,
        default="",
        help_text=_("The public URL of the customer portal."),
    )
    default_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_default_assignee",
        verbose_name=_("default assignee"),
    )
    support_notification_days = models.PositiveIntegerField(
        _("contact support notification (days before)"),
        default=7,
        help_text=_("Days before expiration to notify support."),
    )
    login_details_template = models.CharField(
        _("login details template"),
        max_length=255,
        blank=True,
        default="Customer Portal Login Link",
    )
    forgot_password_template = models.CharField(
        _("forgot password template"),
        max_length=255,
        blank=True,
        default="Customer Portal Forgot Password Reset Link",
    )
    custom_css_url = models.URLField(
        _("CSS URL for custom theme"),
        max_length=500,
        blank=True,
        default="",
    )
    default_scope = models.CharField(
        _("default scope"),
        max_length=20,
        choices=DefaultScope.choices,
        default=DefaultScope.ALL,
    )
    session_timeout_hours = models.CharField(
        _("inactive portal session logout interval"),
        max_length=5,
        choices=SessionTimeout.choices,
        default=SessionTimeout.FOUR_HOURS,
    )
    # Home Layout settings
    announcement_html = models.TextField(
        _("announcement"),
        blank=True,
        default="",
    )
    greeting_type = models.CharField(
        _("greeting type"),
        max_length=20,
        choices=[
            ("standard", _("Standard greeting")),
            ("time_based", _("Time based greeting")),
        ],
        default="standard",
    )
    # Widget toggles
    account_rep_widget_enabled = models.BooleanField(
        _("account representatives widget enabled"),
        default=False,
    )
    recent_documents_widget_enabled = models.BooleanField(
        _("recent documents record widget enabled"),
        default=True,
    )
    recent_faq_widget_enabled = models.BooleanField(
        _("recent FAQ record widget enabled"),
        default=True,
    )
    recent_cases_widget_enabled = models.BooleanField(
        _("recent cases record widget enabled"),
        default=True,
    )
    # Chart toggles
    chart_open_cases_priority = models.BooleanField(
        _("chart: open cases by priority"),
        default=True,
    )
    chart_cases_resolution_time = models.BooleanField(
        _("chart: cases resolution time by priority"),
        default=True,
    )
    chart_projects_by_status = models.BooleanField(
        _("chart: projects by status"),
        default=False,
    )
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_portal_configuration"
        verbose_name = _("portal configuration")
        verbose_name_plural = _("portal configurations")

    def __str__(self):
        return f"Portal Configuration (Active: {self.is_active})"

    def save(self, *args, **kwargs):
        # Ensure only one active configuration
        if self.is_active:
            PortalConfiguration.objects.filter(is_active=True).exclude(
                pk=self.pk
            ).update(is_active=False)
        super().save(*args, **kwargs)


class PortalMenuItem(models.Model):
    """
    Menu items available in the portal sidebar.
    Controls which modules are visible to portal users.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    configuration = models.ForeignKey(
        PortalConfiguration,
        on_delete=models.CASCADE,
        related_name="menu_items",
        verbose_name=_("configuration"),
    )
    module_name = models.CharField(
        _("module name"),
        max_length=100,
        help_text=_("Internal module identifier, e.g., 'cases', 'invoices'."),
    )
    label = models.CharField(
        _("label"),
        max_length=100,
        help_text=_("Display label in the portal menu."),
    )
    is_enabled = models.BooleanField(_("enabled"), default=True)
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_portal_menu_items"
        ordering = ["sort_order"]
        unique_together = [("configuration", "module_name")]
        verbose_name = _("portal menu item")
        verbose_name_plural = _("portal menu items")

    def __str__(self):
        return f"{self.label} ({self.module_name})"


class PortalShortcut(models.Model):
    """
    Shortcut links displayed on the portal home page.
    """

    class ShortcutType(models.TextChoices):
        ADD_DOCUMENT = "add_document", _("Add Document")
        CREATE_CASE = "create_case", _("Create Case")
        OPEN_CASES = "open_cases", _("Open Cases")
        CUSTOM = "custom", _("Custom Link")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    configuration = models.ForeignKey(
        PortalConfiguration,
        on_delete=models.CASCADE,
        related_name="shortcuts",
        verbose_name=_("configuration"),
    )
    shortcut_type = models.CharField(
        _("shortcut type"),
        max_length=50,
        choices=ShortcutType.choices,
    )
    label = models.CharField(_("label"), max_length=100)
    custom_url = models.CharField(
        _("custom URL"),
        max_length=500,
        blank=True,
        default="",
    )
    is_enabled = models.BooleanField(_("enabled"), default=True)
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_portal_shortcuts"
        ordering = ["sort_order"]
        verbose_name = _("portal shortcut")
        verbose_name_plural = _("portal shortcuts")

    def __str__(self):
        return self.label


class PortalModuleFieldConfig(models.Model):
    """
    Field-level configuration for portal profile layout.
    Controls which fields are visible and editable per module (Contacts, Organizations).
    """

    class Permission(models.TextChoices):
        HIDDEN = "hidden", _("Hidden")
        READ_ONLY = "read_only", _("Read Only")
        READ_WRITE = "read_write", _("Read and Write")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    configuration = models.ForeignKey(
        PortalConfiguration,
        on_delete=models.CASCADE,
        related_name="field_configs",
        verbose_name=_("configuration"),
    )
    module_name = models.CharField(
        _("module name"),
        max_length=100,
        help_text=_("Module: 'contacts' or 'organizations'."),
    )
    field_name = models.CharField(
        _("field name"),
        max_length=100,
    )
    field_label = models.CharField(
        _("field label"),
        max_length=100,
    )
    permission = models.CharField(
        _("permission"),
        max_length=20,
        choices=Permission.choices,
        default=Permission.READ_ONLY,
    )
    is_mandatory = models.BooleanField(
        _("mandatory"),
        default=False,
    )
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_portal_module_field_configs"
        ordering = ["module_name", "sort_order"]
        unique_together = [("configuration", "module_name", "field_name")]
        verbose_name = _("portal module field config")
        verbose_name_plural = _("portal module field configs")

    def __str__(self):
        return f"{self.module_name}.{self.field_name} ({self.permission})"


class PortalNotification(models.Model):
    """
    Notifications for portal clients.
    These are separate from staff notifications and are shown in the mobile app.
    """

    class Type(models.TextChoices):
        NEW_MESSAGE = "new_message", _("New Message")
        CASE_UPDATE = "case_update", _("Case Update")
        DOCUMENT_STATUS = "document_status", _("Document Status")
        APPOINTMENT_REMINDER = "appointment_reminder", _("Appointment Reminder")
        SYSTEM = "system", _("System")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_notifications",
        verbose_name=_("contact"),
    )
    notification_type = models.CharField(
        _("type"),
        max_length=30,
        choices=Type.choices,
    )
    title = models.CharField(_("title"), max_length=255)
    message = models.TextField(_("message"), blank=True, default="")
    is_read = models.BooleanField(_("read"), default=False)

    # Related entities for navigation
    related_message = models.ForeignKey(
        "portal.PortalMessage",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="portal_notifications",
    )
    related_appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="portal_notifications",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_portal_notifications"
        ordering = ["-created_at"]
        verbose_name = _("portal notification")
        verbose_name_plural = _("portal notifications")
        indexes = [
            models.Index(fields=["contact", "is_read", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.notification_type})"


class PortalDeviceToken(models.Model):
    """
    Push notification device tokens for portal mobile app users.
    Stores Expo push tokens for sending notifications to mobile devices.
    """

    class Platform(models.TextChoices):
        IOS = "ios", _("iOS")
        ANDROID = "android", _("Android")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="device_tokens",
        verbose_name=_("contact"),
    )
    token = models.CharField(
        _("push token"),
        max_length=500,
        unique=True,
        help_text=_("Expo push notification token"),
    )
    platform = models.CharField(
        _("platform"),
        max_length=20,
        choices=Platform.choices,
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Whether this device should receive notifications"),
    )
    last_used_at = models.DateTimeField(
        _("last used"),
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_portal_device_tokens"
        verbose_name = _("portal device token")
        verbose_name_plural = _("portal device tokens")
        indexes = [
            models.Index(fields=["contact", "is_active"]),
        ]

    def __str__(self):
        return f"Device: {self.contact} ({self.platform})"


# ============================================================================
# Billing Portal Access
# ============================================================================


class BillingPortalAccess(models.Model):
    """
    Grants billing/invoicing capabilities to a portal user.
    Links a ClientPortalAccess to a Corporation (tenant) and defines
    granular permissions for the billing module.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portal_access = models.OneToOneField(
        ClientPortalAccess,
        on_delete=models.CASCADE,
        related_name="billing_access",
        verbose_name=_("portal access"),
    )
    tenant = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.CASCADE,
        related_name="billing_portal_accesses",
        verbose_name=_("tenant corporation"),
        help_text=_("The corporation this billing access is scoped to."),
    )

    # Granular permissions
    can_manage_products = models.BooleanField(
        _("can manage products"),
        default=True,
        help_text=_("Create, edit, delete products in inventory."),
    )
    can_manage_services = models.BooleanField(
        _("can manage services"),
        default=True,
        help_text=_("Create, edit, delete services in inventory."),
    )
    can_create_invoices = models.BooleanField(
        _("can create invoices"),
        default=True,
        help_text=_("Create and manage invoices."),
    )
    can_create_quotes = models.BooleanField(
        _("can create quotes"),
        default=True,
        help_text=_("Create and manage quotes/estimates."),
    )
    can_view_reports = models.BooleanField(
        _("can view reports"),
        default=True,
        help_text=_("View billing dashboard and reports."),
    )

    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_billing_portal_access"
        verbose_name = _("billing portal access")
        verbose_name_plural = _("billing portal accesses")

    def __str__(self):
        return f"Billing: {self.portal_access.email} -> {self.tenant.name}"
