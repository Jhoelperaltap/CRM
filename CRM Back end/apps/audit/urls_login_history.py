from rest_framework.routers import DefaultRouter

from apps.audit.views_settings import LoginHistoryViewSet

router = DefaultRouter()
router.register("", LoginHistoryViewSet, basename="login-history")

urlpatterns = router.urls
