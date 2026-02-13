from django.contrib import admin

from apps.module_config.models import (
    CRMModule,
    CustomField,
    FieldLabel,
    Picklist,
    PicklistValue,
)


class CustomFieldInline(admin.TabularInline):
    model = CustomField
    extra = 0
    fields = [
        "field_name",
        "label",
        "field_type",
        "is_required",
        "is_active",
        "sort_order",
        "section",
    ]
    ordering = ["sort_order"]


class FieldLabelInline(admin.TabularInline):
    model = FieldLabel
    extra = 0
    fields = ["field_name", "language", "custom_label"]


@admin.register(CRMModule)
class CRMModuleAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "label",
        "is_active",
        "sort_order",
        "number_prefix",
        "number_next_seq",
    ]
    list_filter = ["is_active"]
    search_fields = ["name", "label"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["sort_order", "name"]
    inlines = [CustomFieldInline, FieldLabelInline]
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "id",
                    "name",
                    "label",
                    "label_plural",
                    "icon",
                    "description",
                    "is_active",
                    "sort_order",
                ),
            },
        ),
        (
            "Numbering",
            {
                "fields": (
                    "number_prefix",
                    "number_format",
                    "number_reset_period",
                    "number_next_seq",
                ),
            },
        ),
        (
            "Configuration",
            {
                "fields": ("default_fields",),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


class PicklistValueInline(admin.TabularInline):
    model = PicklistValue
    extra = 0
    fields = [
        "value",
        "label",
        "sort_order",
        "is_default",
        "is_active",
        "color",
    ]
    ordering = ["sort_order"]


@admin.register(Picklist)
class PicklistAdmin(admin.ModelAdmin):
    list_display = ["name", "label", "module", "is_system"]
    list_filter = ["is_system", "module"]
    search_fields = ["name", "label"]
    readonly_fields = ["id", "created_at", "updated_at"]
    list_select_related = ["module"]
    inlines = [PicklistValueInline]


@admin.register(CustomField)
class CustomFieldAdmin(admin.ModelAdmin):
    list_display = [
        "field_name",
        "label",
        "module",
        "field_type",
        "is_required",
        "is_active",
        "sort_order",
    ]
    list_filter = ["field_type", "is_active", "module"]
    search_fields = ["field_name", "label"]
    list_select_related = ["module"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(PicklistValue)
class PicklistValueAdmin(admin.ModelAdmin):
    list_display = [
        "value",
        "label",
        "picklist",
        "sort_order",
        "is_active",
        "is_default",
    ]
    list_filter = ["is_active", "picklist"]
    list_select_related = ["picklist"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(FieldLabel)
class FieldLabelAdmin(admin.ModelAdmin):
    list_display = ["field_name", "module", "language", "custom_label"]
    list_filter = ["language", "module"]
    list_select_related = ["module"]
    readonly_fields = ["id", "created_at", "updated_at"]
