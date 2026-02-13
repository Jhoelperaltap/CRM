from django.contrib import admin

from apps.documents.models import Document, DocumentFolder, DocumentLink, DocumentTag


@admin.register(DocumentFolder)
class DocumentFolderAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "owner", "is_default", "created_at"]
    list_filter = ["is_default"]
    search_fields = ["name"]
    raw_id_fields = ["parent", "owner"]


@admin.register(DocumentTag)
class DocumentTagAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "tag_type", "owner", "created_at"]
    list_filter = ["tag_type"]
    search_fields = ["name"]
    raw_id_fields = ["owner"]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "doc_type",
        "status",
        "folder",
        "file_size",
        "uploaded_by",
        "created_at",
    ]
    list_filter = ["doc_type", "status", "folder"]
    search_fields = ["title", "description"]
    raw_id_fields = ["contact", "corporation", "case", "uploaded_by", "folder"]
    filter_horizontal = ["tags"]


@admin.register(DocumentLink)
class DocumentLinkAdmin(admin.ModelAdmin):
    list_display = ["title", "url", "folder", "created_by", "created_at"]
    list_filter = ["folder"]
    search_fields = ["title", "url"]
    raw_id_fields = ["folder", "contact", "corporation", "case", "created_by"]
    filter_horizontal = ["tags"]
