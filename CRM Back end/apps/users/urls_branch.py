from rest_framework.routers import DefaultRouter

from apps.users.views_branch import BranchViewSet

router = DefaultRouter()
router.register("", BranchViewSet, basename="branch")

urlpatterns = router.urls
