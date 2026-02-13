from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.emails.views import (
    EmailMessageViewSet,
    EmailTemplateViewSet,
    EmailThreadViewSet,
)

router = DefaultRouter()
router.register(r"messages", EmailMessageViewSet, basename="email-messages")
router.register(r"threads", EmailThreadViewSet, basename="email-threads")
router.register(r"templates", EmailTemplateViewSet, basename="email-templates")

urlpatterns = router.urls
