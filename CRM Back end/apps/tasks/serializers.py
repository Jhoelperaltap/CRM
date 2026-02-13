from rest_framework import serializers

from apps.tasks.models import Task


class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)


class _CaseSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)


class TaskListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "priority",
            "status",
            "assigned_to",
            "assigned_to_name",
            "case",
            "contact",
            "due_date",
            "completed_at",
            "sla_hours",
            "sla_breached_at",
            "assigned_group",
            "created_at",
        ]
        read_only_fields = fields

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return ""


class TaskDetailSerializer(serializers.ModelSerializer):
    class _GroupSummarySerializer(serializers.Serializer):
        id = serializers.UUIDField(read_only=True)
        name = serializers.CharField(read_only=True)

    assigned_to = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    case = _CaseSummarySerializer(read_only=True)
    contact = _ContactSummarySerializer(read_only=True)
    assigned_group = _GroupSummarySerializer(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "status",
            "assigned_to",
            "created_by",
            "case",
            "contact",
            "due_date",
            "completed_at",
            "sla_hours",
            "sla_breached_at",
            "assigned_group",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "title",
            "description",
            "priority",
            "status",
            "assigned_to",
            "case",
            "contact",
            "due_date",
            "completed_at",
            "sla_hours",
            "assigned_group",
        ]

    def to_representation(self, instance):
        return TaskDetailSerializer(instance, context=self.context).data
