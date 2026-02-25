import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class TelephonyProvider(TimeStampedModel):
    """Configuration for telephony service providers (Twilio, RingCentral, etc.)"""

    class ProviderType(models.TextChoices):
        TWILIO = "twilio", "Twilio"
        RINGCENTRAL = "ringcentral", "RingCentral"
        VONAGE = "vonage", "Vonage"
        ASTERISK = "asterisk", "Asterisk/FreePBX"
        CUSTOM = "custom", "Custom SIP"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    provider_type = models.CharField(
        max_length=20, choices=ProviderType.choices, default=ProviderType.TWILIO
    )
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    # API Credentials (encrypted in production)
    account_sid = models.CharField(max_length=255, blank=True)
    auth_token = models.CharField(max_length=255, blank=True)
    api_key = models.CharField(max_length=255, blank=True)
    api_secret = models.CharField(max_length=255, blank=True)

    # Configuration
    webhook_url = models.URLField(blank=True)
    default_caller_id = models.CharField(max_length=30, blank=True)
    recording_enabled = models.BooleanField(default=True)

    # Settings
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Telephony Provider"
        verbose_name_plural = "Telephony Providers"
        ordering = ["-is_default", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"

    def save(self, *args, **kwargs):
        if self.is_default:
            TelephonyProvider.objects.filter(is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)


class PhoneLine(TimeStampedModel):
    """Phone lines/numbers available in the system"""

    class LineType(models.TextChoices):
        INBOUND = "inbound", "Inbound Only"
        OUTBOUND = "outbound", "Outbound Only"
        BOTH = "both", "Inbound & Outbound"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        TelephonyProvider, on_delete=models.CASCADE, related_name="phone_lines"
    )
    phone_number = models.CharField(max_length=30, unique=True)
    friendly_name = models.CharField(max_length=100, blank=True)
    line_type = models.CharField(
        max_length=10, choices=LineType.choices, default=LineType.BOTH
    )
    is_active = models.BooleanField(default=True)

    # Assignment
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="phone_lines",
    )
    assigned_department = models.CharField(max_length=100, blank=True)

    # Settings
    voicemail_enabled = models.BooleanField(default=True)
    voicemail_greeting_url = models.URLField(blank=True)
    forward_to = models.CharField(max_length=30, blank=True)
    ring_timeout = models.IntegerField(default=30)  # seconds

    class Meta:
        verbose_name = "Phone Line"
        verbose_name_plural = "Phone Lines"
        ordering = ["phone_number"]

    def __str__(self):
        return self.friendly_name or self.phone_number


class Call(TimeStampedModel):
    """Individual call records"""

    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    class Status(models.TextChoices):
        INITIATED = "initiated", "Initiated"
        RINGING = "ringing", "Ringing"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        BUSY = "busy", "Busy"
        NO_ANSWER = "no_answer", "No Answer"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"
        VOICEMAIL = "voicemail", "Voicemail"

    class CallType(models.TextChoices):
        REGULAR = "regular", "Regular Call"
        FOLLOW_UP = "follow_up", "Follow-up"
        COLD_CALL = "cold_call", "Cold Call"
        SUPPORT = "support", "Support Call"
        SALES = "sales", "Sales Call"
        CALLBACK = "callback", "Callback Request"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Call identification
    external_id = models.CharField(max_length=100, blank=True, db_index=True)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.INITIATED
    )
    call_type = models.CharField(
        max_length=20, choices=CallType.choices, default=CallType.REGULAR
    )

    # Phone numbers
    from_number = models.CharField(max_length=30)
    to_number = models.CharField(max_length=30)
    phone_line = models.ForeignKey(
        PhoneLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )

    # Users involved
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )
    transferred_from = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transferred_calls",
    )

    # Related entities
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0)  # seconds
    ring_duration = models.IntegerField(default=0)  # seconds

    # Recording
    is_recorded = models.BooleanField(default=False)
    recording_url = models.URLField(blank=True)
    recording_duration = models.IntegerField(default=0)
    transcription = models.TextField(blank=True)
    transcription_status = models.CharField(max_length=20, blank=True)

    # Call details
    subject = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    outcome = models.CharField(max_length=100, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True)

    # Quality
    call_quality_score = models.IntegerField(null=True, blank=True)  # 1-5
    customer_sentiment = models.CharField(max_length=20, blank=True)

    # Provider data
    provider_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Call"
        verbose_name_plural = "Calls"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["direction", "status"]),
            models.Index(fields=["from_number"]),
            models.Index(fields=["to_number"]),
            models.Index(fields=["started_at"]),
        ]

    def __str__(self):
        return f"{self.get_direction_display()} call: {self.from_number} → {self.to_number}"


class CallQueue(TimeStampedModel):
    """Queue for managing inbound calls"""

    class Strategy(models.TextChoices):
        RING_ALL = "ring_all", "Ring All"
        ROUND_ROBIN = "round_robin", "Round Robin"
        LEAST_RECENT = "least_recent", "Least Recent"
        RANDOM = "random", "Random"
        LINEAR = "linear", "Linear"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # Strategy
    strategy = models.CharField(
        max_length=20, choices=Strategy.choices, default=Strategy.ROUND_ROBIN
    )
    timeout = models.IntegerField(default=30)  # seconds before moving to next
    max_wait_time = models.IntegerField(default=300)  # max seconds in queue

    # Members
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="CallQueueMember", related_name="call_queues"
    )

    # Music/announcements
    hold_music_url = models.URLField(blank=True)
    announce_position = models.BooleanField(default=True)
    announce_wait_time = models.BooleanField(default=False)

    # Overflow
    overflow_action = models.CharField(max_length=50, default="voicemail")
    overflow_destination = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "Call Queue"
        verbose_name_plural = "Call Queues"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CallQueueMember(TimeStampedModel):
    """Members of a call queue with priority"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue = models.ForeignKey(CallQueue, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    # Status
    is_available = models.BooleanField(default=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    pause_reason = models.CharField(max_length=100, blank=True)

    # Stats
    calls_taken = models.IntegerField(default=0)
    last_call_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Queue Member"
        verbose_name_plural = "Queue Members"
        unique_together = ["queue", "user"]
        ordering = ["priority", "-calls_taken"]

    def __str__(self):
        return f"{self.user} in {self.queue}"


class Voicemail(TimeStampedModel):
    """Voicemail messages"""

    class Status(models.TextChoices):
        NEW = "new", "New"
        LISTENED = "listened", "Listened"
        ARCHIVED = "archived", "Archived"
        DELETED = "deleted", "Deleted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_line = models.ForeignKey(
        PhoneLine, on_delete=models.CASCADE, related_name="voicemails"
    )
    call = models.ForeignKey(
        Call,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="voicemails",
    )

    # Caller info
    caller_number = models.CharField(max_length=30)
    caller_name = models.CharField(max_length=100, blank=True)

    # Content
    audio_url = models.URLField()
    duration = models.IntegerField(default=0)  # seconds
    transcription = models.TextField(blank=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    listened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="listened_voicemails",
    )
    listened_at = models.DateTimeField(null=True, blank=True)

    # Related entities
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="voicemails",
    )

    class Meta:
        verbose_name = "Voicemail"
        verbose_name_plural = "Voicemails"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Voicemail from {self.caller_number}"


class CallScript(TimeStampedModel):
    """Scripts for guiding calls"""

    class ScriptType(models.TextChoices):
        COLD_CALL = "cold_call", "Cold Call"
        FOLLOW_UP = "follow_up", "Follow-up"
        SUPPORT = "support", "Support"
        SALES = "sales", "Sales"
        SURVEY = "survey", "Survey"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    script_type = models.CharField(
        max_length=20, choices=ScriptType.choices, default=ScriptType.SALES
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # Content
    content = models.TextField()  # Markdown/HTML content
    sections = models.JSONField(default=list)  # Structured sections

    # Usage tracking
    times_used = models.IntegerField(default=0)
    avg_success_rate = models.FloatField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_call_scripts",
    )

    class Meta:
        verbose_name = "Call Script"
        verbose_name_plural = "Call Scripts"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CallSettings(TimeStampedModel):
    """Global call settings (singleton)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Recording settings
    auto_record_all = models.BooleanField(default=False)
    record_inbound = models.BooleanField(default=True)
    record_outbound = models.BooleanField(default=True)
    recording_format = models.CharField(max_length=10, default="mp3")
    recording_retention_days = models.IntegerField(default=365)

    # Transcription
    transcription_enabled = models.BooleanField(default=False)
    transcription_language = models.CharField(max_length=10, default="en-US")

    # Call handling
    default_ring_timeout = models.IntegerField(default=30)
    missed_call_notification = models.BooleanField(default=True)
    voicemail_notification = models.BooleanField(default=True)

    # Click-to-call
    click_to_call_enabled = models.BooleanField(default=True)
    confirm_before_dial = models.BooleanField(default=True)

    # Business hours
    enforce_business_hours = models.BooleanField(default=False)
    after_hours_action = models.CharField(max_length=50, default="voicemail")
    after_hours_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "Call Settings"
        verbose_name_plural = "Call Settings"

    def __str__(self):
        return "Call Settings"

    def save(self, *args, **kwargs):
        self.pk = self.pk or uuid.uuid4()
        if (
            CallSettings.objects.exists()
            and not CallSettings.objects.filter(pk=self.pk).exists()
        ):
            raise ValueError("Only one CallSettings instance allowed")
        super().save(*args, **kwargs)
