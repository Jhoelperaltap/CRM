from rest_framework.routers import DefaultRouter

from apps.esign.views import EsignDocumentViewSet

router = DefaultRouter()
router.register("", EsignDocumentViewSet, basename="esign-document")

urlpatterns = router.urls
