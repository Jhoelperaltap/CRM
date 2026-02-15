from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Playbook,
    PlaybookStep,
    PlaybookExecution,
    PlaybookStepExecution,
    PlaybookTemplate,
)

User = get_user_model()


class PlaybookStepSerializer(serializers.ModelSerializer):
    step_type_display = serializers.CharField(
        source="get_step_type_display", read_only=True
    )
    wait_unit_display = serializers.CharField(
        source="get_wait_unit_display", read_only=True
    )

    class Meta:
        model = PlaybookStep
        fields = [
            "id",
            "playbook",
            "order",
            "name",
            "description",
            "step_type",
            "step_type_display",
            "is_required",
            "is_active",
            "config",
            "wait_duration",
            "wait_unit",
            "wait_unit_display",
            "condition",
            "next_step",
            "reminder_days",
            "escalate_after_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["playbook"]


class PlaybookListSerializer(serializers.ModelSerializer):
    playbook_type_display = serializers.CharField(
        source="get_playbook_type_display", read_only=True
    )
    trigger_type_display = serializers.CharField(
        source="get_trigger_type_display", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    step_count = serializers.SerializerMethodField()
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Playbook
        fields = [
            "id",
            "name",
            "description",
            "playbook_type",
            "playbook_type_display",
            "is_active",
            "trigger_type",
            "trigger_type_display",
            "target_completion_days",
            "times_started",
            "times_completed",
            "completion_rate",
            "step_count",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_step_count(self, obj):
        return obj.steps.count()


class PlaybookDetailSerializer(serializers.ModelSerializer):
    playbook_type_display = serializers.CharField(
        source="get_playbook_type_display", read_only=True
    )
    trigger_type_display = serializers.CharField(
        source="get_trigger_type_display", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    steps = PlaybookStepSerializer(many=True, read_only=True)
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Playbook
        fields = [
            "id",
            "name",
            "description",
            "playbook_type",
            "playbook_type_display",
            "is_active",
            "trigger_type",
            "trigger_type_display",
            "trigger_conditions",
            "applies_to_contacts",
            "applies_to_cases",
            "applies_to_corporations",
            "target_completion_days",
            "success_criteria",
            "times_started",
            "times_completed",
            "avg_completion_time",
            "completion_rate",
            "steps",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "times_started",
            "times_completed",
            "avg_completion_time",
            "created_by",
        ]


class PlaybookStepExecutionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    step_name = serializers.CharField(source="step.name", read_only=True)
    step_type = serializers.CharField(source="step.step_type", read_only=True)
    step_order = serializers.IntegerField(source="step.order", read_only=True)
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    completed_by_name = serializers.CharField(
        source="completed_by.get_full_name", read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = PlaybookStepExecution
        fields = [
            "id",
            "execution",
            "step",
            "step_name",
            "step_type",
            "step_order",
            "status",
            "status_display",
            "started_at",
            "completed_at",
            "due_date",
            "assigned_to",
            "assigned_to_name",
            "completed_by",
            "completed_by_name",
            "notes",
            "output_data",
            "created_task",
            "created_appointment",
            "reminder_sent",
            "escalated",
            "is_overdue",
            "created_at",
        ]
        read_only_fields = [
            "execution",
            "step",
            "started_at",
            "completed_at",
            "completed_by",
        ]


class PlaybookExecutionListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    playbook_name = serializers.CharField(source="playbook.name", read_only=True)
    playbook_type = serializers.CharField(
        source="playbook.playbook_type", read_only=True
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    entity_name = serializers.SerializerMethodField()
    entity_type = serializers.SerializerMethodField()
    progress_percentage = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = PlaybookExecution
        fields = [
            "id",
            "playbook",
            "playbook_name",
            "playbook_type",
            "status",
            "status_display",
            "entity_name",
            "entity_type",
            "current_step",
            "steps_completed",
            "total_steps",
            "progress_percentage",
            "started_at",
            "target_completion_date",
            "completed_at",
            "assigned_to",
            "assigned_to_name",
            "is_overdue",
        ]

    def get_entity_name(self, obj):
        if obj.contact:
            return obj.contact.full_name
        if obj.case:
            return f"Case #{obj.case.case_number}"
        if obj.corporation:
            return obj.corporation.name
        return None

    def get_entity_type(self, obj):
        if obj.contact:
            return "contact"
        if obj.case:
            return "case"
        if obj.corporation:
            return "corporation"
        return None


class PlaybookExecutionDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    playbook_name = serializers.CharField(source="playbook.name", read_only=True)
    playbook_type = serializers.CharField(
        source="playbook.playbook_type", read_only=True
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    started_by_name = serializers.CharField(
        source="started_by.get_full_name", read_only=True
    )
    step_executions = PlaybookStepExecutionSerializer(many=True, read_only=True)
    entity_name = serializers.SerializerMethodField()
    entity_type = serializers.SerializerMethodField()
    progress_percentage = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    current_step_name = serializers.CharField(
        source="current_step.name", read_only=True
    )

    class Meta:
        model = PlaybookExecution
        fields = [
            "id",
            "playbook",
            "playbook_name",
            "playbook_type",
            "status",
            "status_display",
            "contact",
            "case",
            "corporation",
            "entity_name",
            "entity_type",
            "current_step",
            "current_step_name",
            "steps_completed",
            "total_steps",
            "progress_percentage",
            "started_at",
            "target_completion_date",
            "completed_at",
            "paused_at",
            "assigned_to",
            "assigned_to_name",
            "started_by",
            "started_by_name",
            "notes",
            "outcome",
            "outcome_notes",
            "is_overdue",
            "step_executions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "steps_completed",
            "total_steps",
            "started_at",
            "completed_at",
            "paused_at",
            "started_by",
        ]

    def get_entity_name(self, obj):
        if obj.contact:
            return obj.contact.full_name
        if obj.case:
            return f"Case #{obj.case.case_number}"
        if obj.corporation:
            return obj.corporation.name
        return None

    def get_entity_type(self, obj):
        if obj.contact:
            return "contact"
        if obj.case:
            return "case"
        if obj.corporation:
            return "corporation"
        return None


class StartPlaybookSerializer(serializers.Serializer):
    """Serializer for starting a playbook execution"""

    playbook_id = serializers.UUIDField()
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    case_id = serializers.UUIDField(required=False, allow_null=True)
    corporation_id = serializers.UUIDField(required=False, allow_null=True)
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not any(
            [attrs.get("contact_id"), attrs.get("case_id"), attrs.get("corporation_id")]
        ):
            raise serializers.ValidationError(
                "At least one of contact_id, case_id, or corporation_id is required"
            )
        return attrs


class CompleteStepSerializer(serializers.Serializer):
    """Serializer for completing a playbook step"""

    notes = serializers.CharField(required=False, allow_blank=True)
    output_data = serializers.JSONField(required=False, default=dict)
    skip = serializers.BooleanField(default=False)


class PlaybookTemplateSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = PlaybookTemplate
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_display",
            "is_system",
            "is_public",
            "playbook_data",
            "times_used",
            "rating",
            "rating_count",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "is_system",
            "times_used",
            "rating",
            "rating_count",
            "created_by",
        ]
