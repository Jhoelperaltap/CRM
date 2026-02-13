from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Approval(TimeStampedModel):
    """
    An approval automation definition.  When a record in the target module
    meets the entry criteria, approval rules are evaluated and the record
    enters an approval flow.
    """

    class Module(models.TextChoices):
        CASES = "cases", _("Cases")
        CONTACTS = "contacts", _("Contacts")
        CORPORATIONS = "corporations", _("Corporations")
        QUOTES = "quotes", _("Quotes")
        TASKS = "tasks", _("Tasks")
        DOCUMENTS = "documents", _("Documents")
        APPOINTMENTS = "appointments", _("Appointments")
        INTERNAL_TICKETS = "internal_tickets", _("Internal Tickets")

    class TriggerType(models.TextChoices):
        ON_SAVE = "on_save", _("On Save")
        VIA_PROCESS = "via_process", _("Via Process")

    class ApplyOn(models.TextChoices):
        CREATED_BY = "created_by", _("Created By")
        ASSIGNED_TO = "assigned_to", _("Assigned To")

    name = models.CharField(_("name"), max_length=255)
    module = models.CharField(
        _("module"),
        max_length=30,
        choices=Module.choices,
        db_index=True,
    )
    is_active = models.BooleanField(_("active"), default=True)
    description = models.TextField(_("description"), blank=True, default="")

    # Trigger
    trigger = models.CharField(
        _("trigger"),
        max_length=20,
        choices=TriggerType.choices,
        default=TriggerType.ON_SAVE,
    )

    # Entry criteria — JSON arrays of condition objects
    # Each condition: {"field": "...", "operator": "...", "value": "..."}
    entry_criteria_all = models.JSONField(
        _("all conditions"),
        default=list,
        blank=True,
        help_text=_("All conditions must be met."),
    )
    entry_criteria_any = models.JSONField(
        _("any conditions"),
        default=list,
        blank=True,
        help_text=_("At least one condition must be met."),
    )

    # Rules configuration
    apply_on = models.CharField(
        _("apply rules on"),
        max_length=20,
        choices=ApplyOn.choices,
        default=ApplyOn.ASSIGNED_TO,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_approvals",
        verbose_name=_("created by"),
    )

    class Meta:
        db_table = "crm_approvals"
        ordering = ["-created_at"]
        verbose_name = _("approval")
        verbose_name_plural = _("approvals")

    def __str__(self):
        return self.name


class ApprovalRule(TimeStampedModel):
    """
    A single rule inside an Approval.  Rules are evaluated in order;
    the first matching rule determines the approver(s).
    """

    approval = models.ForeignKey(
        Approval,
        on_delete=models.CASCADE,
        related_name="rules",
        verbose_name=_("approval"),
    )
    rule_number = models.PositiveSmallIntegerField(_("rule number"), default=1)
    conditions = models.JSONField(
        _("conditions"),
        default=list,
        blank=True,
        help_text=_("Conditions for this rule to match."),
    )
    owner_profiles = models.ManyToManyField(
        "users.Role",
        blank=True,
        related_name="approval_rules",
        verbose_name=_("owner profiles"),
    )
    approvers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="approval_rules",
        verbose_name=_("approvers"),
    )

    class Meta:
        db_table = "crm_approval_rules"
        ordering = ["rule_number"]
        verbose_name = _("approval rule")
        verbose_name_plural = _("approval rules")

    def __str__(self):
        return f"Rule #{self.rule_number} for {self.approval.name}"


class ApprovalAction(TimeStampedModel):
    """
    An action to execute when an approval is finally approved or rejected.
    """

    class Phase(models.TextChoices):
        APPROVAL = "approval", _("Final Approval")
        REJECTION = "rejection", _("Final Rejection")

    class ActionType(models.TextChoices):
        UPDATE_FIELD = "update_field", _("Update Field")
        SEND_EMAIL = "send_email", _("Send Email")
        SEND_NOTIFICATION = "send_notification", _("Send Notification")
        CREATE_TASK = "create_task", _("Create Task")

    approval = models.ForeignKey(
        Approval,
        on_delete=models.CASCADE,
        related_name="actions",
        verbose_name=_("approval"),
    )
    phase = models.CharField(
        _("phase"),
        max_length=10,
        choices=Phase.choices,
        db_index=True,
    )
    action_type = models.CharField(
        _("action type"),
        max_length=30,
        choices=ActionType.choices,
    )
    action_title = models.CharField(_("action title"), max_length=255)
    action_config = models.JSONField(
        _("action config"),
        default=dict,
        blank=True,
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        db_table = "crm_approval_actions"
        ordering = ["phase", "created_at"]
        verbose_name = _("approval action")
        verbose_name_plural = _("approval actions")

    def __str__(self):
        return f"{self.get_phase_display()}: {self.action_title}"
