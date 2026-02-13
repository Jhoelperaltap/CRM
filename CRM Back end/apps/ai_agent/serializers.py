"""
Serializers for the AI Agent system.
"""

from rest_framework import serializers

from apps.ai_agent.models import (
    AgentAction,
    AgentConfiguration,
    AgentInsight,
    AgentLog,
    AgentMetrics,
)


class AgentConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for AI Agent configuration."""

    class Meta:
        model = AgentConfiguration
        fields = [
            "id",
            "is_active",
            # Capability toggles
            "email_analysis_enabled",
            "appointment_reminders_enabled",
            "task_enforcement_enabled",
            "market_analysis_enabled",
            "autonomous_actions_enabled",
            # Timing settings
            "email_check_interval_minutes",
            "task_reminder_hours_before",
            "appointment_reminder_hours",
            # AI settings
            "ai_provider",
            "ai_model",
            "ai_temperature",
            "max_tokens",
            # Instructions
            "custom_instructions",
            "focus_areas",
            # Rate limiting
            "max_actions_per_hour",
            "max_ai_calls_per_hour",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_ai_temperature(self, value):
        if value < 0 or value > 1:
            raise serializers.ValidationError("Temperature must be between 0 and 1")
        return value

    def validate_appointment_reminder_hours(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of hours")
        for h in value:
            if not isinstance(h, (int, float)) or h < 0:
                raise serializers.ValidationError("Each hour must be a positive number")
        return sorted(set(value), reverse=True)


class AgentConfigurationUpdateSerializer(AgentConfigurationSerializer):
    """Serializer for updating configuration with API keys."""

    openai_api_key = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
    )
    anthropic_api_key = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
    )

    class Meta(AgentConfigurationSerializer.Meta):
        fields = AgentConfigurationSerializer.Meta.fields + [
            "openai_api_key",
            "anthropic_api_key",
        ]


class _ContactSummarySerializer(serializers.Serializer):
    """Lightweight contact summary for nested display."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class _CaseSummarySerializer(serializers.Serializer):
    """Lightweight case summary for nested display."""

    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    case_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


class _TaskSummarySerializer(serializers.Serializer):
    """Lightweight task summary for nested display."""

    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    due_date = serializers.DateField(read_only=True)


class _AppointmentSummarySerializer(serializers.Serializer):
    """Lightweight appointment summary for nested display."""

    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    start_datetime = serializers.DateTimeField(read_only=True)
    location = serializers.CharField(read_only=True)


class _EmailSummarySerializer(serializers.Serializer):
    """Lightweight email summary for nested display."""

    id = serializers.UUIDField(read_only=True)
    subject = serializers.CharField(read_only=True)
    from_address = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class AgentActionListSerializer(serializers.ModelSerializer):
    """Serializer for listing agent actions."""

    action_type_display = serializers.CharField(
        source="get_action_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    contact_name = serializers.SerializerMethodField()
    case_number = serializers.SerializerMethodField()

    class Meta:
        model = AgentAction
        fields = [
            "id",
            "action_type",
            "action_type_display",
            "status",
            "status_display",
            "title",
            "requires_approval",
            "contact_name",
            "case_number",
            "created_at",
            "executed_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        if obj.related_contact:
            return f"{obj.related_contact.first_name} {obj.related_contact.last_name}".strip()
        return None

    def get_case_number(self, obj):
        if obj.related_case:
            return obj.related_case.case_number
        return None


class AgentActionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for agent actions."""

    action_type_display = serializers.CharField(
        source="get_action_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    related_contact = _ContactSummarySerializer(read_only=True)
    related_case = _CaseSummarySerializer(read_only=True)
    related_task = _TaskSummarySerializer(read_only=True)
    related_appointment = _AppointmentSummarySerializer(read_only=True)
    related_email = _EmailSummarySerializer(read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    rejected_by_name = serializers.SerializerMethodField()
    outcome_recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AgentAction
        fields = [
            "id",
            "action_type",
            "action_type_display",
            "status",
            "status_display",
            "title",
            "description",
            "reasoning",
            "action_data",
            # Related entities
            "related_contact",
            "related_case",
            "related_task",
            "related_appointment",
            "related_email",
            # Approval workflow
            "requires_approval",
            "approved_by_name",
            "approved_at",
            "rejected_by_name",
            "rejected_at",
            "rejection_reason",
            # Execution
            "executed_at",
            "execution_result",
            "error_message",
            # Outcome
            "outcome",
            "outcome_score",
            "outcome_recorded_by_name",
            "outcome_recorded_at",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name()
        return None

    def get_rejected_by_name(self, obj):
        if obj.rejected_by:
            return obj.rejected_by.get_full_name()
        return None

    def get_outcome_recorded_by_name(self, obj):
        if obj.outcome_recorded_by:
            return obj.outcome_recorded_by.get_full_name()
        return None


class AgentActionApproveSerializer(serializers.Serializer):
    """Serializer for approving an action."""

    execute_immediately = serializers.BooleanField(
        default=True,
        help_text="Execute the action immediately after approval",
    )


class AgentActionRejectSerializer(serializers.Serializer):
    """Serializer for rejecting an action."""

    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for rejection",
    )


class AgentActionOutcomeSerializer(serializers.Serializer):
    """Serializer for recording action outcome."""

    outcome = serializers.CharField(
        help_text="Description of the action's outcome",
    )
    score = serializers.FloatField(
        min_value=-1,
        max_value=1,
        help_text="Outcome score from -1 (bad) to 1 (good)",
    )


class AgentLogSerializer(serializers.ModelSerializer):
    """Serializer for agent logs."""

    level_display = serializers.CharField(
        source="get_level_display",
        read_only=True,
    )
    action_title = serializers.SerializerMethodField()

    class Meta:
        model = AgentLog
        fields = [
            "id",
            "level",
            "level_display",
            "component",
            "message",
            "context",
            "action",
            "action_title",
            "tokens_used",
            "ai_model",
            "ai_latency_ms",
            "created_at",
        ]
        read_only_fields = fields

    def get_action_title(self, obj):
        if obj.action:
            return obj.action.title
        return None


class AgentInsightListSerializer(serializers.ModelSerializer):
    """Serializer for listing insights."""

    insight_type_display = serializers.CharField(
        source="get_insight_type_display",
        read_only=True,
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )

    class Meta:
        model = AgentInsight
        fields = [
            "id",
            "insight_type",
            "insight_type_display",
            "title",
            "priority",
            "priority_display",
            "is_actionable",
            "is_acknowledged",
            "created_at",
        ]
        read_only_fields = fields


class AgentInsightDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for insights."""

    insight_type_display = serializers.CharField(
        source="get_insight_type_display",
        read_only=True,
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    acknowledged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AgentInsight
        fields = [
            "id",
            "insight_type",
            "insight_type_display",
            "title",
            "description",
            "supporting_data",
            "priority",
            "priority_display",
            "is_actionable",
            "recommended_action",
            "is_acknowledged",
            "acknowledged_by_name",
            "acknowledged_at",
            "outcome",
            "outcome_recorded_at",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_acknowledged_by_name(self, obj):
        if obj.acknowledged_by:
            return obj.acknowledged_by.get_full_name()
        return None


class AgentInsightAcknowledgeSerializer(serializers.Serializer):
    """Serializer for acknowledging an insight."""

    outcome = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="What action was taken on this insight",
    )


class AgentMetricsSerializer(serializers.ModelSerializer):
    """Serializer for agent metrics."""

    class Meta:
        model = AgentMetrics
        fields = [
            "id",
            "date",
            "total_actions",
            "actions_executed",
            "actions_approved",
            "actions_rejected",
            "actions_failed",
            "email_notes_created",
            "appointment_reminders_sent",
            "task_reminders_sent",
            "tasks_escalated",
            "insights_generated",
            "total_ai_calls",
            "total_tokens_used",
            "avg_ai_latency_ms",
            "avg_outcome_score",
            "outcomes_recorded",
        ]
        read_only_fields = fields


class AgentStatusSerializer(serializers.Serializer):
    """Serializer for agent status response."""

    is_active = serializers.BooleanField()
    capabilities = serializers.DictField()
    ai_config = serializers.DictField()
    activity = serializers.DictField()
    rate_limits = serializers.DictField()
    today_metrics = serializers.DictField(allow_null=True)
    health = serializers.CharField()


class PerformanceSummarySerializer(serializers.Serializer):
    """Serializer for performance summary response."""

    period_days = serializers.IntegerField()
    total_actions = serializers.IntegerField()
    message = serializers.CharField(required=False, allow_null=True)
    status_breakdown = serializers.DictField(required=False)
    rates = serializers.DictField(required=False)
    outcomes = serializers.DictField(required=False)
    by_action_type = serializers.DictField(required=False)
    ai_usage = serializers.DictField(required=False)


class LearningProgressSerializer(serializers.Serializer):
    """Serializer for learning progress response."""

    recent_period = serializers.CharField()
    comparison_period = serializers.CharField()
    outcome_score = serializers.DictField()
    rejection_rate = serializers.DictField()
    sample_sizes = serializers.DictField()
