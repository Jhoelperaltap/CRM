import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel

# Fixed UUID for singleton AgentConfiguration
AGENT_CONFIGURATION_PK = uuid.UUID("00000000-0000-0000-0000-000000000001")


class AgentConfiguration(TimeStampedModel):
    """
    Singleton configuration for AI Agent capabilities.
    Controls which features are enabled and their parameters.
    """

    class AIProvider(models.TextChoices):
        OPENAI = "openai", _("OpenAI (GPT)")
        ANTHROPIC = "anthropic", _("Anthropic (Claude)")

    # Master switch
    is_active = models.BooleanField(
        default=False,
        help_text=_("Master switch to enable/disable the AI agent"),
    )

    # Capability toggles
    email_analysis_enabled = models.BooleanField(
        default=False,
        help_text=_("Analyze incoming emails and create notes from important content"),
    )
    appointment_reminders_enabled = models.BooleanField(
        default=True,
        help_text=_("Send automated reminders for upcoming appointments"),
    )
    task_enforcement_enabled = models.BooleanField(
        default=False,
        help_text=_("Monitor task completion and send reminders/escalations"),
    )
    market_analysis_enabled = models.BooleanField(
        default=False,
        help_text=_("Analyze business metrics and generate insights"),
    )
    autonomous_actions_enabled = models.BooleanField(
        default=False,
        help_text=_("Allow AI to execute actions without manual approval"),
    )

    # Timing settings
    email_check_interval_minutes = models.PositiveIntegerField(
        default=15,
        help_text=_("How often to check for new emails to analyze"),
    )
    task_reminder_hours_before = models.PositiveIntegerField(
        default=24,
        help_text=_("Hours before due date to send task reminders"),
    )
    appointment_reminder_hours = models.JSONField(
        default=list,
        blank=True,
        help_text=_(
            "List of hours before appointment to send reminders (e.g., [24, 2])"
        ),
    )

    # AI settings
    ai_provider = models.CharField(
        max_length=20,
        choices=AIProvider.choices,
        default=AIProvider.OPENAI,
    )
    ai_model = models.CharField(
        max_length=50,
        default="gpt-4o",
        help_text=_("AI model to use (e.g., gpt-4o, claude-3-opus-20240229)"),
    )
    ai_temperature = models.FloatField(
        default=0.3,
        help_text=_("AI temperature (0.0-1.0, lower = more deterministic)"),
    )
    max_tokens = models.PositiveIntegerField(
        default=2000,
        help_text=_("Maximum tokens for AI responses"),
    )

    # API Keys (encrypted in production)
    openai_api_key = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("OpenAI API key"),
    )
    anthropic_api_key = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Anthropic API key"),
    )

    # Custom instructions
    custom_instructions = models.TextField(
        blank=True,
        help_text=_("Additional instructions for the AI agent"),
    )
    focus_areas = models.JSONField(
        default=list,
        blank=True,
        help_text=_(
            'Priority areas for analysis (e.g., ["revenue", "client_retention"])'
        ),
    )

    # Rate limiting
    max_actions_per_hour = models.PositiveIntegerField(
        default=100,
        help_text=_("Maximum actions the agent can take per hour"),
    )
    max_ai_calls_per_hour = models.PositiveIntegerField(
        default=50,
        help_text=_("Maximum AI API calls per hour"),
    )

    class Meta:
        db_table = "crm_agent_configuration"
        verbose_name = _("AI Agent Configuration")
        verbose_name_plural = _("AI Agent Configurations")

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"AI Agent Configuration ({status})"

    def save(self, *args, **kwargs):
        # Ensure singleton pattern by forcing fixed pk
        self.pk = AGENT_CONFIGURATION_PK
        # Set default reminder hours if empty
        if not self.appointment_reminder_hours:
            self.appointment_reminder_hours = [24, 2]
        # Check if record exists to determine INSERT vs UPDATE
        existing = AgentConfiguration.objects.filter(pk=AGENT_CONFIGURATION_PK).first()
        if existing:
            # Preserve created_at from existing record when updating
            self.created_at = existing.created_at
            # Force update if the record already exists
            kwargs["force_update"] = True
            kwargs.pop("force_insert", None)
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Get or create the singleton configuration."""
        config, _ = cls.objects.get_or_create(pk=AGENT_CONFIGURATION_PK)
        return config


class AgentAction(TimeStampedModel):
    """
    Records every action the AI takes or recommends.
    Provides audit trail and allows for approval workflows.
    """

    class ActionType(models.TextChoices):
        EMAIL_NOTE_CREATED = "email_note", _("Created note from email")
        APPOINTMENT_REMINDER = "appt_reminder", _("Sent appointment reminder")
        TASK_REMINDER = "task_reminder", _("Sent task reminder")
        TASK_ESCALATED = "task_escalated", _("Escalated overdue task")
        INSIGHT_GENERATED = "insight", _("Generated business insight")
        RECOMMENDATION = "recommendation", _("Made recommendation")
        EMAIL_SENT = "email_sent", _("Sent email")
        TASK_CREATED = "task_created", _("Created task")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending approval")
        APPROVED = "approved", _("Approved")
        EXECUTED = "executed", _("Executed")
        REJECTED = "rejected", _("Rejected")
        FAILED = "failed", _("Failed")

    action_type = models.CharField(
        max_length=30,
        choices=ActionType.choices,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # Context
    title = models.CharField(max_length=200)
    description = models.TextField()
    reasoning = models.TextField(
        blank=True,
        help_text=_("AI's explanation for this action"),
    )

    # Action data
    action_data = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Structured data needed to execute the action"),
    )

    # Related entities (optional foreign keys)
    related_email = models.ForeignKey(
        "emails.EmailMessage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="agent_actions",
    )
    related_task = models.ForeignKey(
        "tasks.Task",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="agent_actions",
    )
    related_appointment = models.ForeignKey(
        "appointments.Appointment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="agent_actions",
    )
    related_contact = models.ForeignKey(
        "contacts.Contact",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="agent_actions",
    )
    related_case = models.ForeignKey(
        "cases.TaxCase",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="agent_actions",
    )

    # Approval workflow
    requires_approval = models.BooleanField(default=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_agent_actions",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rejected_agent_actions",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Execution tracking
    executed_at = models.DateTimeField(null=True, blank=True)
    execution_result = models.TextField(blank=True)
    error_message = models.TextField(blank=True)

    # Outcome tracking for learning
    outcome = models.TextField(
        blank=True,
        help_text=_("Description of the action's outcome"),
    )
    outcome_score = models.FloatField(
        null=True,
        blank=True,
        help_text=_("Outcome score from -1 (bad) to 1 (good)"),
    )
    outcome_recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recorded_agent_outcomes",
    )
    outcome_recorded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "crm_agent_actions"
        verbose_name = _("AI Agent Action")
        verbose_name_plural = _("AI Agent Actions")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action_type", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_action_type_display()}: {self.title}"


class AgentLog(TimeStampedModel):
    """
    Detailed logging for AI agent operations.
    Used for debugging, auditing, and learning.
    """

    class LogLevel(models.TextChoices):
        DEBUG = "debug", _("Debug")
        INFO = "info", _("Info")
        WARNING = "warning", _("Warning")
        ERROR = "error", _("Error")
        DECISION = "decision", _("Decision")

    level = models.CharField(
        max_length=20,
        choices=LogLevel.choices,
        db_index=True,
    )
    component = models.CharField(
        max_length=50,
        db_index=True,
        help_text=_("Component that generated this log (e.g., email_analyzer)"),
    )
    message = models.TextField()
    context = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Additional structured data"),
    )

    # Optional link to action
    action = models.ForeignKey(
        AgentAction,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="logs",
    )

    # AI usage tracking
    tokens_used = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_("Number of tokens used for this operation"),
    )
    ai_model = models.CharField(
        max_length=50,
        blank=True,
    )
    ai_latency_ms = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_("AI API response time in milliseconds"),
    )

    class Meta:
        db_table = "crm_agent_logs"
        verbose_name = _("AI Agent Log")
        verbose_name_plural = _("AI Agent Logs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["level", "created_at"]),
            models.Index(fields=["component", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.level.upper()}] {self.component}: {self.message[:50]}"


class AgentInsight(TimeStampedModel):
    """
    Business insights and market analysis results generated by AI.
    """

    class InsightType(models.TextChoices):
        STRENGTH = "strength", _("Business Strength")
        WEAKNESS = "weakness", _("Business Weakness")
        OPPORTUNITY = "opportunity", _("Opportunity")
        THREAT = "threat", _("Threat")
        TREND = "trend", _("Trend Analysis")
        METRIC = "metric", _("Metric Alert")
        RECOMMENDATION = "recommendation", _("Recommendation")

    class Priority(models.IntegerChoices):
        LOW = 1, _("Low")
        MEDIUM_LOW = 3, _("Medium-Low")
        MEDIUM = 5, _("Medium")
        MEDIUM_HIGH = 7, _("Medium-High")
        HIGH = 9, _("High")
        CRITICAL = 10, _("Critical")

    insight_type = models.CharField(
        max_length=20,
        choices=InsightType.choices,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    supporting_data = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Data that supports this insight"),
    )

    # Importance and actionability
    priority = models.IntegerField(
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    is_actionable = models.BooleanField(default=True)
    recommended_action = models.TextField(
        blank=True,
        help_text=_("Suggested action to take based on this insight"),
    )

    # Tracking
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="acknowledged_insights",
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    # Outcome tracking
    outcome = models.TextField(
        blank=True,
        help_text=_("What happened after acknowledging this insight"),
    )
    outcome_recorded_at = models.DateTimeField(null=True, blank=True)

    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When this insight is no longer relevant"),
    )

    # Related action if created from agent action
    source_action = models.ForeignKey(
        AgentAction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="insights",
    )

    class Meta:
        db_table = "crm_agent_insights"
        verbose_name = _("AI Agent Insight")
        verbose_name_plural = _("AI Agent Insights")
        ordering = ["-priority", "-created_at"]
        indexes = [
            models.Index(fields=["insight_type", "is_acknowledged"]),
            models.Index(fields=["priority", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.get_insight_type_display()}] {self.title}"


class AgentMetrics(TimeStampedModel):
    """
    Aggregated metrics for AI agent performance tracking.
    One record per day for historical analysis.
    """

    date = models.DateField(unique=True, db_index=True)

    # Action counts
    total_actions = models.PositiveIntegerField(default=0)
    actions_executed = models.PositiveIntegerField(default=0)
    actions_approved = models.PositiveIntegerField(default=0)
    actions_rejected = models.PositiveIntegerField(default=0)
    actions_failed = models.PositiveIntegerField(default=0)

    # Action types breakdown
    email_notes_created = models.PositiveIntegerField(default=0)
    appointment_reminders_sent = models.PositiveIntegerField(default=0)
    task_reminders_sent = models.PositiveIntegerField(default=0)
    tasks_escalated = models.PositiveIntegerField(default=0)
    insights_generated = models.PositiveIntegerField(default=0)

    # AI usage
    total_ai_calls = models.PositiveIntegerField(default=0)
    total_tokens_used = models.PositiveIntegerField(default=0)
    avg_ai_latency_ms = models.FloatField(null=True, blank=True)

    # Outcome scores
    avg_outcome_score = models.FloatField(null=True, blank=True)
    outcomes_recorded = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "crm_agent_metrics"
        verbose_name = _("AI Agent Metrics")
        verbose_name_plural = _("AI Agent Metrics")
        ordering = ["-date"]

    def __str__(self):
        return f"Agent Metrics for {self.date}"
