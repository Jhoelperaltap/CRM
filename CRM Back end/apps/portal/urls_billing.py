"""
URL configuration for the billing portal API.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.portal.views_billing import (
    PortalBillingDashboardView,
    PortalBillingInvoiceViewSet,
    PortalBillingProductViewSet,
    PortalBillingQuoteViewSet,
    PortalBillingServiceViewSet,
)

router = DefaultRouter()
router.register(r"products", PortalBillingProductViewSet, basename="billing-product")
router.register(r"services", PortalBillingServiceViewSet, basename="billing-service")
router.register(r"invoices", PortalBillingInvoiceViewSet, basename="billing-invoice")
router.register(r"quotes", PortalBillingQuoteViewSet, basename="billing-quote")

urlpatterns = [
    path("dashboard/", PortalBillingDashboardView.as_view(), name="billing-dashboard"),
] + router.urls
