"""
Portal Administration models.

Models for managing client portal access, module configuration,
session tracking, and admin impersonation.
"""

import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class PortalModulePreset(TimeStampedModel):
    """
    Predefined module configuration templates.

    Allows admins to quickly apply a set of modules to clients
    (e.g., "Full", "Basic", "Real Estate").
    """

    name = models.CharField(
        _("preset name"),
        max_length=100,
        unique=True,
        help_text=_("Display name for this preset (e.g., 'Full', 'Basic')"),
    )
    description = models.TextField(
        _("description"),
        blank=True,
        default="",
        help_text=_("Description of what this preset includes"),
    )

    # Module configuration for this preset
    module_dashboard = models.BooleanField(_("dashboard"), default=False)
    module_billing = models.BooleanField(_("billing"), default=False)
    module_messages = models.BooleanField(_("messages"), default=False)
    module_documents = models.BooleanField(_("documents"), default=False)
    module_cases = models.BooleanField(_("cases"), default=False)
    module_rentals = models.BooleanField(_("rentals"), default=False)
    module_buildings = models.BooleanField(_("buildings"), default=False)
    module_appointments = models.BooleanField(_("appointments"), default=False)

    # System flags
    is_system = models.BooleanField(
        _("system preset"),
        default=False,
        help_text=_("System presets cannot be deleted"),
    )
    is_default = models.BooleanField(
        _("default preset"),
        default=False,
        help_text=_("Default preset for new clients"),
    )

    class Meta:
        db_table = "crm_portal_module_presets"
        ordering = ["-is_system", "name"]
        verbose_name = _("portal module preset")
        verbose_name_plural = _("portal module presets")

    def __str__(self):
        return self.name

    def get_enabled_modules(self) -> list[str]:
        """Return list of enabled module names."""
        modules = []
        if self.module_dashboard:
            modules.append("dashboard")
        if self.module_billing:
            modules.append("billing")
        if self.module_messages:
            modules.append("messages")
        if self.module_documents:
            modules.append("documents")
        if self.module_cases:
            modules.append("cases")
        if self.module_rentals:
            modules.append("rentals")
        if self.module_buildings:
            modules.append("buildings")
        if self.module_appointments:
            modules.append("appointments")
        return modules

    def save(self, *args, **kwargs):
        # Ensure only one default preset
        if self.is_default:
            PortalModulePreset.objects.filter(is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)


class PortalClientConfig(TimeStampedModel):
    """
    Per-client portal configuration.

    Controls which modules a client can access and their portal status.
    All modules are disabled by default - admin must activate.
    """

    contact = models.OneToOneField(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_config",
        verbose_name=_("contact"),
    )

    # Applied preset (for reference, actual modules are stored below)
    preset = models.ForeignKey(
        PortalModulePreset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients",
        verbose_name=_("applied preset"),
    )

    # Module access (all False by default - admin must enable)
    module_dashboard = models.BooleanField(_("dashboard"), default=False)
    module_billing = models.BooleanField(_("billing"), default=False)
    module_messages = models.BooleanField(_("messages"), default=False)
    module_documents = models.BooleanField(_("documents"), default=False)
    module_cases = models.BooleanField(_("cases"), default=False)
    module_rentals = models.BooleanField(_("rentals"), default=False)
    module_buildings = models.BooleanField(_("buildings"), default=False)
    module_appointments = models.BooleanField(_("appointments"), default=False)

    # Portal access status
    is_portal_active = models.BooleanField(
        _("portal active"),
        default=False,
        help_text=_("Whether the client can access the portal"),
    )

    # Activity tracking
    last_login = models.DateTimeField(
        _("last login"),
        null=True,
        blank=True,
    )
    last_activity = models.DateTimeField(
        _("last activity"),
        null=True,
        blank=True,
    )

    # Admin notes
    notes = models.TextField(
        _("admin notes"),
        blank=True,
        default="",
    )

    # Licensing limits (0 = unlimited)
    max_buildings = models.PositiveIntegerField(
        _("max buildings"),
        default=0,
        help_text=_("Maximum commercial buildings (0 = unlimited)"),
    )
    max_floors_per_building = models.PositiveIntegerField(
        _("max floors per building"),
        default=0,
        help_text=_("Maximum floors per building (0 = unlimited)"),
    )
    max_units_per_building = models.PositiveIntegerField(
        _("max units per building"),
        default=0,
        help_text=_("Maximum units per building (0 = unlimited)"),
    )
    max_rental_properties = models.PositiveIntegerField(
        _("max rental properties"),
        default=0,
        help_text=_("Maximum residential rental properties (0 = unlimited)"),
    )

    class Meta:
        db_table = "crm_portal_client_configs"
        verbose_name = _("portal client configuration")
        verbose_name_plural = _("portal client configurations")

    def __str__(self):
        return f"Portal config for {self.contact}"

    def get_enabled_modules(self) -> list[str]:
        """Return list of enabled module names."""
        modules = []
        if self.module_dashboard:
            modules.append("dashboard")
        if self.module_billing:
            modules.append("billing")
        if self.module_messages:
            modules.append("messages")
        if self.module_documents:
            modules.append("documents")
        if self.module_cases:
            modules.append("cases")
        if self.module_rentals:
            modules.append("rentals")
        if self.module_buildings:
            modules.append("buildings")
        if self.module_appointments:
            modules.append("appointments")
        return modules

    def apply_preset(self, preset: PortalModulePreset) -> None:
        """Apply a preset's module configuration to this client."""
        self.preset = preset
        self.module_dashboard = preset.module_dashboard
        self.module_billing = preset.module_billing
        self.module_messages = preset.module_messages
        self.module_documents = preset.module_documents
        self.module_cases = preset.module_cases
        self.module_rentals = preset.module_rentals
        self.module_buildings = preset.module_buildings
        self.module_appointments = preset.module_appointments
        self.save()

    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login = timezone.now()
        self.last_activity = timezone.now()
        self.save(update_fields=["last_login", "last_activity", "updated_at"])

    def update_last_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = timezone.now()
        self.save(update_fields=["last_activity", "updated_at"])


class PortalSession(TimeStampedModel):
    """
    Active portal sessions.

    Tracks client login sessions for monitoring and forced logout.
    """

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_sessions",
        verbose_name=_("contact"),
    )
    session_key = models.CharField(
        _("session key"),
        max_length=255,
        help_text=_("Session identifier or JWT token ID"),
    )
    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
    )
    user_agent = models.TextField(
        _("user agent"),
        blank=True,
        default="",
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
    )
    last_activity = models.DateTimeField(
        _("last activity"),
        auto_now=True,
    )
    logged_out_at = models.DateTimeField(
        _("logged out at"),
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "crm_portal_sessions"
        ordering = ["-last_activity"]
        verbose_name = _("portal session")
        verbose_name_plural = _("portal sessions")

    def __str__(self):
        status = "active" if self.is_active else "inactive"
        return f"Session for {self.contact} ({status})"

    def end_session(self) -> None:
        """Mark session as ended."""
        self.is_active = False
        self.logged_out_at = timezone.now()
        self.save(update_fields=["is_active", "logged_out_at", "updated_at"])


class PortalAdminLog(TimeStampedModel):
    """
    Audit log for portal administration actions.

    Records all admin actions on client portal configurations.
    """

    class Action(models.TextChoices):
        IMPERSONATE_START = "impersonate_start", _("Started impersonation")
        IMPERSONATE_END = "impersonate_end", _("Ended impersonation")
        TOGGLE_MODULE = "toggle_module", _("Toggled module")
        APPLY_PRESET = "apply_preset", _("Applied preset")
        TOGGLE_ACCESS = "toggle_access", _("Toggled portal access")
        FORCE_LOGOUT = "force_logout", _("Forced logout")
        RESET_PASSWORD = "reset_password", _("Reset password")
        VIEW_CLIENT = "view_client", _("Viewed client")
        UPDATE_CONFIG = "update_config", _("Updated configuration")

    admin_user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="portal_admin_logs",
        verbose_name=_("admin user"),
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="portal_admin_logs",
        verbose_name=_("contact"),
    )
    action = models.CharField(
        _("action"),
        max_length=50,
        choices=Action.choices,
    )
    details = models.JSONField(
        _("details"),
        default=dict,
        blank=True,
        help_text=_("Additional action details"),
    )
    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "crm_portal_admin_logs"
        ordering = ["-created_at"]
        verbose_name = _("portal admin log")
        verbose_name_plural = _("portal admin logs")
        indexes = [
            models.Index(fields=["contact", "-created_at"]),
            models.Index(fields=["admin_user", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.admin_user} - {self.get_action_display()} - {self.contact}"


class PortalImpersonationToken(TimeStampedModel):
    """
    Temporary token for admin impersonation of client accounts.

    Tokens expire after 1 hour and are single-use.
    """

    EXPIRATION_HOURS = 1

    admin_user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="impersonation_tokens",
        verbose_name=_("admin user"),
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="impersonation_tokens",
        verbose_name=_("contact"),
    )
    token = models.CharField(
        _("token"),
        max_length=255,
        unique=True,
    )
    expires_at = models.DateTimeField(
        _("expires at"),
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
    )
    ended_at = models.DateTimeField(
        _("ended at"),
        null=True,
        blank=True,
    )
    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "crm_portal_impersonation_tokens"
        ordering = ["-created_at"]
        verbose_name = _("portal impersonation token")
        verbose_name_plural = _("portal impersonation tokens")

    def __str__(self):
        status = "active" if self.is_active and not self.is_expired else "expired"
        return f"Impersonation: {self.admin_user} → {self.contact} ({status})"

    @classmethod
    def generate_token(cls) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)

    @classmethod
    def create_for_admin(
        cls,
        admin_user,
        contact,
        ip_address: str | None = None,
    ) -> "PortalImpersonationToken":
        """Create a new impersonation token for an admin."""
        # Invalidate any existing active tokens for this admin
        cls.objects.filter(admin_user=admin_user, is_active=True).update(
            is_active=False,
            ended_at=timezone.now(),
        )

        return cls.objects.create(
            admin_user=admin_user,
            contact=contact,
            token=cls.generate_token(),
            expires_at=timezone.now() + timedelta(hours=cls.EXPIRATION_HOURS),
            ip_address=ip_address,
        )

    @property
    def is_expired(self) -> bool:
        """Check if token has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        """Check if token is still valid (active and not expired)."""
        return self.is_active and not self.is_expired

    def end_impersonation(self) -> None:
        """End the impersonation session."""
        self.is_active = False
        self.ended_at = timezone.now()
        self.save(update_fields=["is_active", "ended_at", "updated_at"])

    def get_remaining_minutes(self) -> int:
        """Get remaining minutes until expiration."""
        if self.is_expired:
            return 0
        delta = self.expires_at - timezone.now()
        return max(0, int(delta.total_seconds() / 60))
