from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.portal.views import (
    PortalAppointmentViewSet,
    PortalCaseViewSet,
    PortalDeviceRegisterView,
    PortalDocumentViewSet,
    PortalLoginView,
    PortalLogoutView,
    PortalMessageViewSet,
    PortalMeView,
    PortalNotificationViewSet,
    PortalPasswordResetConfirmView,
    PortalPasswordResetRequestView,
    PortalTokenRefreshView,
)

router = DefaultRouter()
router.register(r"cases", PortalCaseViewSet, basename="portal-case")
router.register(r"documents", PortalDocumentViewSet, basename="portal-document")
router.register(r"messages", PortalMessageViewSet, basename="portal-message")
router.register(
    r"appointments", PortalAppointmentViewSet, basename="portal-appointment"
)
router.register(
    r"notifications", PortalNotificationViewSet, basename="portal-notification"
)

urlpatterns = [
    path("auth/login/", PortalLoginView.as_view(), name="portal-login"),
    path("auth/logout/", PortalLogoutView.as_view(), name="portal-logout"),
    path("auth/me/", PortalMeView.as_view(), name="portal-me"),
    path(
        "auth/refresh/", PortalTokenRefreshView.as_view(), name="portal-token-refresh"
    ),
    path(
        "auth/password-reset/",
        PortalPasswordResetRequestView.as_view(),
        name="portal-password-reset",
    ),
    path(
        "auth/password-reset-confirm/",
        PortalPasswordResetConfirmView.as_view(),
        name="portal-password-reset-confirm",
    ),
    path(
        "notifications/register-device/",
        PortalDeviceRegisterView.as_view(),
        name="portal-device-register",
    ),
] + router.urls
