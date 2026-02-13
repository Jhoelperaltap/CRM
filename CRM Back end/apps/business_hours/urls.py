from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.business_hours.views import BusinessHoursViewSet

router = DefaultRouter()
router.register("business-hours", BusinessHoursViewSet, basename="business-hours")

urlpatterns = [
    path("", include(router.urls)),
]
