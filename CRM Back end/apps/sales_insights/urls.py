from django.urls import path

from apps.sales_insights.views import (
    ActivitiesAddedView,
    ActivitiesCompletedView,
    ActivityEfficiencyView,
    CasesAddedView,
    ClosedVsGoalsView,
    FunnelProgressionView,
    LostDealsView,
    PipelineActivityView,
    PipelineValueView,
    ProductPipelineView,
    ProductRevenueView,
    SalesCycleDurationView,
)

urlpatterns = [
    # Activity Reports
    path("activities-added/", ActivitiesAddedView.as_view(), name="activities-added"),
    path(
        "activities-completed/",
        ActivitiesCompletedView.as_view(),
        name="activities-completed",
    ),
    path(
        "activity-efficiency/",
        ActivityEfficiencyView.as_view(),
        name="activity-efficiency",
    ),
    # Pipeline Performance
    path("cases-added/", CasesAddedView.as_view(), name="cases-added"),
    path("pipeline-value/", PipelineValueView.as_view(), name="pipeline-value"),
    path(
        "pipeline-activity/", PipelineActivityView.as_view(), name="pipeline-activity"
    ),
    path(
        "funnel-progression/",
        FunnelProgressionView.as_view(),
        name="funnel-progression",
    ),
    path("product-pipeline/", ProductPipelineView.as_view(), name="product-pipeline"),
    # Sales Results
    path("closed-vs-goals/", ClosedVsGoalsView.as_view(), name="closed-vs-goals"),
    path("product-revenue/", ProductRevenueView.as_view(), name="product-revenue"),
    path(
        "sales-cycle-duration/",
        SalesCycleDurationView.as_view(),
        name="sales-cycle-duration",
    ),
    path("lost-deals/", LostDealsView.as_view(), name="lost-deals"),
]
