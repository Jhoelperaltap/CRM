from django.contrib.auth import get_user_model
from rest_framework import serializers

from .sla_models import SLA, CaseSLAStatus, EscalationRule, SLABreach

User = get_user_model()


class SLASerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = SLA
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "is_default",
            "response_time_urgent",
            "response_time_high",
            "response_time_medium",
            "response_time_low",
            "resolution_time_urgent",
            "resolution_time_high",
            "resolution_time_medium",
            "resolution_time_low",
            "use_business_hours",
            "business_hours",
            "escalation_enabled",
            "escalation_notify_assignee",
            "escalation_notify_manager",
            "escalation_email",
            "applicable_case_types",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class SLAListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    case_count = serializers.SerializerMethodField()

    class Meta:
        model = SLA
        fields = [
            "id",
            "name",
            "is_active",
            "is_default",
            "response_time_medium",
            "resolution_time_medium",
            "case_count",
            "created_at",
        ]

    def get_case_count(self, obj):
        return obj.case_statuses.count()


class EscalationRuleSerializer(serializers.ModelSerializer):
    notify_user_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source="notify_users", required=False
    )

    class Meta:
        model = EscalationRule
        fields = [
            "id",
            "sla",
            "name",
            "is_active",
            "order",
            "trigger_type",
            "trigger_value",
            "applies_to",
            "notify_assignee",
            "notify_manager",
            "notify_user_ids",
            "notify_emails",
            "reassign_to",
            "change_priority",
            "email_subject",
            "email_body",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SLABreachSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source="case.case_number", read_only=True)
    case_title = serializers.CharField(source="case.title", read_only=True)
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    sla_name = serializers.CharField(source="sla.name", read_only=True)

    class Meta:
        model = SLABreach
        fields = [
            "id",
            "case",
            "case_number",
            "case_title",
            "sla",
            "sla_name",
            "breach_type",
            "target_time",
            "breach_time",
            "breach_duration",
            "case_priority",
            "case_status",
            "assigned_to",
            "assigned_to_name",
            "escalation_sent",
            "escalation_sent_at",
            "escalation_acknowledged",
            "escalation_acknowledged_by",
            "escalation_acknowledged_at",
            "is_resolved",
            "resolved_at",
            "resolution_notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "case",
            "sla",
            "breach_type",
            "target_time",
            "breach_time",
            "breach_duration",
            "case_priority",
            "case_status",
            "assigned_to",
            "escalation_sent",
            "escalation_sent_at",
            "created_at",
        ]


class CaseSLAStatusSerializer(serializers.ModelSerializer):
    sla_name = serializers.CharField(source="sla.name", read_only=True)
    response_remaining = serializers.SerializerMethodField()
    resolution_remaining = serializers.SerializerMethodField()

    class Meta:
        model = CaseSLAStatus
        fields = [
            "id",
            "case",
            "sla",
            "sla_name",
            "response_status",
            "response_target",
            "response_met_at",
            "response_breached",
            "response_remaining",
            "resolution_status",
            "resolution_target",
            "resolution_met_at",
            "resolution_breached",
            "resolution_remaining",
            "is_paused",
            "paused_at",
            "total_paused_time",
            "pause_reason",
            "time_to_response",
            "time_to_resolution",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "response_met_at",
            "resolution_met_at",
            "response_breached",
            "resolution_breached",
            "time_to_response",
            "time_to_resolution",
            "created_at",
            "updated_at",
        ]

    def get_response_remaining(self, obj):
        if obj.response_met_at or not obj.response_target:
            return None
        from django.utils import timezone

        remaining = obj.response_target - timezone.now()
        if remaining.total_seconds() < 0:
            return f"-{abs(remaining)}"
        return str(remaining)

    def get_resolution_remaining(self, obj):
        if obj.resolution_met_at or not obj.resolution_target:
            return None
        from django.utils import timezone

        remaining = obj.resolution_target - timezone.now()
        if remaining.total_seconds() < 0:
            return f"-{abs(remaining)}"
        return str(remaining)


class SLAMetricsSerializer(serializers.Serializer):
    """Serializer for SLA performance metrics."""

    total_cases = serializers.IntegerField()
    response_met = serializers.IntegerField()
    response_breached = serializers.IntegerField()
    response_rate = serializers.FloatField()
    resolution_met = serializers.IntegerField()
    resolution_breached = serializers.IntegerField()
    resolution_rate = serializers.FloatField()
    avg_response_time = serializers.CharField(allow_null=True)
    avg_resolution_time = serializers.CharField(allow_null=True)


class PauseSLASerializer(serializers.Serializer):
    """Serializer for pausing SLA."""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=200)
