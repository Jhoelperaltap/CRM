from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.inventory.views import (
    AssetViewSet,
    InvoiceViewSet,
    PaymentViewSet,
    PriceBookEntryViewSet,
    PriceBookViewSet,
    ProductViewSet,
    PurchaseOrderViewSet,
    SalesOrderViewSet,
    ServiceViewSet,
    StockTransactionViewSet,
    TaxRateViewSet,
    TermsAndConditionsViewSet,
    VendorViewSet,
    WorkOrderViewSet,
)

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("services", ServiceViewSet, basename="service")
router.register("price-books", PriceBookViewSet, basename="price-book")
router.register("vendors", VendorViewSet, basename="vendor")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("sales-orders", SalesOrderViewSet, basename="sales-order")
router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register("payments", PaymentViewSet, basename="payment")
router.register("work-orders", WorkOrderViewSet, basename="work-order")
router.register("assets", AssetViewSet, basename="asset")
router.register(
    "stock-transactions", StockTransactionViewSet, basename="stock-transaction"
)

# Settings-level
router.register("tax-rates", TaxRateViewSet, basename="tax-rate")
router.register(
    "terms-conditions", TermsAndConditionsViewSet, basename="terms-conditions"
)

# Nested price book entries
price_book_entries_router = DefaultRouter()
price_book_entries_router.register(
    "entries", PriceBookEntryViewSet, basename="price-book-entry"
)

urlpatterns = [
    path(
        "price-books/<uuid:price_book_pk>/",
        include(price_book_entries_router.urls),
    ),
    path("", include(router.urls)),
]
