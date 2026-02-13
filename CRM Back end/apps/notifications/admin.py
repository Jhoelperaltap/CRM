from django.contrib import admin

from apps.notifications.models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "recipient",
        "notification_type",
        "severity",
        "is_read",
        "created_at",
    ]
    list_filter = ["notification_type", "severity", "is_read"]
    search_fields = ["title", "message"]
    readonly_fields = [
        "id",
        "recipient",
        "notification_type",
        "title",
        "message",
        "severity",
        "related_object_type",
        "related_object_id",
        "action_url",
        "email_sent",
        "created_at",
    ]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "notification_type",
        "in_app_enabled",
        "email_enabled",
    ]
    list_filter = ["notification_type", "in_app_enabled", "email_enabled"]
