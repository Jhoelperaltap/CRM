from rest_framework import serializers

from apps.reports.models import Report, ReportFolder


class _OwnerSummary(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


# ── Folders ──────────────────────────────────────────────────────────

class ReportFolderSerializer(serializers.ModelSerializer):
    report_count = serializers.SerializerMethodField()

    class Meta:
        model = ReportFolder
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "report_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_report_count(self, obj) -> int:
        return getattr(obj, "_report_count", obj.reports.count())


class ReportFolderCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportFolder
        fields = ["name", "description"]


# ── Reports ──────────────────────────────────────────────────────────

class ReportListSerializer(serializers.ModelSerializer):
    owner_detail = _OwnerSummary(source="owner", read_only=True)
    folder_name = serializers.CharField(source="folder.name", default="", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "name",
            "report_type",
            "primary_module",
            "folder",
            "folder_name",
            "owner",
            "owner_detail",
            "frequency",
            "description",
            "last_run",
            "last_accessed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ReportDetailSerializer(serializers.ModelSerializer):
    owner_detail = _OwnerSummary(source="owner", read_only=True)
    folder_detail = ReportFolderSerializer(source="folder", read_only=True)
    shared_with_details = _OwnerSummary(source="shared_with", many=True, read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "name",
            "report_type",
            "primary_module",
            "related_modules",
            "folder",
            "folder_detail",
            "owner",
            "owner_detail",
            "description",
            "frequency",
            "shared_with",
            "shared_with_details",
            "columns",
            "filters",
            "sort_field",
            "sort_order",
            "chart_type",
            "chart_config",
            "last_run",
            "last_accessed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ReportCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "name",
            "report_type",
            "primary_module",
            "related_modules",
            "folder",
            "description",
            "frequency",
            "shared_with",
            "columns",
            "filters",
            "sort_field",
            "sort_order",
            "chart_type",
            "chart_config",
        ]

    def validate_related_modules(self, value):
        if len(value) > 2:
            raise serializers.ValidationError("A maximum of 2 related modules is allowed.")
        return value

    def to_representation(self, instance):
        return ReportDetailSerializer(instance, context=self.context).data
