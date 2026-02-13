from django.contrib import admin

from apps.portal.models import (
    ClientPortalAccess,
    PortalDocumentUpload,
    PortalMessage,
    PortalConfiguration,
    PortalMenuItem,
    PortalShortcut,
    PortalModuleFieldConfig,
)


@admin.register(ClientPortalAccess)
class ClientPortalAccessAdmin(admin.ModelAdmin):
    list_display = ["email", "contact", "is_active", "last_login", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["email", "contact__first_name", "contact__last_name"]
    raw_id_fields = ["contact"]
    readonly_fields = ["password_hash", "reset_token"]


@admin.register(PortalMessage)
class PortalMessageAdmin(admin.ModelAdmin):
    list_display = ["subject", "contact", "message_type", "is_read", "created_at"]
    list_filter = ["message_type", "is_read"]
    search_fields = ["subject", "body"]
    raw_id_fields = ["contact", "case", "sender_user", "parent_message"]


@admin.register(PortalDocumentUpload)
class PortalDocumentUploadAdmin(admin.ModelAdmin):
    list_display = ["document", "contact", "status", "reviewed_by", "created_at"]
    list_filter = ["status"]
    raw_id_fields = ["contact", "case", "document", "reviewed_by"]


# Portal Configuration Admin


class PortalMenuItemInline(admin.TabularInline):
    model = PortalMenuItem
    extra = 0
    fields = ["module_name", "label", "is_enabled", "sort_order"]


class PortalShortcutInline(admin.TabularInline):
    model = PortalShortcut
    extra = 0
    fields = ["shortcut_type", "label", "custom_url", "is_enabled", "sort_order"]


class PortalModuleFieldConfigInline(admin.TabularInline):
    model = PortalModuleFieldConfig
    extra = 0
    fields = [
        "module_name",
        "field_name",
        "field_label",
        "permission",
        "is_mandatory",
        "sort_order",
    ]


@admin.register(PortalConfiguration)
class PortalConfigurationAdmin(admin.ModelAdmin):
    list_display = ["portal_url", "is_active", "default_assignee", "created_at"]
    list_filter = ["is_active"]
    raw_id_fields = ["default_assignee"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [
        PortalMenuItemInline,
        PortalShortcutInline,
        PortalModuleFieldConfigInline,
    ]
    fieldsets = (
        (
            "General",
            {
                "fields": (
                    "id",
                    "portal_url",
                    "default_assignee",
                    "support_notification_days",
                    "is_active",
                ),
            },
        ),
        (
            "Templates",
            {
                "fields": (
                    "login_details_template",
                    "forgot_password_template",
                ),
            },
        ),
        (
            "Appearance",
            {
                "fields": (
                    "custom_css_url",
                    "announcement_html",
                    "greeting_type",
                ),
            },
        ),
        (
            "Session & Scope",
            {
                "fields": (
                    "default_scope",
                    "session_timeout_hours",
                ),
            },
        ),
        (
            "Widgets",
            {
                "fields": (
                    "account_rep_widget_enabled",
                    "recent_documents_widget_enabled",
                    "recent_faq_widget_enabled",
                    "recent_cases_widget_enabled",
                ),
            },
        ),
        (
            "Charts",
            {
                "fields": (
                    "chart_open_cases_priority",
                    "chart_cases_resolution_time",
                    "chart_projects_by_status",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
            },
        ),
    )
