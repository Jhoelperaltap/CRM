"""
URL configuration for Portal Administration API.

All endpoints under /api/v1/portal-admin/
Only accessible by Admin role users.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.portal.views_admin import (
    ImpersonationView,
    PortalAdminLogsView,
    PortalAdminStatsView,
    PortalClientViewSet,
    PortalModulePresetViewSet,
)

router = DefaultRouter()
router.register(r"presets", PortalModulePresetViewSet, basename="portal-presets")
router.register(r"clients", PortalClientViewSet, basename="portal-clients")

urlpatterns = [
    path("", include(router.urls)),
    path("impersonate/", ImpersonationView.as_view(), name="portal-impersonate"),
    path("stats/", PortalAdminStatsView.as_view(), name="portal-admin-stats"),
    path("logs/", PortalAdminLogsView.as_view(), name="portal-admin-logs"),
]
