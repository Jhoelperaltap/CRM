from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"providers", views.TelephonyProviderViewSet, basename="provider")
router.register(r"lines", views.PhoneLineViewSet, basename="line")
router.register(r"calls", views.CallViewSet, basename="call")
router.register(r"queues", views.CallQueueViewSet, basename="queue")
router.register(r"queue-members", views.CallQueueMemberViewSet, basename="queue-member")
router.register(r"voicemails", views.VoicemailViewSet, basename="voicemail")
router.register(r"scripts", views.CallScriptViewSet, basename="script")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "settings/",
        views.CallSettingsViewSet.as_view({"get": "list", "patch": "partial_update"}),
        name="call-settings",
    ),
]
