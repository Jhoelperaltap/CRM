from rest_framework import serializers

from apps.audit.models import AuditLog


class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class AuditLogListSerializer(serializers.ModelSerializer):
    user = _UserSummarySerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "action",
            "module",
            "object_id",
            "object_repr",
            "changes",
            "ip_address",
            "user_agent",
            "request_path",
            "timestamp",
        ]
        read_only_fields = fields
