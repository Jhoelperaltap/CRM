from rest_framework.routers import DefaultRouter

from apps.core.views import BackupViewSet

router = DefaultRouter()
router.register("", BackupViewSet, basename="backup")

urlpatterns = router.urls
