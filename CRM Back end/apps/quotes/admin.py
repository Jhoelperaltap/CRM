from django.contrib import admin

from apps.quotes.models import Quote, QuoteLineItem


class QuoteLineItemInline(admin.TabularInline):
    model = QuoteLineItem
    extra = 0
    readonly_fields = ["id", "total", "created_at", "updated_at"]
    fields = [
        "service_type",
        "description",
        "quantity",
        "unit_price",
        "discount_percent",
        "total",
        "sort_order",
    ]


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = [
        "quote_number",
        "subject",
        "stage",
        "contact",
        "total",
        "valid_until",
        "created_at",
    ]
    list_filter = ["stage", "created_at"]
    search_fields = ["quote_number", "subject"]
    list_select_related = ["contact", "corporation", "assigned_to"]
    readonly_fields = ["id", "quote_number", "subtotal", "discount_amount", "tax_amount", "total", "created_at", "updated_at"]
    raw_id_fields = ["contact", "corporation", "case", "assigned_to", "created_by"]
    ordering = ["-created_at"]
    inlines = [QuoteLineItemInline]
    fieldsets = (
        (
            "Quote Info",
            {
                "fields": (
                    "id",
                    "quote_number",
                    "subject",
                    "stage",
                    "valid_until",
                ),
            },
        ),
        (
            "Relationships",
            {
                "fields": (
                    "contact",
                    "corporation",
                    "case",
                    "assigned_to",
                    "created_by",
                ),
            },
        ),
        (
            "Billing Address",
            {
                "fields": (
                    "billing_street",
                    "billing_city",
                    "billing_state",
                    "billing_zip",
                    "billing_country",
                ),
            },
        ),
        (
            "Shipping Address",
            {
                "fields": (
                    "shipping_street",
                    "shipping_city",
                    "shipping_state",
                    "shipping_zip",
                    "shipping_country",
                ),
            },
        ),
        (
            "Totals",
            {
                "fields": (
                    "subtotal",
                    "discount_percent",
                    "discount_amount",
                    "tax_percent",
                    "tax_amount",
                    "total",
                ),
            },
        ),
        (
            "Other",
            {
                "fields": (
                    "terms_conditions",
                    "description",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )
