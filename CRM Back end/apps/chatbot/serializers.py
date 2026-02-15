from rest_framework import serializers

from apps.chatbot.models import (
    ChatbotAppointmentSlot,
    ChatbotConfiguration,
    ChatbotConversation,
    ChatbotKnowledgeEntry,
    ChatbotMessage,
)

# ---------------------------------------------------------------------------
# Configuration Serializers (Admin)
# ---------------------------------------------------------------------------


class ChatbotConfigurationSerializer(serializers.ModelSerializer):
    """Full configuration for admin management."""

    class Meta:
        model = ChatbotConfiguration
        fields = [
            "id",
            "ai_provider",
            "api_key",
            "model_name",
            "temperature",
            "max_tokens",
            "system_prompt",
            "company_name",
            "welcome_message",
            "is_active",
            "allow_appointments",
            "handoff_enabled",
            "handoff_message",
            "fallback_message",
            "max_fallbacks_before_handoff",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "api_key": {"write_only": True},  # Never expose API key in responses
        }

    def to_representation(self, instance):
        """Mask the API key in responses."""
        data = super().to_representation(instance)
        if instance.api_key:
            data["api_key_set"] = True
        else:
            data["api_key_set"] = False
        return data


class ChatbotConfigurationUpdateSerializer(serializers.ModelSerializer):
    """Partial update serializer for configuration."""

    def validate_temperature(self, value):
        """Validate temperature is between 0 and 1."""
        if value is not None and (value < 0 or value > 1):
            raise serializers.ValidationError("Temperature must be between 0 and 1.")
        return value

    def validate_max_tokens(self, value):
        """Validate max_tokens is positive."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Max tokens must be a positive number.")
        return value

    class Meta:
        model = ChatbotConfiguration
        fields = [
            "ai_provider",
            "api_key",
            "model_name",
            "temperature",
            "max_tokens",
            "system_prompt",
            "company_name",
            "welcome_message",
            "is_active",
            "allow_appointments",
            "handoff_enabled",
            "handoff_message",
            "fallback_message",
            "max_fallbacks_before_handoff",
        ]
        extra_kwargs = {
            # All fields optional for PATCH
            "ai_provider": {"required": False},
            "api_key": {"required": False, "allow_blank": True},
            "model_name": {"required": False},
            "temperature": {"required": False},
            "max_tokens": {"required": False},
            "system_prompt": {"required": False, "allow_blank": True},
            "company_name": {"required": False, "allow_blank": True},
            "welcome_message": {"required": False, "allow_blank": True},
            "is_active": {"required": False},
            "allow_appointments": {"required": False},
            "handoff_enabled": {"required": False},
            "handoff_message": {"required": False, "allow_blank": True},
            "fallback_message": {"required": False, "allow_blank": True},
            "max_fallbacks_before_handoff": {"required": False},
        }

    def update(self, instance, validated_data):
        # Only update API key if a non-empty value is provided
        if "api_key" in validated_data and not validated_data["api_key"]:
            validated_data.pop("api_key")
        return super().update(instance, validated_data)


# ---------------------------------------------------------------------------
# Knowledge Base Serializers (Admin)
# ---------------------------------------------------------------------------


class ChatbotKnowledgeEntrySerializer(serializers.ModelSerializer):
    """Knowledge base entry serializer."""

    class Meta:
        model = ChatbotKnowledgeEntry
        fields = [
            "id",
            "entry_type",
            "title",
            "content",
            "keywords",
            "priority",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ChatbotKnowledgeEntryCreateSerializer(serializers.ModelSerializer):
    """Create serializer that auto-assigns configuration."""

    class Meta:
        model = ChatbotKnowledgeEntry
        fields = [
            "entry_type",
            "title",
            "content",
            "keywords",
            "priority",
            "is_active",
        ]

    def create(self, validated_data):
        # Always use the singleton configuration
        validated_data["configuration"] = ChatbotConfiguration.load()
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Appointment Slot Serializers (Admin)
# ---------------------------------------------------------------------------


class ChatbotAppointmentSlotSerializer(serializers.ModelSerializer):
    """Appointment slot serializer."""

    day_of_week_display = serializers.CharField(
        source="get_day_of_week_display", read_only=True
    )
    assigned_staff_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatbotAppointmentSlot
        fields = [
            "id",
            "day_of_week",
            "day_of_week_display",
            "start_time",
            "end_time",
            "slot_duration_minutes",
            "max_appointments",
            "is_active",
            "assigned_staff",
            "assigned_staff_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            return obj.assigned_staff.get_full_name()
        return None


# ---------------------------------------------------------------------------
# Conversation Serializers (Admin View)
# ---------------------------------------------------------------------------


class ChatbotMessageSerializer(serializers.ModelSerializer):
    """Message serializer."""

    class Meta:
        model = ChatbotMessage
        fields = [
            "id",
            "role",
            "message_type",
            "content",
            "metadata",
            "tokens_used",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ChatbotConversationListSerializer(serializers.ModelSerializer):
    """List view for conversations (admin)."""

    contact_name = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(read_only=True)
    last_message_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ChatbotConversation
        fields = [
            "id",
            "contact",
            "contact_name",
            "status",
            "fallback_count",
            "message_count",
            "last_message_at",
            "created_at",
        ]

    def get_contact_name(self, obj):
        return f"{obj.contact.first_name} {obj.contact.last_name}"


class ChatbotConversationDetailSerializer(serializers.ModelSerializer):
    """Detail view with messages (admin)."""

    contact_name = serializers.SerializerMethodField()
    messages = ChatbotMessageSerializer(many=True, read_only=True)
    assigned_staff_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatbotConversation
        fields = [
            "id",
            "contact",
            "contact_name",
            "status",
            "fallback_count",
            "assigned_staff",
            "assigned_staff_name",
            "handed_off_at",
            "closed_at",
            "appointment_context",
            "messages",
            "created_at",
            "updated_at",
        ]

    def get_contact_name(self, obj):
        return f"{obj.contact.first_name} {obj.contact.last_name}"

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            return obj.assigned_staff.get_full_name()
        return None


# ---------------------------------------------------------------------------
# Portal Serializers (Client-facing)
# ---------------------------------------------------------------------------


class PortalChatMessageSerializer(serializers.Serializer):
    """Incoming chat message from portal client."""

    message = serializers.CharField(max_length=2000)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)


class PortalChatResponseSerializer(serializers.Serializer):
    """Response to portal client."""

    conversation_id = serializers.UUIDField()
    message = serializers.CharField()
    action = serializers.CharField(allow_null=True)
    metadata = serializers.DictField(default=dict)
    status = serializers.CharField()


class PortalConversationSerializer(serializers.ModelSerializer):
    """Conversation view for portal client."""

    messages = ChatbotMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatbotConversation
        fields = [
            "id",
            "status",
            "messages",
            "created_at",
        ]


class PortalAvailableSlotsSerializer(serializers.Serializer):
    """Available appointment slots for portal."""

    date = serializers.DateField()
    time = serializers.TimeField()
    end_time = serializers.TimeField()


class PortalBookAppointmentSerializer(serializers.Serializer):
    """Appointment booking request from portal."""

    date = serializers.DateField()
    time = serializers.TimeField(format="%H:%M")
    service_type = serializers.ChoiceField(
        choices=[
            ("tax_preparation", "Tax Preparation"),
            ("tax_consultation", "Tax Consultation"),
            ("document_review", "Document Review"),
            ("general_inquiry", "General Inquiry"),
        ]
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
