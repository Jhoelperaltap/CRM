from rest_framework.routers import DefaultRouter

from apps.portal.views_staff import (
    StaffDocumentReviewViewSet,
    StaffPortalAccessViewSet,
    StaffPortalMessageViewSet,
)

router = DefaultRouter()
router.register("accounts", StaffPortalAccessViewSet, basename="staff-portal-access")
router.register(
    "documents", StaffDocumentReviewViewSet, basename="staff-portal-document"
)
router.register("messages", StaffPortalMessageViewSet, basename="staff-portal-message")

urlpatterns = router.urls
