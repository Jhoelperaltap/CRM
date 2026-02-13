from django.contrib import admin

from .models import (
    EmailAccount,
    EmailAttachment,
    EmailMessage,
    EmailSyncLog,
    EmailTemplate,
    EmailThread,
)


class EmailAttachmentInline(admin.TabularInline):
    model = EmailAttachment
    extra = 0
    readonly_fields = ("file_size", "mime_type")


@admin.register(EmailAccount)
class EmailAccountAdmin(admin.ModelAdmin):
    list_display = ("name", "email_address", "is_active", "last_sync_at")
    list_filter = ("is_active",)
    search_fields = ("name", "email_address")


@admin.register(EmailThread)
class EmailThreadAdmin(admin.ModelAdmin):
    list_display = ("subject", "contact", "case", "message_count", "last_message_at", "is_archived")
    list_filter = ("is_archived",)
    search_fields = ("subject",)
    raw_id_fields = ("contact", "case")


@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = (
        "subject", "direction", "from_address", "folder",
        "is_read", "sent_at", "contact", "assigned_to",
    )
    list_filter = ("direction", "folder", "is_read", "is_starred")
    search_fields = ("subject", "from_address", "body_text")
    raw_id_fields = ("account", "thread", "contact", "case", "assigned_to", "sent_by")
    inlines = [EmailAttachmentInline]


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "is_active", "created_by")
    list_filter = ("is_active",)
    search_fields = ("name", "subject")


@admin.register(EmailSyncLog)
class EmailSyncLogAdmin(admin.ModelAdmin):
    list_display = ("account", "status", "messages_fetched", "started_at", "completed_at")
    list_filter = ("status",)
    readonly_fields = (
        "account", "status", "messages_fetched", "error_message",
        "started_at", "completed_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
