from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ChatDepartment,
    ChatAgent,
    ChatSession,
    ChatMessage,
    CannedResponse,
    ChatWidgetSettings,
    OfflineMessage,
)

User = get_user_model()


class ChatDepartmentSerializer(serializers.ModelSerializer):
    online_agents_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ChatDepartment
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "order",
            "auto_assign",
            "max_concurrent_chats",
            "offline_message",
            "collect_email_offline",
            "online_agents_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ChatAgentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_avatar = serializers.SerializerMethodField()
    department_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ChatDepartment.objects.all(),
        source="departments",
        required=False,
    )

    class Meta:
        model = ChatAgent
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "user_avatar",
            "departments",
            "department_ids",
            "is_available",
            "status",
            "status_message",
            "max_concurrent_chats",
            "current_chat_count",
            "total_chats_handled",
            "avg_response_time",
            "avg_rating",
            "sound_enabled",
            "desktop_notifications",
            "last_seen",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "current_chat_count",
            "total_chats_handled",
            "avg_response_time",
            "avg_rating",
            "last_seen",
            "created_at",
        ]

    def get_user_avatar(self, obj):
        if hasattr(obj.user, "avatar") and obj.user.avatar:
            return obj.user.avatar.url
        return None


class ChatAgentStatusSerializer(serializers.Serializer):
    """Serializer for updating agent status."""

    status = serializers.ChoiceField(choices=ChatAgent.Status.choices)
    status_message = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    agent_name = serializers.CharField(
        source="agent.user.get_full_name", read_only=True
    )

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "session",
            "message_type",
            "sender_type",
            "agent",
            "agent_name",
            "sender_name",
            "content",
            "file",
            "file_name",
            "file_size",
            "file_type",
            "is_read",
            "read_at",
            "delivered_at",
            "is_internal",
            "created_at",
        ]
        read_only_fields = ["id", "delivered_at", "created_at"]

    def get_sender_name(self, obj):
        if obj.sender_name:
            return obj.sender_name
        if obj.agent:
            return obj.agent.user.get_full_name()
        if obj.session:
            return obj.session.visitor_name or "Visitor"
        return "Unknown"


class ChatSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for chat list."""

    assigned_agent_name = serializers.CharField(
        source="assigned_agent.user.get_full_name", read_only=True
    )
    department_name = serializers.CharField(source="department.name", read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "session_id",
            "status",
            "source",
            "visitor_name",
            "visitor_email",
            "department",
            "department_name",
            "assigned_agent",
            "assigned_agent_name",
            "subject",
            "started_at",
            "wait_time",
            "last_message",
            "unread_count",
            "message_count",
            "rating",
        ]

    def get_last_message(self, obj):
        last_msg = obj.messages.exclude(is_internal=True).last()
        if last_msg:
            return {
                "content": last_msg.content[:100],
                "sender_type": last_msg.sender_type,
                "created_at": last_msg.created_at,
            }
        return None

    def get_unread_count(self, obj):
        return obj.messages.filter(is_read=False, sender_type="visitor").count()


class ChatSessionSerializer(serializers.ModelSerializer):
    """Full serializer for chat session detail."""

    assigned_agent_name = serializers.CharField(
        source="assigned_agent.user.get_full_name", read_only=True
    )
    department_name = serializers.CharField(source="department.name", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    duration = serializers.DurationField(read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "session_id",
            "status",
            "source",
            "department",
            "department_name",
            "visitor_name",
            "visitor_email",
            "visitor_phone",
            "portal_user",
            "contact",
            "contact_name",
            "assigned_agent",
            "assigned_agent_name",
            "started_at",
            "first_response_at",
            "ended_at",
            "wait_time",
            "duration",
            "subject",
            "initial_message",
            "ip_address",
            "user_agent",
            "page_url",
            "referrer",
            "tags",
            "custom_fields",
            "rating",
            "rating_comment",
            "transcript_sent",
            "transcript_sent_at",
            "messages",
            "message_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "session_id",
            "started_at",
            "first_response_at",
            "ended_at",
            "wait_time",
            "duration",
            "transcript_sent",
            "transcript_sent_at",
            "created_at",
            "updated_at",
        ]


class StartChatSerializer(serializers.Serializer):
    """Serializer for starting a new chat session."""

    visitor_name = serializers.CharField(max_length=100, required=False)
    visitor_email = serializers.EmailField(required=False)
    visitor_phone = serializers.CharField(
        max_length=30, required=False, allow_blank=True
    )
    department = serializers.UUIDField(required=False)
    subject = serializers.CharField(max_length=255, required=False)
    initial_message = serializers.CharField(required=True)
    page_url = serializers.URLField(required=False, allow_blank=True)


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending a chat message."""

    content = serializers.CharField()
    message_type = serializers.ChoiceField(
        choices=ChatMessage.MessageType.choices, default="text"
    )
    is_internal = serializers.BooleanField(default=False)


class TransferChatSerializer(serializers.Serializer):
    """Serializer for transferring a chat."""

    agent_id = serializers.UUIDField(required=False)
    department_id = serializers.UUIDField(required=False)
    note = serializers.CharField(required=False, allow_blank=True)


class RateChatSerializer(serializers.Serializer):
    """Serializer for rating a chat."""

    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)


class CannedResponseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = CannedResponse
        fields = [
            "id",
            "title",
            "shortcut",
            "content",
            "department",
            "department_name",
            "created_by",
            "created_by_name",
            "is_global",
            "is_active",
            "usage_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "usage_count",
            "created_at",
            "updated_at",
        ]


class ChatWidgetSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatWidgetSettings
        fields = [
            "id",
            "primary_color",
            "position",
            "button_icon",
            "company_name",
            "welcome_message",
            "away_message",
            "require_name",
            "require_email",
            "require_phone",
            "require_department",
            "auto_popup",
            "auto_popup_delay",
            "play_sound",
            "show_agent_photo",
            "show_typing_indicator",
            "use_operating_hours",
            "operating_hours",
            "timezone",
            "file_upload_enabled",
            "max_file_size_mb",
            "allowed_file_types",
            "enable_rating",
            "rating_prompt",
            "offer_transcript",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class OfflineMessageSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    read_by_name = serializers.CharField(source="read_by.get_full_name", read_only=True)
    responded_by_name = serializers.CharField(
        source="responded_by.get_full_name", read_only=True
    )

    class Meta:
        model = OfflineMessage
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "message",
            "department",
            "department_name",
            "ip_address",
            "page_url",
            "is_read",
            "read_by",
            "read_by_name",
            "read_at",
            "is_responded",
            "responded_by",
            "responded_by_name",
            "responded_at",
            "converted_to_contact",
            "converted_to_case",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "ip_address",
            "page_url",
            "read_by",
            "read_at",
            "responded_by",
            "responded_at",
            "created_at",
        ]


class ChatStatsSerializer(serializers.Serializer):
    """Serializer for chat statistics."""

    total_chats = serializers.IntegerField()
    active_chats = serializers.IntegerField()
    waiting_chats = serializers.IntegerField()
    closed_today = serializers.IntegerField()
    avg_wait_time = serializers.CharField(allow_null=True)
    avg_duration = serializers.CharField(allow_null=True)
    avg_rating = serializers.FloatField(allow_null=True)
    online_agents = serializers.IntegerField()
    total_agents = serializers.IntegerField()
