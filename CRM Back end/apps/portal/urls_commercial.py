"""
URL configuration for Commercial Buildings in the Client Portal.

These routes are mounted under /api/v1/portal/commercial/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.portal.views_commercial import (
    PortalCommercialBuildingViewSet,
    PortalCommercialDashboardView,
    PortalCommercialFloorViewSet,
    PortalCommercialLeaseViewSet,
    PortalCommercialPaymentViewSet,
    PortalCommercialTenantViewSet,
    PortalCommercialUnitViewSet,
)

router = DefaultRouter()
router.register(
    r"buildings", PortalCommercialBuildingViewSet, basename="portal-commercial-buildings"
)
router.register(
    r"floors", PortalCommercialFloorViewSet, basename="portal-commercial-floors"
)
router.register(
    r"units", PortalCommercialUnitViewSet, basename="portal-commercial-units"
)
router.register(
    r"tenants", PortalCommercialTenantViewSet, basename="portal-commercial-tenants"
)
router.register(
    r"leases", PortalCommercialLeaseViewSet, basename="portal-commercial-leases"
)
router.register(
    r"payments", PortalCommercialPaymentViewSet, basename="portal-commercial-payments"
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "dashboard/",
        PortalCommercialDashboardView.as_view(),
        name="portal-commercial-dashboard",
    ),
]
