import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """
    Immutable audit trail for CRM entity changes.
    """

    class Action(models.TextChoices):
        CREATE = "create", _("Create")
        UPDATE = "update", _("Update")
        DELETE = "delete", _("Delete")
        VIEW = "view", _("View")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name=_("user"),
    )
    action = models.CharField(
        _("action"),
        max_length=10,
        choices=Action.choices,
        db_index=True,
    )
    module = models.CharField(_("module"), max_length=50, db_index=True)
    object_id = models.CharField(_("object ID"), max_length=50)
    object_repr = models.CharField(_("object representation"), max_length=255)
    changes = models.JSONField(_("changes"), default=dict, blank=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True, default="")
    request_path = models.CharField(
        _("request path"), max_length=500, blank=True, default=""
    )
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        db_table = "crm_audit_logs"
        ordering = ["-timestamp"]
        verbose_name = _("audit log")
        verbose_name_plural = _("audit logs")
        indexes = [
            models.Index(fields=["module", "object_id"]),
            models.Index(fields=["user", "timestamp"]),
        ]

    def __str__(self):
        return f"[{self.action}] {self.module}/{self.object_id} by {self.user}"


# ---------------------------------------------------------------------------
# Login History
# ---------------------------------------------------------------------------
class LoginHistory(models.Model):
    """Records every login attempt (success, failure, or blocked)."""

    class Status(models.TextChoices):
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")
        BLOCKED = "blocked", _("Blocked")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="login_history",
        verbose_name=_("user"),
    )
    email_attempted = models.EmailField(_("email attempted"))
    status = models.CharField(
        _("status"),
        max_length=10,
        choices=Status.choices,
        db_index=True,
    )
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True, default="")
    failure_reason = models.CharField(
        _("failure reason"), max_length=255, blank=True, default=""
    )
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        db_table = "crm_login_history"
        ordering = ["-timestamp"]
        verbose_name = _("login history")
        verbose_name_plural = _("login histories")
        indexes = [
            models.Index(fields=["user", "timestamp"]),
        ]

    def __str__(self):
        return f"[{self.status}] {self.email_attempted} at {self.timestamp}"


# ---------------------------------------------------------------------------
# Settings Log
# ---------------------------------------------------------------------------
class SettingsLog(models.Model):
    """Audit trail for admin configuration changes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settings_logs",
        verbose_name=_("user"),
    )
    setting_area = models.CharField(_("setting area"), max_length=100)
    setting_key = models.CharField(_("setting key"), max_length=100)
    old_value = models.JSONField(_("old value"), default=dict, blank=True)
    new_value = models.JSONField(_("new value"), default=dict, blank=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True, default="")
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        db_table = "crm_settings_logs"
        ordering = ["-timestamp"]
        verbose_name = _("settings log")
        verbose_name_plural = _("settings logs")

    def __str__(self):
        return f"{self.setting_area}.{self.setting_key} by {self.user}"


# ---------------------------------------------------------------------------
# Encrypted Field Access Log
# ---------------------------------------------------------------------------
class EncryptedFieldAccessLog(models.Model):
    """Tracks access to PII / sensitive fields."""

    class AccessType(models.TextChoices):
        VIEW = "view", _("View")
        EXPORT = "export", _("Export")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pii_access_logs",
        verbose_name=_("user"),
    )
    module = models.CharField(_("module"), max_length=50)
    object_id = models.CharField(_("object ID"), max_length=50)
    field_name = models.CharField(_("field name"), max_length=100)
    access_type = models.CharField(
        _("access type"),
        max_length=10,
        choices=AccessType.choices,
    )
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        db_table = "crm_encrypted_field_access_logs"
        ordering = ["-timestamp"]
        verbose_name = _("encrypted field access log")
        verbose_name_plural = _("encrypted field access logs")
        indexes = [
            models.Index(fields=["module", "object_id"]),
            models.Index(fields=["user", "timestamp"]),
        ]

    def __str__(self):
        return f"[{self.access_type}] {self.module}.{self.field_name} by {self.user}"
