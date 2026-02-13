from django.conf import settings

from apps.core.models import TimeStampedModel
from django.db import models


class WorkflowRule(TimeStampedModel):
    """Admin-configurable IF/THEN automation rule."""

    class TriggerType(models.TextChoices):
        CASE_STATUS_CHANGED = "case_status_changed", "Case Status Changed"
        CASE_CREATED = "case_created", "Case Created"
        DOCUMENT_UPLOADED = "document_uploaded", "Document Uploaded"
        DOCUMENT_MISSING_CHECK = "document_missing_check", "Document Missing Check"
        APPOINTMENT_REMINDER = "appointment_reminder", "Appointment Reminder"
        CASE_DUE_DATE_APPROACHING = (
            "case_due_date_approaching",
            "Case Due Date Approaching",
        )
        TASK_OVERDUE = "task_overdue", "Task Overdue"

    class ActionType(models.TextChoices):
        CREATE_TASK = "create_task", "Create Task"
        SEND_NOTIFICATION = "send_notification", "Send Notification"
        SEND_EMAIL = "send_email", "Send Email"
        UPDATE_FIELD = "update_field", "Update Field"

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)

    trigger_type = models.CharField(
        max_length=40, choices=TriggerType.choices, db_index=True
    )
    trigger_config = models.JSONField(default=dict, blank=True)

    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional extra filters, e.g. {\"case_type\": \"individual_1040\"}",
    )

    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    action_config = models.JSONField(default=dict)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_workflow_rules",
    )
    execution_count = models.PositiveIntegerField(default=0)
    last_executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.trigger_type} → {self.action_type})"


class WorkflowExecutionLog(TimeStampedModel):
    """Audit trail for workflow rule executions."""

    class Result(models.TextChoices):
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"

    rule = models.ForeignKey(
        WorkflowRule,
        on_delete=models.CASCADE,
        related_name="execution_logs",
    )
    triggered_at = models.DateTimeField(db_index=True)
    trigger_object_type = models.CharField(max_length=50, blank=True, default="")
    trigger_object_id = models.UUIDField(null=True, blank=True)
    action_taken = models.CharField(max_length=500, default="")
    result = models.CharField(
        max_length=10, choices=Result.choices, db_index=True
    )
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-triggered_at"]

    def __str__(self):
        return f"{self.rule.name} @ {self.triggered_at} — {self.result}"
