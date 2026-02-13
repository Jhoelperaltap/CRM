from django.contrib import admin

from apps.esign.models import EsignDocument, EsignSignee


class EsignSigneeInline(admin.TabularInline):
    model = EsignSignee
    extra = 0
    raw_id_fields = ["contact", "user"]


@admin.register(EsignDocument)
class EsignDocumentAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "status",
        "document_source",
        "email_subject",
        "created_by",
        "sent_at",
        "completed_at",
        "created_at",
    ]
    list_filter = ["status", "document_source"]
    search_fields = ["title", "email_subject"]
    raw_id_fields = ["created_by", "internal_document"]
    inlines = [EsignSigneeInline]
