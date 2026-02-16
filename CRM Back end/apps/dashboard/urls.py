from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.dashboard.views import (
    DashboardConfigView,
    DashboardView,
    DashboardWidgetListView,
    StickyNoteViewSet,
)

router = DefaultRouter()
router.register(r"sticky-notes", StickyNoteViewSet, basename="sticky-notes")

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard-data"),
    path("config/", DashboardConfigView.as_view(), name="dashboard-config"),
    path("widgets/", DashboardWidgetListView.as_view(), name="dashboard-widgets"),
    path("", include(router.urls)),
]
