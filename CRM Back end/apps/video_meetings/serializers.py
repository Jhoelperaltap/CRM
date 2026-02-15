from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    MeetingParticipant,
    MeetingRecording,
    UserVideoConnection,
    VideoMeeting,
    VideoMeetingSettings,
    VideoProvider,
)

User = get_user_model()


class VideoProviderSerializer(serializers.ModelSerializer):
    provider_type_display = serializers.CharField(
        source="get_provider_type_display", read_only=True
    )

    class Meta:
        model = VideoProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "provider_type_display",
            "is_active",
            "is_default",
            "redirect_uri",
            "webhook_url",
            "default_duration",
            "auto_recording",
            "waiting_room_enabled",
            "require_password",
            "mute_on_entry",
            "settings",
            "created_at",
            "updated_at",
        ]


class VideoProviderWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "is_active",
            "is_default",
            "client_id",
            "client_secret",
            "redirect_uri",
            "api_key",
            "api_secret",
            "account_id",
            "webhook_url",
            "webhook_secret",
            "default_duration",
            "auto_recording",
            "waiting_room_enabled",
            "require_password",
            "mute_on_entry",
            "settings",
        ]
        extra_kwargs = {
            "client_secret": {"write_only": True},
            "api_secret": {"write_only": True},
            "webhook_secret": {"write_only": True},
        }


class UserVideoConnectionSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    provider_type = serializers.CharField(
        source="provider.provider_type", read_only=True
    )
    is_token_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserVideoConnection
        fields = [
            "id",
            "user",
            "provider",
            "provider_name",
            "provider_type",
            "is_active",
            "provider_user_id",
            "provider_email",
            "provider_name",
            "personal_meeting_url",
            "personal_meeting_id",
            "token_expires_at",
            "is_token_expired",
            "created_at",
        ]
        read_only_fields = [
            "user",
            "provider_user_id",
            "provider_email",
            "personal_meeting_url",
            "personal_meeting_id",
            "token_expires_at",
        ]


class MeetingParticipantSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    join_status_display = serializers.CharField(
        source="get_join_status_display", read_only=True
    )
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = MeetingParticipant
        fields = [
            "id",
            "meeting",
            "user",
            "user_name",
            "contact",
            "contact_name",
            "email",
            "name",
            "role",
            "role_display",
            "join_status",
            "join_status_display",
            "joined_at",
            "left_at",
            "duration_in_meeting",
            "created_at",
        ]
        read_only_fields = ["meeting", "joined_at", "left_at", "duration_in_meeting"]


class MeetingRecordingSerializer(serializers.ModelSerializer):
    recording_type_display = serializers.CharField(
        source="get_recording_type_display", read_only=True
    )

    class Meta:
        model = MeetingRecording
        fields = [
            "id",
            "meeting",
            "recording_type",
            "recording_type_display",
            "file_name",
            "file_size",
            "file_type",
            "duration",
            "download_url",
            "play_url",
            "share_url",
            "is_ready",
            "download_expires_at",
            "transcription",
            "transcription_status",
            "created_at",
        ]
        read_only_fields = ["meeting"]


class VideoMeetingListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    meeting_type_display = serializers.CharField(
        source="get_meeting_type_display", read_only=True
    )
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    provider_type = serializers.CharField(
        source="provider.provider_type", read_only=True
    )
    host_name = serializers.CharField(source="host.get_full_name", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    case_number = serializers.CharField(source="case.case_number", read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = VideoMeeting
        fields = [
            "id",
            "provider",
            "provider_name",
            "provider_type",
            "external_id",
            "meeting_number",
            "title",
            "status",
            "status_display",
            "meeting_type",
            "meeting_type_display",
            "scheduled_start",
            "scheduled_end",
            "duration",
            "join_url",
            "host",
            "host_name",
            "contact",
            "contact_name",
            "case",
            "case_number",
            "participant_count",
            "participants_count",
            "created_at",
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()


class VideoMeetingDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    meeting_type_display = serializers.CharField(
        source="get_meeting_type_display", read_only=True
    )
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    provider_type = serializers.CharField(
        source="provider.provider_type", read_only=True
    )
    host_name = serializers.CharField(source="host.get_full_name", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    case_number = serializers.CharField(source="case.case_number", read_only=True)
    participants = MeetingParticipantSerializer(many=True, read_only=True)
    recordings = MeetingRecordingSerializer(many=True, read_only=True)

    class Meta:
        model = VideoMeeting
        fields = [
            "id",
            "provider",
            "provider_name",
            "provider_type",
            "external_id",
            "meeting_number",
            "password",
            "title",
            "description",
            "status",
            "status_display",
            "meeting_type",
            "meeting_type_display",
            "scheduled_start",
            "scheduled_end",
            "duration",
            "actual_start",
            "actual_end",
            "timezone",
            "join_url",
            "host_url",
            "registration_url",
            "host",
            "host_name",
            "waiting_room",
            "require_registration",
            "auto_recording",
            "mute_on_entry",
            "allow_screen_sharing",
            "appointment",
            "contact",
            "contact_name",
            "case",
            "case_number",
            "recording_url",
            "recording_duration",
            "participants_count",
            "participants",
            "recordings",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "external_id",
            "meeting_number",
            "join_url",
            "host_url",
            "registration_url",
            "actual_start",
            "actual_end",
            "recording_url",
            "recording_duration",
            "participants_count",
        ]


class CreateMeetingSerializer(serializers.Serializer):
    """Serializer for creating a new video meeting"""

    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    scheduled_start = serializers.DateTimeField()
    duration = serializers.IntegerField(min_value=5, max_value=480, default=60)
    timezone = serializers.CharField(default="UTC")

    # Provider settings
    provider_id = serializers.UUIDField(required=False)
    waiting_room = serializers.BooleanField(default=True)
    auto_recording = serializers.ChoiceField(
        choices=["none", "local", "cloud"], default="none"
    )
    mute_on_entry = serializers.BooleanField(default=True)

    # Participants
    participant_emails = serializers.ListField(
        child=serializers.EmailField(), required=False, default=list
    )

    # Related entities
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    case_id = serializers.UUIDField(required=False, allow_null=True)


class VideoMeetingSettingsSerializer(serializers.ModelSerializer):
    default_provider_name = serializers.CharField(
        source="default_provider.name", read_only=True
    )

    class Meta:
        model = VideoMeetingSettings
        fields = [
            "id",
            "default_provider",
            "default_provider_name",
            "default_duration",
            "default_waiting_room",
            "default_mute_on_entry",
            "default_auto_recording",
            "auto_add_to_appointments",
            "send_calendar_invites",
            "send_reminder_emails",
            "reminder_minutes_before",
            "recording_retention_days",
            "auto_delete_recordings",
            "updated_at",
        ]
