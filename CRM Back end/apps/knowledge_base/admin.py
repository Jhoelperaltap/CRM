from django.contrib import admin

from .models import (
    FAQ,
    Article,
    ArticleAttachment,
    ArticleFeedback,
    ArticleView,
    Category,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "parent",
        "order",
        "is_active",
        "is_public",
        "article_count",
    ]
    list_filter = ["is_active", "is_public", "parent"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order", "name"]


class ArticleAttachmentInline(admin.TabularInline):
    model = ArticleAttachment
    extra = 0
    readonly_fields = ["file_size", "mime_type", "uploaded_by", "created_at"]


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "category",
        "status",
        "visibility",
        "author",
        "view_count",
        "is_featured",
        "is_pinned",
        "created_at",
    ]
    list_filter = ["status", "visibility", "category", "is_featured", "is_pinned"]
    search_fields = ["title", "summary", "content", "keywords"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = [
        "view_count",
        "helpful_count",
        "not_helpful_count",
        "author",
        "last_edited_by",
        "created_at",
        "updated_at",
    ]
    inlines = [ArticleAttachmentInline]
    filter_horizontal = ["related_articles"]
    date_hierarchy = "created_at"

    fieldsets = (
        (None, {"fields": ("title", "slug", "summary", "content", "category")}),
        (
            "Status",
            {
                "fields": (
                    "status",
                    "visibility",
                    "is_featured",
                    "is_pinned",
                    "allow_comments",
                )
            },
        ),
        ("SEO & Discovery", {"fields": ("tags", "keywords"), "classes": ("collapse",)}),
        (
            "Publishing",
            {"fields": ("published_at", "expires_at"), "classes": ("collapse",)},
        ),
        (
            "Related Content",
            {"fields": ("related_articles",), "classes": ("collapse",)},
        ),
        (
            "Statistics",
            {
                "fields": ("view_count", "helpful_count", "not_helpful_count"),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("author", "last_edited_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        obj.last_edited_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = [
        "question",
        "category",
        "order",
        "is_active",
        "is_public",
        "view_count",
    ]
    list_filter = ["is_active", "is_public", "category"]
    search_fields = ["question", "answer"]
    ordering = ["category", "order"]
    readonly_fields = ["view_count", "created_by", "created_at", "updated_at"]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ArticleFeedback)
class ArticleFeedbackAdmin(admin.ModelAdmin):
    list_display = ["article", "feedback_type", "user", "created_at"]
    list_filter = ["feedback_type", "created_at"]
    readonly_fields = [
        "article",
        "user",
        "session_key",
        "feedback_type",
        "comment",
        "email",
        "created_at",
    ]


@admin.register(ArticleView)
class ArticleViewAdmin(admin.ModelAdmin):
    list_display = ["article", "user", "ip_address", "created_at"]
    list_filter = ["created_at"]
    readonly_fields = [
        "article",
        "user",
        "session_key",
        "ip_address",
        "user_agent",
        "referrer",
        "search_query",
        "created_at",
    ]
