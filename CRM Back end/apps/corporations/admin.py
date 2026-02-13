from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.corporations.models import Corporation


@admin.register(Corporation)
class CorporationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "legal_name",
        "entity_type",
        "ein",
        "status",
        "assigned_to",
        "created_at",
    )
    list_filter = ("entity_type", "status")
    search_fields = ("name", "legal_name", "ein", "email", "phone")
    ordering = ("name",)
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "id",
                    "name",
                    "legal_name",
                    "entity_type",
                    "ein",
                    "state_id",
                    "status",
                ),
            },
        ),
        (
            _("Address"),
            {
                "fields": (
                    "street_address",
                    "city",
                    "state",
                    "zip_code",
                    "country",
                ),
            },
        ),
        (
            _("Contact information"),
            {
                "fields": (
                    "phone",
                    "fax",
                    "email",
                    "website",
                ),
            },
        ),
        (
            _("Business details"),
            {
                "fields": (
                    "industry",
                    "annual_revenue",
                    "fiscal_year_end",
                    "date_incorporated",
                ),
            },
        ),
        (
            _("Relationships"),
            {
                "fields": (
                    "primary_contact",
                    "assigned_to",
                    "created_by",
                ),
            },
        ),
        (
            _("Other"),
            {
                "fields": (
                    "description",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )
