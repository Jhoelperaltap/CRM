from django.contrib import admin

from .models import (
    Call,
    CallQueue,
    CallQueueMember,
    CallScript,
    CallSettings,
    PhoneLine,
    TelephonyProvider,
    Voicemail,
)


@admin.register(TelephonyProvider)
class TelephonyProviderAdmin(admin.ModelAdmin):
    list_display = ["name", "provider_type", "is_active", "is_default", "created_at"]
    list_filter = ["provider_type", "is_active", "is_default"]
    search_fields = ["name"]


@admin.register(PhoneLine)
class PhoneLineAdmin(admin.ModelAdmin):
    list_display = [
        "phone_number",
        "friendly_name",
        "provider",
        "line_type",
        "assigned_user",
        "is_active",
    ]
    list_filter = ["line_type", "is_active", "provider"]
    search_fields = ["phone_number", "friendly_name"]
    raw_id_fields = ["assigned_user"]


@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = [
        "from_number",
        "to_number",
        "direction",
        "status",
        "duration",
        "user",
        "created_at",
    ]
    list_filter = ["direction", "status", "call_type", "is_recorded"]
    search_fields = ["from_number", "to_number", "subject", "notes"]
    raw_id_fields = ["user", "contact", "corporation", "case"]
    date_hierarchy = "created_at"


@admin.register(CallQueue)
class CallQueueAdmin(admin.ModelAdmin):
    list_display = ["name", "strategy", "is_active", "timeout", "max_wait_time"]
    list_filter = ["is_active", "strategy"]
    search_fields = ["name", "description"]


@admin.register(CallQueueMember)
class CallQueueMemberAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "queue",
        "priority",
        "is_active",
        "is_available",
        "calls_taken",
    ]
    list_filter = ["is_active", "is_available", "queue"]
    raw_id_fields = ["user"]


@admin.register(Voicemail)
class VoicemailAdmin(admin.ModelAdmin):
    list_display = [
        "caller_number",
        "caller_name",
        "phone_line",
        "duration",
        "status",
        "created_at",
    ]
    list_filter = ["status", "phone_line"]
    search_fields = ["caller_number", "caller_name", "transcription"]
    date_hierarchy = "created_at"


@admin.register(CallScript)
class CallScriptAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "script_type",
        "is_active",
        "times_used",
        "avg_success_rate",
    ]
    list_filter = ["script_type", "is_active"]
    search_fields = ["name", "description", "content"]


@admin.register(CallSettings)
class CallSettingsAdmin(admin.ModelAdmin):
    list_display = [
        "auto_record_all",
        "transcription_enabled",
        "click_to_call_enabled",
        "updated_at",
    ]
