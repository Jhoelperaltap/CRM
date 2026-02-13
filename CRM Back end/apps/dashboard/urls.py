from django.urls import path

from apps.dashboard.views import (
    DashboardConfigView,
    DashboardView,
    DashboardWidgetListView,
)

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard-data"),
    path("config/", DashboardConfigView.as_view(), name="dashboard-config"),
    path("widgets/", DashboardWidgetListView.as_view(), name="dashboard-widgets"),
]
