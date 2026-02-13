"""
Admin configuration for Webforms.
"""
from django.contrib import admin

from .models import Webform, WebformField, WebformHiddenField, WebformRoundRobinUser


class WebformFieldInline(admin.TabularInline):
    model = WebformField
    extra = 1
    fields = [
        "field_name",
        "is_mandatory",
        "is_hidden",
        "override_value",
        "reference_field",
        "duplicate_handling",
        "sort_order",
    ]


class WebformHiddenFieldInline(admin.TabularInline):
    model = WebformHiddenField
    extra = 1
    fields = ["field_name", "url_parameter", "override_value", "sort_order"]


class WebformRoundRobinUserInline(admin.TabularInline):
    model = WebformRoundRobinUser
    extra = 1
    fields = ["user", "sort_order"]
    autocomplete_fields = ["user"]


@admin.register(Webform)
class WebformAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "primary_module",
        "is_active",
        "assigned_to",
        "created_at",
    ]
    list_filter = ["is_active", "primary_module", "captcha_enabled"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    autocomplete_fields = ["assigned_to"]
    inlines = [
        WebformFieldInline,
        WebformHiddenFieldInline,
        WebformRoundRobinUserInline,
    ]
    fieldsets = (
        (None, {
            "fields": ("name", "primary_module", "description", "is_active")
        }),
        ("Configuration", {
            "fields": ("return_url", "captcha_enabled")
        }),
        ("Assignment", {
            "fields": ("assigned_to", "round_robin_enabled")
        }),
        ("Metadata", {
            "fields": ("created_by", "created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
