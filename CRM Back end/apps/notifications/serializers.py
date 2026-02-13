from rest_framework import serializers

from apps.notifications.models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "recipient_name",
            "notification_type",
            "title",
            "message",
            "severity",
            "related_object_type",
            "related_object_id",
            "action_url",
            "is_read",
            "email_sent",
            "created_at",
        ]
        read_only_fields = fields

    def get_recipient_name(self, obj):
        return obj.recipient.get_full_name() if obj.recipient else None


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "user",
            "notification_type",
            "in_app_enabled",
            "email_enabled",
        ]
        read_only_fields = ["id", "user"]
