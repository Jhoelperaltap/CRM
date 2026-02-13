"""
Django Admin configuration for Activity Timeline and Comments.
"""

from django.contrib import admin
from django.contrib.contenttypes.models import ContentType

from apps.activities.models import Activity, Comment, CommentReaction


class CommentReactionInline(admin.TabularInline):
    model = CommentReaction
    extra = 0
    readonly_fields = ["user", "reaction_type", "created_at"]


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "activity_type",
        "get_entity",
        "performed_by",
        "created_at",
    ]
    list_filter = ["activity_type", "content_type", "created_at"]
    search_fields = ["title", "description", "performed_by__email", "performed_by__first_name"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    fieldsets = (
        (None, {
            "fields": ("activity_type", "title", "description")
        }),
        ("Entity", {
            "fields": ("content_type", "object_id")
        }),
        ("Related Object", {
            "fields": ("related_content_type", "related_object_id"),
            "classes": ("collapse",)
        }),
        ("Metadata", {
            "fields": ("performed_by", "department", "metadata")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )

    def get_entity(self, obj):
        if obj.content_type:
            return f"{obj.content_type.model}: {obj.object_id}"
        return "-"
    get_entity.short_description = "Entity"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = [
        "get_preview",
        "author",
        "get_entity",
        "is_deleted",
        "is_edited",
        "created_at",
    ]
    list_filter = ["is_deleted", "is_edited", "content_type", "created_at"]
    search_fields = ["content", "author__email", "author__first_name"]
    readonly_fields = ["created_at", "updated_at", "edited_at"]
    filter_horizontal = ["mentioned_users"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    inlines = [CommentReactionInline]

    fieldsets = (
        (None, {
            "fields": ("author", "content")
        }),
        ("Entity", {
            "fields": ("content_type", "object_id")
        }),
        ("Reply", {
            "fields": ("parent",),
            "classes": ("collapse",)
        }),
        ("Mentions", {
            "fields": ("mentioned_users",)
        }),
        ("Status", {
            "fields": ("is_deleted", "is_edited", "edited_at")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )

    def get_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    get_preview.short_description = "Comment"

    def get_entity(self, obj):
        if obj.content_type:
            return f"{obj.content_type.model}: {obj.object_id}"
        return "-"
    get_entity.short_description = "Entity"


@admin.register(CommentReaction)
class CommentReactionAdmin(admin.ModelAdmin):
    list_display = ["user", "reaction_type", "comment", "created_at"]
    list_filter = ["reaction_type", "created_at"]
    search_fields = ["user__email", "user__first_name"]
    readonly_fields = ["created_at", "updated_at"]
