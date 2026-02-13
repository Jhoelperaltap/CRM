from rest_framework.routers import DefaultRouter

from apps.documents.views import (
    DocumentFolderViewSet,
    DocumentLinkViewSet,
    DocumentTagViewSet,
    DocumentViewSet,
)

router = DefaultRouter()
router.register(r"folders", DocumentFolderViewSet, basename="document-folder")
router.register(r"tags", DocumentTagViewSet, basename="document-tag")
router.register(r"links", DocumentLinkViewSet, basename="document-link")
router.register(r"", DocumentViewSet, basename="document")

urlpatterns = router.urls
