import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """In-app notification delivered to a user."""

    class Type(models.TextChoices):
        WORKFLOW_TRIGGERED = "workflow_triggered", "Workflow Triggered"
        CASE_STATUS_CHANGED = "case_status_changed", "Case Status Changed"
        EMAIL_ASSIGNED = "email_assigned", "Email Assigned"
        EMAIL_NO_REPLY = "email_no_reply", "Email No Reply"
        APPOINTMENT_REMINDER = "appointment_reminder", "Appointment Reminder"
        TASK_OVERDUE = "task_overdue", "Task Overdue"
        DOCUMENT_MISSING = "document_missing", "Document Missing"
        CASE_DUE_DATE = "case_due_date", "Case Due Date"
        MENTION = "mention", "Mentioned in Comment"
        COMMENT_REPLY = "comment_reply", "Reply to Comment"
        CLIENT_MESSAGE = "client_message", "Client Portal Message"
        CLOSED_CORP_ACCESSED = "closed_corp_accessed", "Closed Corporation Accessed"
        PAUSED_CORP_ACCESSED = "paused_corp_accessed", "Paused Corporation Accessed"
        SYSTEM = "system", "System"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        SUCCESS = "success", "Success"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    notification_type = models.CharField(
        max_length=30, choices=Type.choices, db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.INFO
    )

    # Generic relation to any model
    related_object_type = models.CharField(max_length=50, blank=True, default="")
    related_object_id = models.UUIDField(null=True, blank=True)
    action_url = models.CharField(max_length=500, blank=True, default="")

    is_read = models.BooleanField(default=False, db_index=True)
    email_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read", "-created_at"],
                name="notif_recipient_read_idx",
            ),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title} → {self.recipient}"


class NotificationPreference(models.Model):
    """Per-user, per-type notification delivery preferences."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    notification_type = models.CharField(
        max_length=30, choices=Notification.Type.choices
    )
    in_app_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "notification_type")

    def __str__(self):
        return f"{self.user} — {self.notification_type}"
