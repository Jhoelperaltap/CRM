from rest_framework.routers import DefaultRouter

from apps.audit.views_settings import SettingsLogViewSet

router = DefaultRouter()
router.register("", SettingsLogViewSet, basename="settings-log")

urlpatterns = router.urls
