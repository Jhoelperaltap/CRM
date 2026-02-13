from rest_framework import serializers

from apps.workflows.models import WorkflowExecutionLog, WorkflowRule


class WorkflowRuleSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowRule
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "trigger_type",
            "trigger_config",
            "conditions",
            "action_type",
            "action_config",
            "created_by",
            "created_by_name",
            "execution_count",
            "last_executed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_name",
            "execution_count",
            "last_executed_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class WorkflowExecutionLogSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source="rule.name", read_only=True)

    class Meta:
        model = WorkflowExecutionLog
        fields = [
            "id",
            "rule",
            "rule_name",
            "triggered_at",
            "trigger_object_type",
            "trigger_object_id",
            "action_taken",
            "result",
            "error_message",
            "created_at",
        ]
        read_only_fields = fields
