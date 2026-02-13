from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.inventory.filters import (
    AssetFilter,
    InvoiceFilter,
    PaymentFilter,
    PriceBookFilter,
    ProductFilter,
    PurchaseOrderFilter,
    SalesOrderFilter,
    ServiceFilter,
    StockTransactionFilter,
    TaxRateFilter,
    VendorFilter,
    WorkOrderFilter,
)
from apps.inventory.models import (
    Asset,
    Invoice,
    Payment,
    PriceBook,
    PriceBookEntry,
    Product,
    PurchaseOrder,
    SalesOrder,
    Service,
    StockTransaction,
    TaxRate,
    TermsAndConditions,
    Vendor,
    WorkOrder,
)
from apps.inventory.serializers import (
    AssetCreateUpdateSerializer,
    AssetDetailSerializer,
    AssetListSerializer,
    InvoiceCreateUpdateSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
    PaymentCreateUpdateSerializer,
    PaymentDetailSerializer,
    PaymentListSerializer,
    PriceBookCreateUpdateSerializer,
    PriceBookDetailSerializer,
    PriceBookEntrySerializer,
    PriceBookListSerializer,
    ProductCreateUpdateSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    PurchaseOrderCreateUpdateSerializer,
    PurchaseOrderDetailSerializer,
    PurchaseOrderListSerializer,
    SalesOrderCreateUpdateSerializer,
    SalesOrderDetailSerializer,
    SalesOrderListSerializer,
    ServiceCreateUpdateSerializer,
    ServiceDetailSerializer,
    ServiceListSerializer,
    StockTransactionSerializer,
    TaxRateSerializer,
    TermsAndConditionsSerializer,
    VendorCreateUpdateSerializer,
    VendorDetailSerializer,
    VendorListSerializer,
    WorkOrderCreateUpdateSerializer,
    WorkOrderDetailSerializer,
    WorkOrderListSerializer,
)
from apps.users.permissions import IsAdminRole


# ---------------------------------------------------------------------------
# Tax Rate
# ---------------------------------------------------------------------------
class TaxRateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = TaxRateSerializer
    filterset_class = TaxRateFilter
    search_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        return TaxRate.objects.all()


# ---------------------------------------------------------------------------
# Terms and Conditions
# ---------------------------------------------------------------------------
class TermsAndConditionsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = TermsAndConditionsSerializer
    search_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        return TermsAndConditions.objects.all()


# ---------------------------------------------------------------------------
# Vendor
# ---------------------------------------------------------------------------
class VendorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = VendorFilter
    search_fields = ["name", "vendor_code", "email"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Vendor.objects.select_related("assigned_to", "created_by")

    def get_serializer_class(self):
        if self.action == "list":
            return VendorListSerializer
        if self.action in ("create", "update", "partial_update"):
            return VendorCreateUpdateSerializer
        return VendorDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------
class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = ProductFilter
    search_fields = ["name", "product_code", "manufacturer"]
    ordering_fields = ["name", "unit_price", "qty_in_stock", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Product.objects.select_related("vendor", "tax_rate")

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class ServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = ServiceFilter
    search_fields = ["name", "service_code"]
    ordering_fields = ["name", "unit_price", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Service.objects.select_related("tax_rate")

    def get_serializer_class(self):
        if self.action == "list":
            return ServiceListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ServiceCreateUpdateSerializer
        return ServiceDetailSerializer


# ---------------------------------------------------------------------------
# Price Book
# ---------------------------------------------------------------------------
class PriceBookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = PriceBookFilter
    search_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        qs = PriceBook.objects.all()
        if self.action == "list":
            qs = qs.annotate(entry_count=Count("entries"))
        else:
            qs = qs.prefetch_related(
                "entries__product", "entries__service"
            )
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PriceBookListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PriceBookCreateUpdateSerializer
        return PriceBookDetailSerializer


class PriceBookEntryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PriceBookEntrySerializer
    pagination_class = None

    def get_queryset(self):
        return PriceBookEntry.objects.filter(
            price_book_id=self.kwargs["price_book_pk"]
        ).select_related("product", "service")

    def perform_create(self, serializer):
        serializer.save(price_book_id=self.kwargs["price_book_pk"])


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------
class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = InvoiceFilter
    search_fields = ["invoice_number", "subject"]
    ordering_fields = ["invoice_number", "total", "created_at", "due_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Invoice.objects.select_related(
            "contact", "corporation", "assigned_to", "created_by", "sales_order"
        ).prefetch_related("line_items__product", "line_items__service")

    def get_serializer_class(self):
        if self.action == "list":
            return InvoiceListSerializer
        if self.action in ("create", "update", "partial_update"):
            return InvoiceCreateUpdateSerializer
        return InvoiceDetailSerializer


# ---------------------------------------------------------------------------
# Sales Order
# ---------------------------------------------------------------------------
class SalesOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = SalesOrderFilter
    search_fields = ["so_number", "subject"]
    ordering_fields = ["so_number", "total", "created_at", "due_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return SalesOrder.objects.select_related(
            "contact", "corporation", "assigned_to", "created_by", "quote"
        ).prefetch_related("line_items__product", "line_items__service")

    def get_serializer_class(self):
        if self.action == "list":
            return SalesOrderListSerializer
        if self.action in ("create", "update", "partial_update"):
            return SalesOrderCreateUpdateSerializer
        return SalesOrderDetailSerializer


# ---------------------------------------------------------------------------
# Purchase Order
# ---------------------------------------------------------------------------
class PurchaseOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = PurchaseOrderFilter
    search_fields = ["po_number", "subject"]
    ordering_fields = ["po_number", "total", "created_at", "due_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return PurchaseOrder.objects.select_related(
            "vendor", "contact", "assigned_to", "created_by"
        ).prefetch_related("line_items__product", "line_items__service")

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PurchaseOrderCreateUpdateSerializer
        return PurchaseOrderDetailSerializer


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------
class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = PaymentFilter
    search_fields = ["payment_number", "reference_number"]
    ordering_fields = ["payment_date", "amount", "created_at"]
    ordering = ["-payment_date"]

    def get_queryset(self):
        return Payment.objects.select_related(
            "invoice", "contact", "created_by"
        )

    def get_serializer_class(self):
        if self.action == "list":
            return PaymentListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PaymentCreateUpdateSerializer
        return PaymentDetailSerializer


# ---------------------------------------------------------------------------
# Work Order
# ---------------------------------------------------------------------------
class WorkOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = WorkOrderFilter
    search_fields = ["wo_number", "subject"]
    ordering_fields = ["wo_number", "start_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return WorkOrder.objects.select_related(
            "assigned_to", "created_by", "sales_order"
        )

    def get_serializer_class(self):
        if self.action == "list":
            return WorkOrderListSerializer
        if self.action in ("create", "update", "partial_update"):
            return WorkOrderCreateUpdateSerializer
        return WorkOrderDetailSerializer


# ---------------------------------------------------------------------------
# Asset
# ---------------------------------------------------------------------------
class AssetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = AssetFilter
    search_fields = ["name", "serial_number"]
    ordering_fields = ["name", "purchase_date", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Asset.objects.select_related(
            "product", "contact", "corporation", "assigned_to"
        )

    def get_serializer_class(self):
        if self.action == "list":
            return AssetListSerializer
        if self.action in ("create", "update", "partial_update"):
            return AssetCreateUpdateSerializer
        return AssetDetailSerializer


# ---------------------------------------------------------------------------
# Stock Transaction
# ---------------------------------------------------------------------------
class StockTransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = StockTransactionFilter
    search_fields = ["reference"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return StockTransaction.objects.select_related("product", "created_by")

    def get_serializer_class(self):
        return StockTransactionSerializer
