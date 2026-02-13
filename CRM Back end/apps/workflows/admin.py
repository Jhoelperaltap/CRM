from django.contrib import admin

from apps.workflows.models import WorkflowExecutionLog, WorkflowRule


@admin.register(WorkflowRule)
class WorkflowRuleAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "trigger_type",
        "action_type",
        "is_active",
        "execution_count",
        "last_executed_at",
    ]
    list_filter = ["trigger_type", "action_type", "is_active"]
    search_fields = ["name", "description"]


@admin.register(WorkflowExecutionLog)
class WorkflowExecutionLogAdmin(admin.ModelAdmin):
    list_display = [
        "rule",
        "triggered_at",
        "trigger_object_type",
        "result",
    ]
    list_filter = ["result", "trigger_object_type"]
    readonly_fields = [
        "id",
        "rule",
        "triggered_at",
        "trigger_object_type",
        "trigger_object_id",
        "action_taken",
        "result",
        "error_message",
    ]
