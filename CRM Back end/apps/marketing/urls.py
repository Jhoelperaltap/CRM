from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmailListViewSet,
    CampaignTemplateViewSet,
    CampaignViewSet,
    AutomationSequenceViewSet,
    AutomationStepViewSet,
    CampaignAnalyticsView,
    TrackOpenView,
    TrackClickView,
    UnsubscribeView,
)

router = DefaultRouter()
router.register(r"lists", EmailListViewSet, basename="email-list")
router.register(r"templates", CampaignTemplateViewSet, basename="campaign-template")
router.register(r"campaigns", CampaignViewSet, basename="campaign")
router.register(r"automations", AutomationSequenceViewSet, basename="automation")
router.register(r"automation-steps", AutomationStepViewSet, basename="automation-step")

urlpatterns = [
    path("", include(router.urls)),
    # Analytics
    path("analytics/", CampaignAnalyticsView.as_view(), name="campaign-analytics"),
    # Tracking endpoints (public)
    path(
        "track/open/<uuid:tracking_token>/", TrackOpenView.as_view(), name="track-open"
    ),
    path(
        "track/click/<uuid:tracking_token>/<uuid:link_id>/",
        TrackClickView.as_view(),
        name="track-click",
    ),
    # Unsubscribe (public)
    path(
        "unsubscribe/<uuid:tracking_token>/",
        UnsubscribeView.as_view(),
        name="unsubscribe",
    ),
]
