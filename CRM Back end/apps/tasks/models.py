from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Task(TimeStampedModel):
    """
    Internal task / to-do item that can be linked to cases and contacts.
    """

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        URGENT = "urgent", _("Urgent")

    class Status(models.TextChoices):
        TODO = "todo", _("To Do")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    title = models.CharField(_("title"), max_length=255)
    description = models.TextField(_("description"), blank=True, default="")

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
        verbose_name=_("assigned to"),
    )
    assigned_group = models.ForeignKey(
        "users.UserGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
        verbose_name=_("assigned group"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tasks",
        verbose_name=_("created by"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name=_("case"),
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name=_("contact"),
    )

    priority = models.CharField(
        _("priority"),
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.TODO,
        db_index=True,
    )
    due_date = models.DateField(_("due date"), null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)

    # --- SLA tracking ---
    sla_hours = models.PositiveIntegerField(
        _("SLA hours"),
        null=True,
        blank=True,
        help_text=_("Expected resolution time in hours."),
    )
    sla_breached_at = models.DateTimeField(
        _("SLA breached at"),
        null=True,
        blank=True,
        help_text=_("Timestamp when the SLA was breached."),
    )

    class Meta:
        db_table = "crm_tasks"
        ordering = ["-created_at"]
        verbose_name = _("task")
        verbose_name_plural = _("tasks")

    def __str__(self):
        return self.title
