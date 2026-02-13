from django.urls import path

from apps.forecasts.views import (
    ForecastEntryDetailView,
    ForecastEntryListView,
    ForecastSummaryView,
    ForecastTeamDetailView,
    QuotaBulkSetView,
    QuotaListView,
    TeamUsersView,
)

urlpatterns = [
    path("quotas/", QuotaListView.as_view(), name="quota-list"),
    path("quotas/bulk/", QuotaBulkSetView.as_view(), name="quota-bulk-set"),
    path("entries/", ForecastEntryListView.as_view(), name="forecast-entry-list"),
    path(
        "entries/<uuid:pk>/",
        ForecastEntryDetailView.as_view(),
        name="forecast-entry-detail",
    ),
    path("summary/", ForecastSummaryView.as_view(), name="forecast-summary"),
    path("team-detail/", ForecastTeamDetailView.as_view(), name="forecast-team-detail"),
    path("team-users/", TeamUsersView.as_view(), name="forecast-team-users"),
]
