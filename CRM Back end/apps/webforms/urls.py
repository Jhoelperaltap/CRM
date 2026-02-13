"""
URL configuration for Webforms.
"""

from rest_framework.routers import DefaultRouter

from .views import WebformViewSet

router = DefaultRouter()
router.register(r"webforms", WebformViewSet, basename="webforms")

urlpatterns = router.urls
