import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.core.models import TimeStampedModel


class SLA(TimeStampedModel):
    """
    Service Level Agreement configuration.
    Defines response and resolution time targets.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    # Response time targets (in hours)
    response_time_urgent = models.IntegerField(
        default=1, help_text="Hours to first response for urgent priority"
    )
    response_time_high = models.IntegerField(
        default=4, help_text="Hours to first response for high priority"
    )
    response_time_medium = models.IntegerField(
        default=8, help_text="Hours to first response for medium priority"
    )
    response_time_low = models.IntegerField(
        default=24, help_text="Hours to first response for low priority"
    )

    # Resolution time targets (in hours)
    resolution_time_urgent = models.IntegerField(
        default=4, help_text="Hours to resolution for urgent priority"
    )
    resolution_time_high = models.IntegerField(
        default=24, help_text="Hours to resolution for high priority"
    )
    resolution_time_medium = models.IntegerField(
        default=48, help_text="Hours to resolution for medium priority"
    )
    resolution_time_low = models.IntegerField(
        default=72, help_text="Hours to resolution for low priority"
    )

    # Business hours consideration
    use_business_hours = models.BooleanField(
        default=True, help_text="Calculate SLA based on business hours only"
    )
    business_hours = models.ForeignKey(
        "business_hours.BusinessHours",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="slas",
    )

    # Escalation settings
    escalation_enabled = models.BooleanField(default=True)
    escalation_notify_assignee = models.BooleanField(default=True)
    escalation_notify_manager = models.BooleanField(default=True)
    escalation_email = models.EmailField(
        blank=True, help_text="Additional email for escalation notifications"
    )

    # Applicable to specific case types (empty = all types)
    applicable_case_types = models.JSONField(
        default=list,
        blank=True,
        help_text="List of case types this SLA applies to (empty = all)",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_slas",
    )

    class Meta:
        verbose_name = "SLA"
        verbose_name_plural = "SLAs"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure only one default SLA
        if self.is_default:
            SLA.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)

    def get_response_time(self, priority: str) -> int:
        """Get response time in hours for a given priority."""
        mapping = {
            "urgent": self.response_time_urgent,
            "high": self.response_time_high,
            "medium": self.response_time_medium,
            "low": self.response_time_low,
        }
        return mapping.get(priority, self.response_time_medium)

    def get_resolution_time(self, priority: str) -> int:
        """Get resolution time in hours for a given priority."""
        mapping = {
            "urgent": self.resolution_time_urgent,
            "high": self.resolution_time_high,
            "medium": self.resolution_time_medium,
            "low": self.resolution_time_low,
        }
        return mapping.get(priority, self.resolution_time_medium)


class SLABreach(TimeStampedModel):
    """
    Record of SLA breaches for reporting and analysis.
    """

    class BreachType(models.TextChoices):
        RESPONSE = "response", "Response Time Breach"
        RESOLUTION = "resolution", "Resolution Time Breach"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        "cases.TaxCase", on_delete=models.CASCADE, related_name="sla_breaches"
    )
    sla = models.ForeignKey(
        SLA, on_delete=models.SET_NULL, null=True, related_name="breaches"
    )

    breach_type = models.CharField(max_length=20, choices=BreachType.choices)
    target_time = models.DateTimeField(help_text="When the SLA target was")
    breach_time = models.DateTimeField(help_text="When the breach occurred")
    breach_duration = models.DurationField(
        help_text="How long the breach lasted/is lasting"
    )

    # Snapshot of case state at breach
    case_priority = models.CharField(max_length=20)
    case_status = models.CharField(max_length=50)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sla_breaches",
    )

    # Escalation tracking
    escalation_sent = models.BooleanField(default=False)
    escalation_sent_at = models.DateTimeField(null=True, blank=True)
    escalation_acknowledged = models.BooleanField(default=False)
    escalation_acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_breaches",
    )
    escalation_acknowledged_at = models.DateTimeField(null=True, blank=True)

    # Resolution
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-breach_time"]
        verbose_name = "SLA Breach"
        verbose_name_plural = "SLA Breaches"

    def __str__(self):
        return f"{self.breach_type} breach for case {self.case_id}"


class CaseSLAStatus(TimeStampedModel):
    """
    Tracks SLA status for each case.
    Updated automatically when case changes.
    """

    class Status(models.TextChoices):
        ON_TRACK = "on_track", "On Track"
        AT_RISK = "at_risk", "At Risk"
        BREACHED = "breached", "Breached"
        PAUSED = "paused", "Paused"
        MET = "met", "Met"
        NA = "na", "Not Applicable"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.OneToOneField(
        "cases.TaxCase", on_delete=models.CASCADE, related_name="sla_status"
    )
    sla = models.ForeignKey(
        SLA, on_delete=models.SET_NULL, null=True, related_name="case_statuses"
    )

    # Response SLA
    response_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ON_TRACK
    )
    response_target = models.DateTimeField(null=True, blank=True)
    response_met_at = models.DateTimeField(null=True, blank=True)
    response_breached = models.BooleanField(default=False)

    # Resolution SLA
    resolution_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ON_TRACK
    )
    resolution_target = models.DateTimeField(null=True, blank=True)
    resolution_met_at = models.DateTimeField(null=True, blank=True)
    resolution_breached = models.BooleanField(default=False)

    # Pause tracking (for when case is waiting on client)
    is_paused = models.BooleanField(default=False)
    paused_at = models.DateTimeField(null=True, blank=True)
    total_paused_time = models.DurationField(default=timedelta(0))
    pause_reason = models.CharField(max_length=200, blank=True)

    # Time tracking
    time_to_response = models.DurationField(null=True, blank=True)
    time_to_resolution = models.DurationField(null=True, blank=True)

    class Meta:
        verbose_name = "Case SLA Status"
        verbose_name_plural = "Case SLA Statuses"

    def __str__(self):
        return f"SLA Status for case {self.case_id}"

    def calculate_response_status(self):
        """Calculate current response SLA status."""
        if self.response_met_at:
            return self.Status.MET
        if self.is_paused:
            return self.Status.PAUSED
        if not self.response_target:
            return self.Status.NA

        now = timezone.now()
        time_remaining = self.response_target - now

        if time_remaining.total_seconds() < 0:
            return self.Status.BREACHED
        elif time_remaining.total_seconds() < 3600:  # Less than 1 hour
            return self.Status.AT_RISK
        return self.Status.ON_TRACK

    def calculate_resolution_status(self):
        """Calculate current resolution SLA status."""
        if self.resolution_met_at:
            return self.Status.MET
        if self.is_paused:
            return self.Status.PAUSED
        if not self.resolution_target:
            return self.Status.NA

        now = timezone.now()
        time_remaining = self.resolution_target - now

        if time_remaining.total_seconds() < 0:
            return self.Status.BREACHED
        elif time_remaining.total_seconds() < 7200:  # Less than 2 hours
            return self.Status.AT_RISK
        return self.Status.ON_TRACK

    def pause(self, reason: str = ""):
        """Pause SLA tracking."""
        if not self.is_paused:
            self.is_paused = True
            self.paused_at = timezone.now()
            self.pause_reason = reason
            self.save()

    def resume(self):
        """Resume SLA tracking and adjust targets."""
        if self.is_paused and self.paused_at:
            paused_duration = timezone.now() - self.paused_at
            self.total_paused_time += paused_duration

            # Adjust targets
            if self.response_target and not self.response_met_at:
                self.response_target += paused_duration
            if self.resolution_target and not self.resolution_met_at:
                self.resolution_target += paused_duration

            self.is_paused = False
            self.paused_at = None
            self.pause_reason = ""
            self.save()


class EscalationRule(TimeStampedModel):
    """
    Rules for automatic escalation when SLA is at risk or breached.
    """

    class TriggerType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage of time elapsed"
        HOURS_BEFORE = "hours_before", "Hours before breach"
        ON_BREACH = "on_breach", "On breach"
        HOURS_AFTER = "hours_after", "Hours after breach"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sla = models.ForeignKey(
        SLA, on_delete=models.CASCADE, related_name="escalation_rules"
    )
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    # Trigger conditions
    trigger_type = models.CharField(max_length=20, choices=TriggerType.choices)
    trigger_value = models.IntegerField(
        default=0, help_text="Percentage (0-100) or hours depending on trigger type"
    )
    applies_to = models.CharField(
        max_length=20,
        choices=[
            ("response", "Response SLA"),
            ("resolution", "Resolution SLA"),
            ("both", "Both"),
        ],
        default="both",
    )

    # Actions
    notify_assignee = models.BooleanField(default=True)
    notify_manager = models.BooleanField(default=False)
    notify_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="escalation_notifications"
    )
    notify_emails = models.TextField(
        blank=True, help_text="Comma-separated email addresses"
    )

    # Reassignment
    reassign_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="escalation_reassignments",
    )
    change_priority = models.CharField(
        max_length=20,
        blank=True,
        choices=[("urgent", "Urgent"), ("high", "High")],
        help_text="Optionally increase priority on escalation",
    )

    # Notification template
    email_subject = models.CharField(
        max_length=200,
        default="SLA Alert: Case {{case.case_number}} requires attention",
    )
    email_body = models.TextField(
        default="Case {{case.case_number}} is {{status}} for {{sla_type}} SLA.\n\nCase: {{case.title}}\nPriority: {{case.priority}}\nAssigned to: {{case.assigned_to}}\n\nPlease take action immediately."
    )

    class Meta:
        ordering = ["sla", "order"]

    def __str__(self):
        return f"{self.name} ({self.sla.name})"
