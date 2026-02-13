from rest_framework.routers import DefaultRouter

from apps.audit.views_settings import EncryptedFieldAccessLogViewSet

router = DefaultRouter()
router.register("", EncryptedFieldAccessLogViewSet, basename="pii-access-log")

urlpatterns = router.urls
