import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class VideoProvider(TimeStampedModel):
    """Configuration for video conferencing providers"""

    class ProviderType(models.TextChoices):
        ZOOM = "zoom", "Zoom"
        GOOGLE_MEET = "google_meet", "Google Meet"
        TEAMS = "teams", "Microsoft Teams"
        WEBEX = "webex", "Cisco Webex"
        CUSTOM = "custom", "Custom"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    provider_type = models.CharField(
        max_length=20, choices=ProviderType.choices, default=ProviderType.ZOOM
    )
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    # OAuth credentials
    client_id = models.CharField(max_length=255, blank=True)
    client_secret = models.CharField(max_length=255, blank=True)
    redirect_uri = models.URLField(blank=True)

    # API credentials (for non-OAuth)
    api_key = models.CharField(max_length=255, blank=True)
    api_secret = models.CharField(max_length=255, blank=True)
    account_id = models.CharField(max_length=255, blank=True)

    # Webhook
    webhook_url = models.URLField(blank=True)
    webhook_secret = models.CharField(max_length=255, blank=True)

    # Default settings
    default_duration = models.IntegerField(default=60)  # minutes
    auto_recording = models.BooleanField(default=False)
    waiting_room_enabled = models.BooleanField(default=True)
    require_password = models.BooleanField(default=True)
    mute_on_entry = models.BooleanField(default=True)

    # Provider-specific settings
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Video Provider"
        verbose_name_plural = "Video Providers"
        ordering = ["-is_default", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"

    def save(self, *args, **kwargs):
        if self.is_default:
            VideoProvider.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)


class UserVideoConnection(TimeStampedModel):
    """User's connected video accounts (OAuth tokens)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="video_connections",
    )
    provider = models.ForeignKey(
        VideoProvider, on_delete=models.CASCADE, related_name="user_connections"
    )
    is_active = models.BooleanField(default=True)

    # OAuth tokens
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)

    # Provider user info
    provider_user_id = models.CharField(max_length=255, blank=True)
    provider_email = models.EmailField(blank=True)
    provider_name = models.CharField(max_length=255, blank=True)

    # Personal meeting info
    personal_meeting_url = models.URLField(blank=True)
    personal_meeting_id = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name = "User Video Connection"
        verbose_name_plural = "User Video Connections"
        unique_together = ["user", "provider"]

    def __str__(self):
        return f"{self.user} - {self.provider}"

    @property
    def is_token_expired(self):
        from django.utils import timezone

        if not self.token_expires_at:
            return False
        return timezone.now() >= self.token_expires_at


class VideoMeeting(TimeStampedModel):
    """Video meeting records"""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        STARTED = "started", "Started"
        ENDED = "ended", "Ended"
        CANCELED = "canceled", "Canceled"

    class MeetingType(models.TextChoices):
        INSTANT = "instant", "Instant Meeting"
        SCHEDULED = "scheduled", "Scheduled Meeting"
        RECURRING = "recurring", "Recurring Meeting"
        PERSONAL = "personal", "Personal Room"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        VideoProvider, on_delete=models.SET_NULL, null=True, related_name="meetings"
    )

    # Meeting identifiers
    external_id = models.CharField(max_length=100, blank=True, db_index=True)
    meeting_number = models.CharField(max_length=50, blank=True)
    password = models.CharField(max_length=50, blank=True)

    # Meeting details
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    meeting_type = models.CharField(
        max_length=20, choices=MeetingType.choices, default=MeetingType.SCHEDULED
    )

    # Timing
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    duration = models.IntegerField(default=60)  # minutes
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")

    # URLs
    join_url = models.URLField(blank=True)
    host_url = models.URLField(blank=True)
    registration_url = models.URLField(blank=True)

    # Host/Organizer
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="hosted_video_meetings",
    )

    # Settings
    waiting_room = models.BooleanField(default=True)
    require_registration = models.BooleanField(default=False)
    auto_recording = models.CharField(
        max_length=20,
        default="none",
        choices=[
            ("none", "None"),
            ("local", "Local"),
            ("cloud", "Cloud"),
        ],
    )
    mute_on_entry = models.BooleanField(default=True)
    allow_screen_sharing = models.BooleanField(default=True)

    # Related entities
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="video_meetings",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="video_meetings",
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="video_meetings",
    )

    # Recording
    recording_url = models.URLField(blank=True)
    recording_duration = models.IntegerField(default=0)
    recording_file_size = models.BigIntegerField(default=0)
    transcription = models.TextField(blank=True)

    # Stats
    participants_count = models.IntegerField(default=0)

    # Provider data
    provider_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Video Meeting"
        verbose_name_plural = "Video Meetings"
        ordering = ["-scheduled_start"]
        indexes = [
            models.Index(fields=["scheduled_start"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.scheduled_start})"


class MeetingParticipant(TimeStampedModel):
    """Participants of a video meeting"""

    class Role(models.TextChoices):
        HOST = "host", "Host"
        CO_HOST = "co_host", "Co-host"
        PARTICIPANT = "participant", "Participant"

    class JoinStatus(models.TextChoices):
        INVITED = "invited", "Invited"
        REGISTERED = "registered", "Registered"
        JOINED = "joined", "Joined"
        LEFT = "left", "Left"
        NO_SHOW = "no_show", "No Show"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(
        VideoMeeting, on_delete=models.CASCADE, related_name="participants"
    )

    # Participant identity
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meeting_participations",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meeting_participations",
    )
    email = models.EmailField()
    name = models.CharField(max_length=200)

    # Role and status
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.PARTICIPANT
    )
    join_status = models.CharField(
        max_length=20, choices=JoinStatus.choices, default=JoinStatus.INVITED
    )

    # Join details
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_in_meeting = models.IntegerField(default=0)  # seconds

    # Provider data
    provider_participant_id = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "Meeting Participant"
        verbose_name_plural = "Meeting Participants"
        unique_together = ["meeting", "email"]

    def __str__(self):
        return f"{self.name} - {self.meeting.title}"


class MeetingRecording(TimeStampedModel):
    """Recording files from video meetings"""

    class RecordingType(models.TextChoices):
        SHARED_SCREEN_WITH_SPEAKER = (
            "shared_screen_speaker",
            "Shared Screen with Speaker",
        )
        SHARED_SCREEN_WITH_GALLERY = (
            "shared_screen_gallery",
            "Shared Screen with Gallery",
        )
        SPEAKER_VIEW = "speaker_view", "Speaker View"
        GALLERY_VIEW = "gallery_view", "Gallery View"
        AUDIO_ONLY = "audio_only", "Audio Only"
        CHAT = "chat", "Chat Transcript"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(
        VideoMeeting, on_delete=models.CASCADE, related_name="recordings"
    )

    # Recording details
    recording_type = models.CharField(
        max_length=30,
        choices=RecordingType.choices,
        default=RecordingType.SHARED_SCREEN_WITH_SPEAKER,
    )
    external_id = models.CharField(max_length=100, blank=True)

    # File info
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=20, blank=True)
    duration = models.IntegerField(default=0)  # seconds

    # URLs
    download_url = models.URLField(blank=True)
    play_url = models.URLField(blank=True)
    share_url = models.URLField(blank=True)

    # Status
    is_ready = models.BooleanField(default=False)
    download_expires_at = models.DateTimeField(null=True, blank=True)

    # Transcription
    transcription = models.TextField(blank=True)
    transcription_status = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name = "Meeting Recording"
        verbose_name_plural = "Meeting Recordings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.meeting.title} - {self.get_recording_type_display()}"


class VideoMeetingSettings(TimeStampedModel):
    """Global video meeting settings (singleton)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Default provider
    default_provider = models.ForeignKey(
        VideoProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    # Default meeting settings
    default_duration = models.IntegerField(default=60)
    default_waiting_room = models.BooleanField(default=True)
    default_mute_on_entry = models.BooleanField(default=True)
    default_auto_recording = models.CharField(
        max_length=20,
        default="none",
        choices=[
            ("none", "None"),
            ("local", "Local"),
            ("cloud", "Cloud"),
        ],
    )

    # Integration settings
    auto_add_to_appointments = models.BooleanField(default=True)
    send_calendar_invites = models.BooleanField(default=True)
    send_reminder_emails = models.BooleanField(default=True)
    reminder_minutes_before = models.IntegerField(default=15)

    # Recording retention
    recording_retention_days = models.IntegerField(default=90)
    auto_delete_recordings = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Video Meeting Settings"
        verbose_name_plural = "Video Meeting Settings"

    def __str__(self):
        return "Video Meeting Settings"

    def save(self, *args, **kwargs):
        self.pk = self.pk or uuid.uuid4()
        if (
            VideoMeetingSettings.objects.exists()
            and not VideoMeetingSettings.objects.filter(pk=self.pk).exists()
        ):
            raise ValueError("Only one VideoMeetingSettings instance allowed")
        super().save(*args, **kwargs)
