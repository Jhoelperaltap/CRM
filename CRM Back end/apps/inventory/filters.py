import django_filters

from apps.inventory.models import (
    Asset,
    Invoice,
    Payment,
    PriceBook,
    Product,
    PurchaseOrder,
    SalesOrder,
    Service,
    StockTransaction,
    TaxRate,
    Vendor,
    WorkOrder,
)


class TaxRateFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()
    tax_type = django_filters.CharFilter()

    class Meta:
        model = TaxRate
        fields = ["is_active", "tax_type"]


class VendorFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()
    category = django_filters.CharFilter()

    class Meta:
        model = Vendor
        fields = ["is_active", "category"]


class ProductFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()
    category = django_filters.CharFilter()
    vendor = django_filters.UUIDFilter()
    low_stock = django_filters.BooleanFilter(method="filter_low_stock")

    class Meta:
        model = Product
        fields = ["is_active", "category", "vendor"]

    def filter_low_stock(self, queryset, name, value):
        if value:
            from django.db.models import F

            return queryset.filter(qty_in_stock__lte=F("reorder_level"))
        return queryset


class ServiceFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()
    category = django_filters.CharFilter()

    class Meta:
        model = Service
        fields = ["is_active", "category"]


class PriceBookFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = PriceBook
        fields = ["is_active"]


class InvoiceFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    contact = django_filters.UUIDFilter()
    corporation = django_filters.UUIDFilter()

    class Meta:
        model = Invoice
        fields = ["status", "contact", "corporation"]


class SalesOrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    contact = django_filters.UUIDFilter()
    corporation = django_filters.UUIDFilter()

    class Meta:
        model = SalesOrder
        fields = ["status", "contact", "corporation"]


class PurchaseOrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    vendor = django_filters.UUIDFilter()

    class Meta:
        model = PurchaseOrder
        fields = ["status", "vendor"]


class PaymentFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    payment_mode = django_filters.CharFilter()
    invoice = django_filters.UUIDFilter()
    contact = django_filters.UUIDFilter()

    class Meta:
        model = Payment
        fields = ["status", "payment_mode", "invoice", "contact"]


class WorkOrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    priority = django_filters.CharFilter()

    class Meta:
        model = WorkOrder
        fields = ["status", "priority"]


class AssetFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    product = django_filters.UUIDFilter()
    contact = django_filters.UUIDFilter()
    corporation = django_filters.UUIDFilter()

    class Meta:
        model = Asset
        fields = ["status", "product", "contact", "corporation"]


class StockTransactionFilter(django_filters.FilterSet):
    product = django_filters.UUIDFilter()
    transaction_type = django_filters.CharFilter()

    class Meta:
        model = StockTransaction
        fields = ["product", "transaction_type"]
