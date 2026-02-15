from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Call,
    CallQueue,
    CallQueueMember,
    CallScript,
    CallSettings,
    PhoneLine,
    TelephonyProvider,
    Voicemail,
)

User = get_user_model()


class TelephonyProviderSerializer(serializers.ModelSerializer):
    provider_type_display = serializers.CharField(
        source="get_provider_type_display", read_only=True
    )

    class Meta:
        model = TelephonyProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "provider_type_display",
            "is_active",
            "is_default",
            "account_sid",
            "api_key",
            "webhook_url",
            "default_caller_id",
            "recording_enabled",
            "settings",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "auth_token": {"write_only": True},
            "api_secret": {"write_only": True},
        }


class TelephonyProviderWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelephonyProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "is_active",
            "is_default",
            "account_sid",
            "auth_token",
            "api_key",
            "api_secret",
            "webhook_url",
            "default_caller_id",
            "recording_enabled",
            "settings",
        ]


class PhoneLineSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    assigned_user_name = serializers.CharField(
        source="assigned_user.get_full_name", read_only=True
    )
    line_type_display = serializers.CharField(
        source="get_line_type_display", read_only=True
    )

    class Meta:
        model = PhoneLine
        fields = [
            "id",
            "provider",
            "provider_name",
            "phone_number",
            "friendly_name",
            "line_type",
            "line_type_display",
            "is_active",
            "assigned_user",
            "assigned_user_name",
            "assigned_department",
            "voicemail_enabled",
            "voicemail_greeting_url",
            "forward_to",
            "ring_timeout",
            "created_at",
            "updated_at",
        ]


class CallSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    call_type_display = serializers.CharField(
        source="get_call_type_display", read_only=True
    )
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    corporation_name = serializers.CharField(source="corporation.name", read_only=True)
    case_number = serializers.CharField(source="case.case_number", read_only=True)
    phone_line_number = serializers.CharField(
        source="phone_line.phone_number", read_only=True
    )

    class Meta:
        model = Call
        fields = [
            "id",
            "external_id",
            "direction",
            "direction_display",
            "status",
            "status_display",
            "call_type",
            "call_type_display",
            "from_number",
            "to_number",
            "phone_line",
            "phone_line_number",
            "user",
            "user_name",
            "transferred_from",
            "contact",
            "contact_name",
            "corporation",
            "corporation_name",
            "case",
            "case_number",
            "started_at",
            "answered_at",
            "ended_at",
            "duration",
            "ring_duration",
            "is_recorded",
            "recording_url",
            "recording_duration",
            "transcription",
            "transcription_status",
            "subject",
            "notes",
            "outcome",
            "follow_up_date",
            "follow_up_notes",
            "call_quality_score",
            "customer_sentiment",
            "provider_data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["external_id", "provider_data"]


class CallCreateSerializer(serializers.ModelSerializer):
    """Serializer for initiating outbound calls"""

    class Meta:
        model = Call
        fields = [
            "to_number",
            "call_type",
            "contact",
            "corporation",
            "case",
            "subject",
            "notes",
        ]


class CallUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating call details after completion"""

    class Meta:
        model = Call
        fields = [
            "subject",
            "notes",
            "outcome",
            "follow_up_date",
            "follow_up_notes",
            "call_quality_score",
            "customer_sentiment",
            "contact",
            "corporation",
            "case",
        ]


class CallQueueMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = CallQueueMember
        fields = [
            "id",
            "queue",
            "user",
            "user_name",
            "user_email",
            "priority",
            "is_active",
            "is_available",
            "paused_at",
            "pause_reason",
            "calls_taken",
            "last_call_at",
            "created_at",
        ]
        read_only_fields = ["calls_taken", "last_call_at"]


class CallQueueSerializer(serializers.ModelSerializer):
    strategy_display = serializers.CharField(
        source="get_strategy_display", read_only=True
    )
    member_count = serializers.SerializerMethodField()
    active_members = serializers.SerializerMethodField()
    queue_members = CallQueueMemberSerializer(
        source="callqueuemember_set", many=True, read_only=True
    )

    class Meta:
        model = CallQueue
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "strategy",
            "strategy_display",
            "timeout",
            "max_wait_time",
            "member_count",
            "active_members",
            "queue_members",
            "hold_music_url",
            "announce_position",
            "announce_wait_time",
            "overflow_action",
            "overflow_destination",
            "created_at",
            "updated_at",
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_active_members(self, obj):
        return CallQueueMember.objects.filter(
            queue=obj, is_active=True, is_available=True
        ).count()


class VoicemailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    phone_line_number = serializers.CharField(
        source="phone_line.phone_number", read_only=True
    )
    listened_by_name = serializers.CharField(
        source="listened_by.get_full_name", read_only=True
    )
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = Voicemail
        fields = [
            "id",
            "phone_line",
            "phone_line_number",
            "call",
            "caller_number",
            "caller_name",
            "audio_url",
            "duration",
            "transcription",
            "status",
            "status_display",
            "listened_by",
            "listened_by_name",
            "listened_at",
            "contact",
            "contact_name",
            "created_at",
        ]
        read_only_fields = ["audio_url", "duration", "transcription"]


class CallScriptSerializer(serializers.ModelSerializer):
    script_type_display = serializers.CharField(
        source="get_script_type_display", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = CallScript
        fields = [
            "id",
            "name",
            "script_type",
            "script_type_display",
            "description",
            "is_active",
            "content",
            "sections",
            "times_used",
            "avg_success_rate",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["times_used", "avg_success_rate", "created_by"]


class CallSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallSettings
        fields = [
            "id",
            "auto_record_all",
            "record_inbound",
            "record_outbound",
            "recording_format",
            "recording_retention_days",
            "transcription_enabled",
            "transcription_language",
            "default_ring_timeout",
            "missed_call_notification",
            "voicemail_notification",
            "click_to_call_enabled",
            "confirm_before_dial",
            "enforce_business_hours",
            "after_hours_action",
            "after_hours_message",
            "updated_at",
        ]


class CallStatsSerializer(serializers.Serializer):
    """Serializer for call statistics"""

    total_calls = serializers.IntegerField()
    inbound_calls = serializers.IntegerField()
    outbound_calls = serializers.IntegerField()
    answered_calls = serializers.IntegerField()
    missed_calls = serializers.IntegerField()
    total_duration = serializers.IntegerField()
    avg_duration = serializers.FloatField()
    avg_ring_time = serializers.FloatField()


class ClickToCallSerializer(serializers.Serializer):
    """Serializer for click-to-call request"""

    phone_number = serializers.CharField(max_length=20)
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    corporation_id = serializers.UUIDField(required=False, allow_null=True)
    case_id = serializers.UUIDField(required=False, allow_null=True)
    call_type = serializers.ChoiceField(
        choices=Call.CallType.choices, default=Call.CallType.REGULAR
    )
    phone_line_id = serializers.UUIDField(required=False, allow_null=True)
