from django.contrib import admin

from .models import (
    CannedResponse,
    ChatAgent,
    ChatDepartment,
    ChatMessage,
    ChatSession,
    ChatWidgetSettings,
    OfflineMessage,
)


@admin.register(ChatDepartment)
class ChatDepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "auto_assign", "online_agents_count", "order"]
    list_filter = ["is_active"]
    search_fields = ["name"]
    ordering = ["order", "name"]


@admin.register(ChatAgent)
class ChatAgentAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "status",
        "is_available",
        "current_chat_count",
        "max_concurrent_chats",
        "total_chats_handled",
        "avg_rating",
        "last_seen",
    ]
    list_filter = ["status", "is_available"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    filter_horizontal = ["departments"]


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ["sender_type", "agent", "sender_name", "content", "created_at"]
    can_delete = False


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = [
        "session_id",
        "visitor_name",
        "status",
        "department",
        "assigned_agent",
        "started_at",
        "ended_at",
        "rating",
    ]
    list_filter = ["status", "department", "source"]
    search_fields = ["session_id", "visitor_name", "visitor_email"]
    readonly_fields = [
        "session_id",
        "started_at",
        "first_response_at",
        "ended_at",
        "wait_time",
        "ip_address",
        "user_agent",
    ]
    inlines = [ChatMessageInline]
    date_hierarchy = "created_at"


@admin.register(CannedResponse)
class CannedResponseAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "shortcut",
        "department",
        "is_global",
        "is_active",
        "usage_count",
    ]
    list_filter = ["is_active", "is_global", "department"]
    search_fields = ["title", "shortcut", "content"]


@admin.register(ChatWidgetSettings)
class ChatWidgetSettingsAdmin(admin.ModelAdmin):
    list_display = ["company_name", "primary_color", "position"]


@admin.register(OfflineMessage)
class OfflineMessageAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "email",
        "department",
        "is_read",
        "is_responded",
        "created_at",
    ]
    list_filter = ["is_read", "is_responded", "department"]
    search_fields = ["name", "email", "message"]
    readonly_fields = ["ip_address", "page_url", "created_at"]
    date_hierarchy = "created_at"
