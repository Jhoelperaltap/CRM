from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"providers", views.VideoProviderViewSet, basename="provider")
router.register(r"connections", views.UserVideoConnectionViewSet, basename="connection")
router.register(r"meetings", views.VideoMeetingViewSet, basename="meeting")
router.register(
    r"participants", views.MeetingParticipantViewSet, basename="participant"
)
router.register(r"recordings", views.MeetingRecordingViewSet, basename="recording")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "settings/",
        views.VideoMeetingSettingsViewSet.as_view(
            {"get": "list", "patch": "partial_update"}
        ),
        name="video-settings",
    ),
]
