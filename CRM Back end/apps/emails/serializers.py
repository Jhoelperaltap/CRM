from rest_framework import serializers

from apps.emails.models import (
    EmailAttachment,
    EmailMessage,
    EmailTemplate,
    EmailThread,
)


class EmailAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAttachment
        fields = ["id", "filename", "mime_type", "file_size", "file", "document"]
        read_only_fields = ["id", "file_size", "mime_type"]


class EmailMessageListSerializer(serializers.ModelSerializer):
    attachment_count = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailMessage
        fields = [
            "id", "message_id", "direction", "from_address", "to_addresses",
            "subject", "sent_at", "is_read", "is_starred", "folder",
            "contact", "case", "assigned_to", "thread",
            "attachment_count", "contact_name", "assigned_to_name",
        ]

    def get_attachment_count(self, obj):
        return obj.attachments.count()

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return None


class EmailMessageDetailSerializer(serializers.ModelSerializer):
    attachments = EmailAttachmentSerializer(many=True, read_only=True)
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    case_title = serializers.SerializerMethodField()

    class Meta:
        model = EmailMessage
        fields = [
            "id", "account", "thread", "message_id", "in_reply_to", "references",
            "direction", "from_address", "to_addresses", "cc_addresses", "bcc_addresses",
            "subject", "body_text", "sent_at", "is_read", "is_starred", "folder",
            "contact", "case", "assigned_to", "sent_by",
            "attachments", "contact_name", "assigned_to_name", "case_title",
            "created_at",
        ]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return None

    def get_case_title(self, obj):
        if obj.case:
            return f"{obj.case.case_number} — {obj.case.title}"
        return None


class ComposeEmailSerializer(serializers.Serializer):
    # account is now optional; the backend enforces the user's assigned email_account
    account = serializers.UUIDField(required=False, allow_null=True)
    to_addresses = serializers.ListField(child=serializers.EmailField())
    cc_addresses = serializers.ListField(
        child=serializers.EmailField(), required=False, default=list
    )
    bcc_addresses = serializers.ListField(
        child=serializers.EmailField(), required=False, default=list
    )
    subject = serializers.CharField(max_length=500)
    body_text = serializers.CharField()
    contact = serializers.UUIDField(required=False, allow_null=True, default=None)
    case = serializers.UUIDField(required=False, allow_null=True, default=None)
    in_reply_to = serializers.CharField(required=False, default="")
    references = serializers.CharField(required=False, default="")
    template_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    template_context = serializers.DictField(required=False, default=dict)
    attachment_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list,
    )


class EmailThreadListSerializer(serializers.ModelSerializer):
    last_message_subject = serializers.SerializerMethodField()
    last_message_from = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    has_unread = serializers.SerializerMethodField()

    class Meta:
        model = EmailThread
        fields = [
            "id", "subject", "contact", "case", "last_message_at",
            "message_count", "is_archived",
            "last_message_subject", "last_message_from",
            "contact_name", "has_unread",
        ]

    def get_last_message_subject(self, obj):
        last = obj.messages.order_by("-sent_at").first()
        return last.subject if last else None

    def get_last_message_from(self, obj):
        last = obj.messages.order_by("-sent_at").first()
        return last.from_address if last else None

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

    def get_has_unread(self, obj):
        return obj.messages.filter(is_read=False, direction="inbound").exists()


class EmailThreadDetailSerializer(serializers.ModelSerializer):
    messages = EmailMessageDetailSerializer(many=True, read_only=True)
    contact_name = serializers.SerializerMethodField()
    case_title = serializers.SerializerMethodField()

    class Meta:
        model = EmailThread
        fields = [
            "id", "subject", "contact", "case", "last_message_at",
            "message_count", "is_archived", "messages",
            "contact_name", "case_title",
        ]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

    def get_case_title(self, obj):
        if obj.case:
            return f"{obj.case.case_number} — {obj.case.title}"
        return None


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            "id", "name", "subject", "body_text", "variables",
            "is_active", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class EmailTemplateRenderSerializer(serializers.Serializer):
    context = serializers.DictField()
