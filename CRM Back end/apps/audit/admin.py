from django.contrib import admin

from apps.audit.models import (
    AuditLog,
    EncryptedFieldAccessLog,
    LoginHistory,
    SettingsLog,
)


# ---------------------------------------------------------------------------
# Read-only mixin for audit models
# ---------------------------------------------------------------------------
class ReadOnlyAuditAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(ReadOnlyAuditAdmin):
    list_display = ["timestamp", "user", "action", "module", "object_repr"]
    list_filter = ["action", "module"]
    search_fields = ["object_repr", "module", "user__email"]
    raw_id_fields = ["user"]
    readonly_fields = [
        "id", "user", "action", "module", "object_id", "object_repr",
        "changes", "ip_address", "user_agent", "request_path", "timestamp",
    ]


@admin.register(LoginHistory)
class LoginHistoryAdmin(ReadOnlyAuditAdmin):
    list_display = ["timestamp", "email_attempted", "status", "ip_address", "user"]
    list_filter = ["status"]
    search_fields = ["email_attempted", "ip_address"]
    raw_id_fields = ["user"]
    readonly_fields = [
        "id", "user", "email_attempted", "status", "ip_address",
        "user_agent", "failure_reason", "timestamp",
    ]


@admin.register(SettingsLog)
class SettingsLogAdmin(ReadOnlyAuditAdmin):
    list_display = ["timestamp", "user", "setting_area", "setting_key", "ip_address"]
    list_filter = ["setting_area"]
    search_fields = ["setting_area", "setting_key", "user__email"]
    raw_id_fields = ["user"]
    readonly_fields = [
        "id", "user", "setting_area", "setting_key",
        "old_value", "new_value", "ip_address", "user_agent", "timestamp",
    ]


@admin.register(EncryptedFieldAccessLog)
class EncryptedFieldAccessLogAdmin(ReadOnlyAuditAdmin):
    list_display = ["timestamp", "user", "module", "field_name", "access_type", "ip_address"]
    list_filter = ["access_type", "module"]
    search_fields = ["module", "field_name", "user__email"]
    raw_id_fields = ["user"]
    readonly_fields = [
        "id", "user", "module", "object_id", "field_name",
        "access_type", "ip_address", "timestamp",
    ]
