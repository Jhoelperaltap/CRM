from django.contrib import admin

from apps.tasks.models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "priority", "status", "assigned_to", "due_date", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description"]
    raw_id_fields = ["assigned_to", "created_by", "case", "contact"]
