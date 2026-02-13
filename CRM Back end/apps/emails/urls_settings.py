from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.emails.views_settings import (
    EmailAccountViewSet,
    EmailSettingsView,
    EmailSyncLogViewSet,
)

router = DefaultRouter()
router.register(r"email-accounts", EmailAccountViewSet, basename="email-accounts")
router.register(r"email-logs", EmailSyncLogViewSet, basename="email-sync-logs")

urlpatterns = [
    path("email-settings/", EmailSettingsView.as_view(), name="email-settings"),
] + router.urls
