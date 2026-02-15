from django.contrib import admin

from .models import (
    Playbook,
    PlaybookExecution,
    PlaybookStep,
    PlaybookStepExecution,
    PlaybookTemplate,
)


class PlaybookStepInline(admin.TabularInline):
    model = PlaybookStep
    extra = 0
    ordering = ["order"]


@admin.register(Playbook)
class PlaybookAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "playbook_type",
        "is_active",
        "times_started",
        "times_completed",
        "created_at",
    ]
    list_filter = ["playbook_type", "is_active", "trigger_type"]
    search_fields = ["name", "description"]
    inlines = [PlaybookStepInline]


@admin.register(PlaybookStep)
class PlaybookStepAdmin(admin.ModelAdmin):
    list_display = [
        "playbook",
        "order",
        "name",
        "step_type",
        "is_required",
        "is_active",
    ]
    list_filter = ["step_type", "is_required", "is_active"]
    search_fields = ["name", "description"]
    ordering = ["playbook", "order"]


@admin.register(PlaybookExecution)
class PlaybookExecutionAdmin(admin.ModelAdmin):
    list_display = [
        "playbook",
        "status",
        "steps_completed",
        "total_steps",
        "assigned_to",
        "started_at",
    ]
    list_filter = ["status", "playbook"]
    search_fields = ["playbook__name"]
    raw_id_fields = ["contact", "case", "corporation", "assigned_to"]
    date_hierarchy = "started_at"


@admin.register(PlaybookStepExecution)
class PlaybookStepExecutionAdmin(admin.ModelAdmin):
    list_display = [
        "execution",
        "step",
        "status",
        "assigned_to",
        "started_at",
        "completed_at",
    ]
    list_filter = ["status"]
    raw_id_fields = ["execution", "assigned_to", "completed_by"]


@admin.register(PlaybookTemplate)
class PlaybookTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "is_system",
        "is_public",
        "times_used",
        "rating",
    ]
    list_filter = ["category", "is_system", "is_public"]
    search_fields = ["name", "description"]
