from django.urls import path

from apps.dashboard.report_views import (
    CaseReportView,
    ContactReportView,
    PreparerReportView,
    RevenueReportView,
)

urlpatterns = [
    path("revenue/", RevenueReportView.as_view(), name="report-revenue"),
    path("cases/", CaseReportView.as_view(), name="report-cases"),
    path("preparers/", PreparerReportView.as_view(), name="report-preparers"),
    path("contacts/", ContactReportView.as_view(), name="report-contacts"),
]
