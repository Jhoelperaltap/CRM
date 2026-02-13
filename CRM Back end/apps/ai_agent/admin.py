"""
Django admin configuration for the AI Agent system.
"""

from django.contrib import admin
from django.utils.html import format_html

from apps.ai_agent.models import (
    AgentAction,
    AgentConfiguration,
    AgentInsight,
    AgentLog,
    AgentMetrics,
)


@admin.register(AgentConfiguration)
class AgentConfigurationAdmin(admin.ModelAdmin):
    """Admin for AI Agent configuration."""

    list_display = [
        "id",
        "is_active",
        "ai_provider",
        "ai_model",
        "capabilities_summary",
        "updated_at",
    ]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            "Status",
            {
                "fields": ("is_active",),
            },
        ),
        (
            "Capabilities",
            {
                "fields": (
                    "email_analysis_enabled",
                    "appointment_reminders_enabled",
                    "task_enforcement_enabled",
                    "market_analysis_enabled",
                    "autonomous_actions_enabled",
                ),
            },
        ),
        (
            "Timing",
            {
                "fields": (
                    "email_check_interval_minutes",
                    "task_reminder_hours_before",
                    "appointment_reminder_hours",
                ),
            },
        ),
        (
            "AI Configuration",
            {
                "fields": (
                    "ai_provider",
                    "ai_model",
                    "ai_temperature",
                    "max_tokens",
                    "openai_api_key",
                    "anthropic_api_key",
                ),
            },
        ),
        (
            "Instructions",
            {
                "fields": ("custom_instructions", "focus_areas"),
                "classes": ("collapse",),
            },
        ),
        (
            "Rate Limiting",
            {
                "fields": ("max_actions_per_hour", "max_ai_calls_per_hour"),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("id", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def capabilities_summary(self, obj):
        capabilities = []
        if obj.email_analysis_enabled:
            capabilities.append("Email")
        if obj.appointment_reminders_enabled:
            capabilities.append("Appts")
        if obj.task_enforcement_enabled:
            capabilities.append("Tasks")
        if obj.market_analysis_enabled:
            capabilities.append("Market")
        return ", ".join(capabilities) or "None"

    capabilities_summary.short_description = "Enabled Capabilities"


@admin.register(AgentAction)
class AgentActionAdmin(admin.ModelAdmin):
    """Admin for AI Agent actions."""

    list_display = [
        "title",
        "action_type",
        "status_badge",
        "requires_approval",
        "created_at",
        "executed_at",
    ]
    list_filter = [
        "action_type",
        "status",
        "requires_approval",
        "created_at",
    ]
    search_fields = ["title", "description", "reasoning"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "approved_at",
        "rejected_at",
        "executed_at",
        "outcome_recorded_at",
    ]
    raw_id_fields = [
        "related_email",
        "related_task",
        "related_appointment",
        "related_contact",
        "related_case",
        "approved_by",
        "rejected_by",
        "outcome_recorded_by",
    ]

    fieldsets = (
        (
            "Action",
            {
                "fields": (
                    "action_type",
                    "status",
                    "title",
                    "description",
                    "reasoning",
                    "action_data",
                ),
            },
        ),
        (
            "Related Entities",
            {
                "fields": (
                    "related_email",
                    "related_task",
                    "related_appointment",
                    "related_contact",
                    "related_case",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Approval",
            {
                "fields": (
                    "requires_approval",
                    "approved_by",
                    "approved_at",
                    "rejected_by",
                    "rejected_at",
                    "rejection_reason",
                ),
            },
        ),
        (
            "Execution",
            {
                "fields": (
                    "executed_at",
                    "execution_result",
                    "error_message",
                ),
            },
        ),
        (
            "Outcome",
            {
                "fields": (
                    "outcome",
                    "outcome_score",
                    "outcome_recorded_by",
                    "outcome_recorded_at",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("id", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def status_badge(self, obj):
        colors = {
            "pending": "orange",
            "approved": "blue",
            "executed": "green",
            "rejected": "red",
            "failed": "darkred",
        }
        color = colors.get(obj.status, "gray")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"


@admin.register(AgentLog)
class AgentLogAdmin(admin.ModelAdmin):
    """Admin for AI Agent logs."""

    list_display = [
        "level_badge",
        "component",
        "message_preview",
        "tokens_used",
        "ai_latency_ms",
        "created_at",
    ]
    list_filter = ["level", "component", "created_at"]
    search_fields = ["message"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["action"]

    def level_badge(self, obj):
        colors = {
            "debug": "gray",
            "info": "blue",
            "warning": "orange",
            "error": "red",
            "decision": "purple",
        }
        color = colors.get(obj.level, "gray")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.level.upper(),
        )

    level_badge.short_description = "Level"

    def message_preview(self, obj):
        return obj.message[:100] + "..." if len(obj.message) > 100 else obj.message

    message_preview.short_description = "Message"


@admin.register(AgentInsight)
class AgentInsightAdmin(admin.ModelAdmin):
    """Admin for AI Agent insights."""

    list_display = [
        "title",
        "insight_type",
        "priority",
        "is_actionable",
        "is_acknowledged",
        "created_at",
    ]
    list_filter = [
        "insight_type",
        "priority",
        "is_actionable",
        "is_acknowledged",
        "created_at",
    ]
    search_fields = ["title", "description"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "acknowledged_at",
        "outcome_recorded_at",
    ]
    raw_id_fields = ["acknowledged_by", "source_action"]

    fieldsets = (
        (
            "Insight",
            {
                "fields": (
                    "insight_type",
                    "title",
                    "description",
                    "supporting_data",
                ),
            },
        ),
        (
            "Priority & Actions",
            {
                "fields": (
                    "priority",
                    "is_actionable",
                    "recommended_action",
                ),
            },
        ),
        (
            "Acknowledgment",
            {
                "fields": (
                    "is_acknowledged",
                    "acknowledged_by",
                    "acknowledged_at",
                    "outcome",
                    "outcome_recorded_at",
                ),
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "expires_at",
                    "source_action",
                    "id",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(AgentMetrics)
class AgentMetricsAdmin(admin.ModelAdmin):
    """Admin for AI Agent metrics."""

    list_display = [
        "date",
        "total_actions",
        "actions_executed",
        "actions_rejected",
        "total_tokens_used",
        "avg_outcome_score",
    ]
    list_filter = ["date"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
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
    ordering = ["-date"]
