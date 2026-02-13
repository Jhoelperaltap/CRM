from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views_settings import (
    AuthenticationPolicyView,
    BlockedIPLogViewSet,
    BlockedIPViewSet,
    LoginIPWhitelistViewSet,
    SessionTimeoutView,
    SharingRuleViewSet,
    UserGroupViewSet,
)

app_name = "settings"

router = DefaultRouter()
router.register("groups", UserGroupViewSet, basename="group")
router.register("sharing-rules", SharingRuleViewSet, basename="sharing-rule")
router.register("ip-whitelist", LoginIPWhitelistViewSet, basename="ip-whitelist")
router.register("blocked-ips", BlockedIPViewSet, basename="blocked-ip")
router.register("blocked-ip-logs", BlockedIPLogViewSet, basename="blocked-ip-log")

urlpatterns = [
    path("auth-policy/", AuthenticationPolicyView.as_view(), name="auth-policy"),
    path("session-timeout/", SessionTimeoutView.as_view(), name="session-timeout"),
    path("portal/", include("apps.portal.urls_staff")),
    path("", include(router.urls)),
]
