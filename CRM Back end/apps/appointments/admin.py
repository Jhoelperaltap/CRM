from django.contrib import admin

from apps.appointments.models import Appointment, AppointmentPage


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "contact",
        "start_datetime",
        "status",
        "assigned_to",
        "recurrence_pattern",
        "location",
    ]
    list_filter = ["status", "location", "recurrence_pattern"]
    search_fields = ["title", "contact__first_name", "contact__last_name"]
    raw_id_fields = [
        "contact",
        "assigned_to",
        "created_by",
        "case",
        "parent_appointment",
    ]


@admin.register(AppointmentPage)
class AppointmentPageAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "page_type",
        "slug",
        "event_duration",
        "is_active",
        "created_by",
        "created_at",
    ]
    list_filter = ["page_type", "is_active", "event_activity_type"]
    search_fields = ["name", "slug"]
    raw_id_fields = ["meet_with", "assigned_to", "created_by", "event"]
