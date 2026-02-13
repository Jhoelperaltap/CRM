from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from apps.users.views import (
    ChangePasswordView,
    CookieTokenRefreshView,
    CustomTokenObtainPairView,
    LogoutView,
    UserViewSet,
)
from apps.users.views_2fa import (
    TwoFactorDisableView,
    TwoFactorRecoveryView,
    TwoFactorSetupView,
    TwoFactorStatusView,
    TwoFactorVerifySetupView,
    TwoFactorVerifyView,
)

app_name = "auth"

# The ``me`` endpoint is registered here so that GET /api/v1/auth/me/ works
# as a lightweight "who am I?" check alongside the token endpoints.
me_view = UserViewSet.as_view({"get": "me", "patch": "me"})

urlpatterns = [
    # Token lifecycle
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("logout/", LogoutView.as_view(), name="logout"),
    # Current user
    path("me/", me_view, name="me"),
    # Password
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    # Two-factor authentication
    path("2fa/setup/", TwoFactorSetupView.as_view(), name="2fa_setup"),
    path(
        "2fa/verify-setup/", TwoFactorVerifySetupView.as_view(), name="2fa_verify_setup"
    ),
    path("2fa/disable/", TwoFactorDisableView.as_view(), name="2fa_disable"),
    path("2fa/verify/", TwoFactorVerifyView.as_view(), name="2fa_verify"),
    path("2fa/recovery/", TwoFactorRecoveryView.as_view(), name="2fa_recovery"),
    path("2fa/status/", TwoFactorStatusView.as_view(), name="2fa_status"),
]
