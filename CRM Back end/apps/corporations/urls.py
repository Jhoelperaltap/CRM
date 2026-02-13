from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.corporations.views import CorporationViewSet

app_name = "corporations"

router = DefaultRouter()
router.register("", CorporationViewSet, basename="corporation")

urlpatterns = [
    path("", include(router.urls)),
]
