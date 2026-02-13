from rest_framework.routers import DefaultRouter

from apps.cases.views import TaxCaseViewSet

router = DefaultRouter()
router.register(r"", TaxCaseViewSet, basename="taxcase")

urlpatterns = router.urls
