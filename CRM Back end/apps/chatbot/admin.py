from django.contrib import admin

from apps.chatbot.models import (
    ChatbotAppointmentSlot,
    ChatbotConfiguration,
    ChatbotConversation,
    ChatbotKnowledgeEntry,
    ChatbotMessage,
)


@admin.register(ChatbotConfiguration)
class ChatbotConfigurationAdmin(admin.ModelAdmin):
    list_display = ["ai_provider", "model_name", "is_active", "updated_at"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(ChatbotKnowledgeEntry)
class ChatbotKnowledgeEntryAdmin(admin.ModelAdmin):
    list_display = ["title", "entry_type", "priority", "is_active", "created_at"]
    list_filter = ["entry_type", "is_active"]
    search_fields = ["title", "content", "keywords"]
    ordering = ["-priority", "title"]


@admin.register(ChatbotAppointmentSlot)
class ChatbotAppointmentSlotAdmin(admin.ModelAdmin):
    list_display = [
        "day_of_week",
        "start_time",
        "end_time",
        "slot_duration_minutes",
        "max_appointments",
        "is_active",
    ]
    list_filter = ["day_of_week", "is_active"]
    ordering = ["day_of_week", "start_time"]


class ChatbotMessageInline(admin.TabularInline):
    model = ChatbotMessage
    extra = 0
    readonly_fields = ["role", "content", "message_type", "created_at"]
    can_delete = False


@admin.register(ChatbotConversation)
class ChatbotConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "contact", "status", "fallback_count", "created_at"]
    list_filter = ["status"]
    search_fields = ["contact__first_name", "contact__last_name", "contact__email"]
    inlines = [ChatbotMessageInline]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(ChatbotMessage)
class ChatbotMessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "role", "message_type", "tokens_used", "created_at"]
    list_filter = ["role", "message_type"]
    search_fields = ["content"]
    readonly_fields = ["id", "created_at"]
