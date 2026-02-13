from django.contrib import admin

from apps.inventory.models import (
    Asset,
    Invoice,
    InvoiceLineItem,
    Payment,
    PriceBook,
    PriceBookEntry,
    Product,
    PurchaseOrder,
    PurchaseOrderLineItem,
    SalesOrder,
    SalesOrderLineItem,
    Service,
    StockTransaction,
    TaxRate,
    TermsAndConditions,
    Vendor,
    WorkOrder,
)


@admin.register(TaxRate)
class TaxRateAdmin(admin.ModelAdmin):
    list_display = ["name", "rate", "tax_type", "is_active"]
    list_filter = ["is_active", "tax_type"]


@admin.register(TermsAndConditions)
class TermsAndConditionsAdmin(admin.ModelAdmin):
    list_display = ["name", "module", "is_default"]
    list_filter = ["is_default", "module"]


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["name", "vendor_code", "email", "phone", "is_active"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "email"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "product_code", "unit_price", "qty_in_stock", "is_active"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "product_code"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "service_code", "unit_price", "is_active"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "service_code"]


class PriceBookEntryInline(admin.TabularInline):
    model = PriceBookEntry
    extra = 0


@admin.register(PriceBook)
class PriceBookAdmin(admin.ModelAdmin):
    list_display = ["name", "currency", "is_active"]
    list_filter = ["is_active"]
    inlines = [PriceBookEntryInline]


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "subject", "status", "total", "created_at"]
    list_filter = ["status"]
    search_fields = ["invoice_number", "subject"]
    inlines = [InvoiceLineItemInline]


class SalesOrderLineItemInline(admin.TabularInline):
    model = SalesOrderLineItem
    extra = 0


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ["so_number", "subject", "status", "total", "created_at"]
    list_filter = ["status"]
    search_fields = ["so_number", "subject"]
    inlines = [SalesOrderLineItemInline]


class PurchaseOrderLineItemInline(admin.TabularInline):
    model = PurchaseOrderLineItem
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["po_number", "subject", "status", "total", "created_at"]
    list_filter = ["status"]
    search_fields = ["po_number", "subject"]
    inlines = [PurchaseOrderLineItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "payment_number",
        "amount",
        "payment_date",
        "status",
        "payment_mode",
    ]
    list_filter = ["status", "payment_mode"]
    search_fields = ["payment_number", "reference_number"]


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ["wo_number", "subject", "status", "priority", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["wo_number", "subject"]


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ["name", "serial_number", "status", "purchase_date"]
    list_filter = ["status"]
    search_fields = ["name", "serial_number"]


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "product",
        "transaction_type",
        "quantity",
        "reference",
        "created_at",
    ]
    list_filter = ["transaction_type"]
    search_fields = ["reference"]
