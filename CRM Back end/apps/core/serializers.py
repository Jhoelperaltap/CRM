"""
Serializers for backup and restore operations.
"""

from rest_framework import serializers

from apps.core.models import Backup


class _UserSummarySerializer(serializers.Serializer):
    """Minimal read-only representation of a User for nested display."""

    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)

    def get_full_name(self, obj):
        return obj.get_full_name()


class _CorporationSummarySerializer(serializers.Serializer):
    """Minimal read-only representation of a Corporation for nested display."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class BackupListSerializer(serializers.ModelSerializer):
    """
    Compact serializer used for backup list views.
    """

    created_by_name = serializers.SerializerMethodField()
    corporation_name = serializers.SerializerMethodField()
    file_size_human = serializers.CharField(read_only=True)

    class Meta:
        model = Backup
        fields = [
            "id",
            "name",
            "backup_type",
            "status",
            "file_size",
            "file_size_human",
            "corporation",
            "corporation_name",
            "created_by",
            "created_by_name",
            "celery_task_id",
            "completed_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None

    def get_corporation_name(self, obj):
        if obj.corporation:
            return obj.corporation.name
        return None


class BackupDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer used for backup detail views.
    """

    created_by = _UserSummarySerializer(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    file_size_human = serializers.CharField(read_only=True)

    class Meta:
        model = Backup
        fields = [
            "id",
            "name",
            "backup_type",
            "status",
            "file_path",
            "file_size",
            "file_size_human",
            "checksum",
            "corporation",
            "created_by",
            "celery_task_id",
            "error_message",
            "completed_at",
            "include_media",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BackupCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new backups.
    """

    class Meta:
        model = Backup
        fields = [
            "name",
            "backup_type",
            "corporation",
            "include_media",
        ]

    def validate(self, attrs):
        backup_type = attrs.get("backup_type")
        corporation = attrs.get("corporation")

        if backup_type == Backup.BackupType.TENANT and not corporation:
            raise serializers.ValidationError(
                {"corporation": "Corporation is required for tenant backups."}
            )

        if backup_type == Backup.BackupType.GLOBAL and corporation:
            raise serializers.ValidationError(
                {"corporation": "Corporation should not be set for global backups."}
            )

        return attrs

    def create(self, validated_data):
        # Set created_by from request context
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)

    def to_representation(self, instance):
        """Return the detail representation after create."""
        return BackupDetailSerializer(instance, context=self.context).data


class RestoreBackupSerializer(serializers.Serializer):
    """
    Serializer for restore confirmation.
    """

    confirm = serializers.BooleanField(
        required=True,
        help_text="Must be true to confirm the restore operation.",
    )

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must confirm the restore operation by setting confirm=true."
            )
        return value


class BackupTaskStatusSerializer(serializers.Serializer):
    """
    Serializer for Celery task status response.
    """

    task_id = serializers.CharField()
    status = serializers.CharField()
    result = serializers.DictField(required=False, allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)
