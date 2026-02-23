import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Abstract base for all CRM entities."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Backup(TimeStampedModel):
    """
    Tracks backup operations for the CRM system.
    Supports both global (full database) and tenant (corporation-specific) backups.
    """

    class BackupType(models.TextChoices):
        GLOBAL = "global", _("Global Backup")
        TENANT = "tenant", _("Tenant Backup")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        FAILED = "failed", _("Failed")

    name = models.CharField(
        _("name"),
        max_length=255,
        help_text=_("Descriptive name for this backup"),
    )
    backup_type = models.CharField(
        _("backup type"),
        max_length=20,
        choices=BackupType.choices,
        db_index=True,
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # File information
    file_path = models.CharField(
        _("file path"),
        max_length=500,
        blank=True,
        default="",
        help_text=_("Path to the encrypted backup file"),
    )
    file_size = models.BigIntegerField(
        _("file size"),
        null=True,
        blank=True,
        help_text=_("File size in bytes"),
    )
    checksum = models.CharField(
        _("checksum"),
        max_length=64,
        blank=True,
        default="",
        help_text=_("SHA-256 checksum for integrity verification"),
    )

    # Tenant reference (null for global backups)
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="backups",
        verbose_name=_("corporation"),
        help_text=_("Corporation for tenant-specific backups"),
    )

    # Tracking
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_backups",
        verbose_name=_("created by"),
    )
    celery_task_id = models.CharField(
        _("Celery task ID"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("Celery task ID for tracking async operations"),
    )
    error_message = models.TextField(
        _("error message"),
        blank=True,
        default="",
        help_text=_("Error details if backup/restore failed"),
    )
    completed_at = models.DateTimeField(
        _("completed at"),
        null=True,
        blank=True,
    )
    include_media = models.BooleanField(
        _("include media"),
        default=True,
        help_text=_("Include media files in backup"),
    )

    class Meta:
        db_table = "crm_backups"
        ordering = ["-created_at"]
        verbose_name = _("backup")
        verbose_name_plural = _("backups")

    def __str__(self):
        return f"{self.name} ({self.get_backup_type_display()})"

    @property
    def file_size_human(self) -> str:
        """Return human-readable file size."""
        if not self.file_size:
            return "-"
        size = self.file_size
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
