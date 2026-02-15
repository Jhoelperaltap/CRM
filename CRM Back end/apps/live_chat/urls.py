from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CannedResponseViewSet,
    ChatAgentViewSet,
    ChatDepartmentViewSet,
    ChatSessionViewSet,
    ChatStatsView,
    ChatWidgetSettingsView,
    OfflineMessageViewSet,
    PublicChatRatingView,
    PublicChatSessionView,
    PublicChatView,
)

router = DefaultRouter()
router.register(r"departments", ChatDepartmentViewSet, basename="chat-department")
router.register(r"agents", ChatAgentViewSet, basename="chat-agent")
router.register(r"sessions", ChatSessionViewSet, basename="chat-session")
router.register(r"canned-responses", CannedResponseViewSet, basename="canned-response")
router.register(r"offline-messages", OfflineMessageViewSet, basename="offline-message")

urlpatterns = [
    path("", include(router.urls)),
    path("widget-settings/", ChatWidgetSettingsView.as_view(), name="widget-settings"),
    path("stats/", ChatStatsView.as_view(), name="chat-stats"),
    # Public endpoints for chat widget
    path("public/", PublicChatView.as_view(), name="public-chat"),
    path(
        "public/<str:session_id>/",
        PublicChatSessionView.as_view(),
        name="public-chat-session",
    ),
    path(
        "public/<str:session_id>/rate/",
        PublicChatRatingView.as_view(),
        name="public-chat-rate",
    ),
]
