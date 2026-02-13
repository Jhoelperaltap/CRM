from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.portal.views_config import PortalConfigurationViewSet

router = DefaultRouter()
router.register("portal-config", PortalConfigurationViewSet, basename="portal-config")

urlpatterns = [
    path("", include(router.urls)),
]
