from django.contrib import admin

from apps.reports.models import Report, ReportFolder


@admin.register(ReportFolder)
class ReportFolderAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "created_at"]
    search_fields = ["name"]
    raw_id_fields = ["owner"]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "report_type",
        "primary_module",
        "folder",
        "owner",
        "frequency",
        "last_run",
        "created_at",
    ]
    list_filter = ["report_type", "primary_module", "frequency"]
    search_fields = ["name", "description"]
    raw_id_fields = ["owner", "folder"]
    filter_horizontal = ["shared_with"]
