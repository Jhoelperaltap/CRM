import uuid
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Playbook(TimeStampedModel):
    """A guided process with sequential steps for sales/support workflows"""

    class PlaybookType(models.TextChoices):
        SALES = "sales", "Sales Process"
        ONBOARDING = "onboarding", "Client Onboarding"
        SUPPORT = "support", "Support Process"
        RENEWAL = "renewal", "Renewal Process"
        UPSELL = "upsell", "Upsell/Cross-sell"
        COLLECTION = "collection", "Collection Process"
        CUSTOM = "custom", "Custom"

    class TriggerType(models.TextChoices):
        MANUAL = "manual", "Manual"
        CASE_STAGE = "case_stage", "Case Stage Change"
        CONTACT_CREATED = "contact_created", "Contact Created"
        QUOTE_CREATED = "quote_created", "Quote Created"
        APPOINTMENT_SCHEDULED = "appointment_scheduled", "Appointment Scheduled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    playbook_type = models.CharField(
        max_length=20, choices=PlaybookType.choices, default=PlaybookType.SALES
    )
    is_active = models.BooleanField(default=True)

    # Trigger settings
    trigger_type = models.CharField(
        max_length=30, choices=TriggerType.choices, default=TriggerType.MANUAL
    )
    trigger_conditions = models.JSONField(default=dict, blank=True)

    # Applicable entities
    applies_to_contacts = models.BooleanField(default=True)
    applies_to_cases = models.BooleanField(default=True)
    applies_to_corporations = models.BooleanField(default=False)

    # Goal tracking
    target_completion_days = models.IntegerField(null=True, blank=True)
    success_criteria = models.TextField(blank=True)

    # Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_playbooks",
    )

    # Stats
    times_started = models.IntegerField(default=0)
    times_completed = models.IntegerField(default=0)
    avg_completion_time = models.FloatField(null=True, blank=True)  # in days

    class Meta:
        verbose_name = "Playbook"
        verbose_name_plural = "Playbooks"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def completion_rate(self):
        if self.times_started == 0:
            return 0
        return round((self.times_completed / self.times_started) * 100, 1)


class PlaybookStep(TimeStampedModel):
    """Individual step within a playbook"""

    class StepType(models.TextChoices):
        TASK = "task", "Create Task"
        EMAIL = "email", "Send Email"
        CALL = "call", "Make Call"
        MEETING = "meeting", "Schedule Meeting"
        NOTE = "note", "Add Note"
        UPDATE_FIELD = "update_field", "Update Field"
        WAIT = "wait", "Wait/Delay"
        DECISION = "decision", "Decision Point"
        CHECKLIST = "checklist", "Checklist"

    class WaitUnit(models.TextChoices):
        HOURS = "hours", "Hours"
        DAYS = "days", "Days"
        WEEKS = "weeks", "Weeks"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playbook = models.ForeignKey(
        Playbook, on_delete=models.CASCADE, related_name="steps"
    )
    order = models.IntegerField(default=0)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    step_type = models.CharField(
        max_length=20, choices=StepType.choices, default=StepType.TASK
    )
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    # Step configuration
    config = models.JSONField(default=dict, blank=True)
    # For task: {priority, due_days, assigned_to_role}
    # For email: {template_id, delay_hours}
    # For call: {script_id, call_type}
    # For meeting: {duration_minutes, meeting_type}
    # For wait: {duration, unit}
    # For decision: {options: [{label, next_step_id}]}
    # For checklist: {items: [{text, required}]}

    # Wait settings (for wait steps)
    wait_duration = models.IntegerField(null=True, blank=True)
    wait_unit = models.CharField(
        max_length=10, choices=WaitUnit.choices, default=WaitUnit.DAYS, blank=True
    )

    # Conditional logic
    condition = models.JSONField(default=dict, blank=True)
    # e.g., {"field": "case.stage", "operator": "equals", "value": "qualified"}

    # Next step override (for branching)
    next_step = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="previous_steps",
    )

    # Reminders
    reminder_days = models.IntegerField(null=True, blank=True)
    escalate_after_days = models.IntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Playbook Step"
        verbose_name_plural = "Playbook Steps"
        ordering = ["playbook", "order"]
        unique_together = ["playbook", "order"]

    def __str__(self):
        return f"{self.playbook.name} - Step {self.order}: {self.name}"


class PlaybookExecution(TimeStampedModel):
    """Instance of a playbook being executed for a specific entity"""

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In Progress"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        ABANDONED = "abandoned", "Abandoned"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playbook = models.ForeignKey(
        Playbook, on_delete=models.CASCADE, related_name="executions"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.IN_PROGRESS
    )

    # Related entity (one of these should be set)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="playbook_executions",
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="playbook_executions",
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="playbook_executions",
    )

    # Progress tracking
    current_step = models.ForeignKey(
        PlaybookStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_executions",
    )
    steps_completed = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=0)

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    target_completion_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)

    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_playbook_executions",
    )
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="started_playbook_executions",
    )

    # Notes and outcomes
    notes = models.TextField(blank=True)
    outcome = models.CharField(max_length=100, blank=True)
    outcome_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Playbook Execution"
        verbose_name_plural = "Playbook Executions"
        ordering = ["-started_at"]

    def __str__(self):
        entity = self.contact or self.case or self.corporation
        return f"{self.playbook.name} - {entity}"

    @property
    def progress_percentage(self):
        if self.total_steps == 0:
            return 0
        return round((self.steps_completed / self.total_steps) * 100)

    @property
    def is_overdue(self):
        from django.utils import timezone

        if not self.target_completion_date:
            return False
        return (
            self.status == self.Status.IN_PROGRESS
            and timezone.now().date() > self.target_completion_date
        )


class PlaybookStepExecution(TimeStampedModel):
    """Execution record for each step within a playbook execution"""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(
        PlaybookExecution, on_delete=models.CASCADE, related_name="step_executions"
    )
    step = models.ForeignKey(
        PlaybookStep, on_delete=models.CASCADE, related_name="executions"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_step_executions",
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_step_executions",
    )

    # Step output/data
    notes = models.TextField(blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    # e.g., for decision: {selected_option, reason}
    # for checklist: {items_completed: [0, 1, 3]}
    # for call: {outcome, duration, notes}

    # Related created objects
    created_task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="playbook_step_executions",
    )
    created_appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="playbook_step_executions",
    )

    # Reminders sent
    reminder_sent = models.BooleanField(default=False)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    escalated = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Step Execution"
        verbose_name_plural = "Step Executions"
        ordering = ["step__order"]
        unique_together = ["execution", "step"]

    def __str__(self):
        return f"{self.execution} - {self.step.name}"

    @property
    def is_overdue(self):
        from django.utils import timezone

        if not self.due_date:
            return False
        return (
            self.status in [self.Status.PENDING, self.Status.IN_PROGRESS]
            and timezone.now().date() > self.due_date
        )


class PlaybookTemplate(TimeStampedModel):
    """Pre-built playbook templates that can be cloned"""

    class Category(models.TextChoices):
        TAX_SERVICES = "tax_services", "Tax Services"
        SALES = "sales", "Sales"
        ONBOARDING = "onboarding", "Onboarding"
        SUPPORT = "support", "Support"
        GENERAL = "general", "General"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.GENERAL
    )
    is_system = models.BooleanField(default=False)  # Built-in templates
    is_public = models.BooleanField(default=True)

    # Template data
    playbook_data = models.JSONField(default=dict)
    # Contains: name, description, type, steps[], etc.

    # Stats
    times_used = models.IntegerField(default=0)
    rating = models.FloatField(default=0)
    rating_count = models.IntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_playbook_templates",
    )

    class Meta:
        verbose_name = "Playbook Template"
        verbose_name_plural = "Playbook Templates"
        ordering = ["-times_used", "name"]

    def __str__(self):
        return self.name
