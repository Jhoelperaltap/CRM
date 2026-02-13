from rest_framework import serializers

from apps.audit.models import EncryptedFieldAccessLog, LoginHistory, SettingsLog


class LoginHistorySerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = LoginHistory
        fields = [
            "id",
            "user",
            "user_email",
            "email_attempted",
            "status",
            "ip_address",
            "user_agent",
            "failure_reason",
            "timestamp",
        ]


class SettingsLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = SettingsLog
        fields = [
            "id",
            "user",
            "user_email",
            "setting_area",
            "setting_key",
            "old_value",
            "new_value",
            "ip_address",
            "user_agent",
            "timestamp",
        ]


class EncryptedFieldAccessLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = EncryptedFieldAccessLog
        fields = [
            "id",
            "user",
            "user_email",
            "module",
            "object_id",
            "field_name",
            "access_type",
            "ip_address",
            "timestamp",
        ]
