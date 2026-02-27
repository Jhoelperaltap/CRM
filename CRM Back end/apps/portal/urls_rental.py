"""
URL configuration for Rental Properties in the Client Portal.

These routes are mounted under /api/v1/portal/rentals/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.portal.views_rental import (
    PortalRentalCategoryViewSet,
    PortalRentalDashboardView,
    PortalRentalPropertyViewSet,
    PortalRentalTransactionViewSet,
)

router = DefaultRouter()
router.register(
    r"properties", PortalRentalPropertyViewSet, basename="portal-rental-properties"
)
router.register(
    r"transactions",
    PortalRentalTransactionViewSet,
    basename="portal-rental-transactions",
)
router.register(
    r"categories", PortalRentalCategoryViewSet, basename="portal-rental-categories"
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "dashboard/",
        PortalRentalDashboardView.as_view(),
        name="portal-rental-dashboard",
    ),
]
