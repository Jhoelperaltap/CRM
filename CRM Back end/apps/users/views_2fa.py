"""
Two-factor authentication views for staff users.

Endpoints:
  POST /auth/2fa/setup/          – Generate TOTP secret + QR code
  POST /auth/2fa/verify-setup/   – Verify code and enable 2FA
  POST /auth/2fa/disable/        – Disable 2FA (requires password + code)
  POST /auth/2fa/verify/         – Complete login with TOTP code
  POST /auth/2fa/recovery/       – Complete login with recovery code
  GET  /auth/2fa/status/         – Check current 2FA status
"""

import logging
import uuid

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.throttling import TwoFactorRateThrottle
from apps.users.authentication import set_auth_cookies
from apps.users.models import AuthenticationPolicy, User
from apps.users.serializers_2fa import (
    TwoFactorDisableSerializer,
    TwoFactorLoginVerifySerializer,
    TwoFactorRecoverySerializer,
    TwoFactorVerifySerializer,
)
from apps.users.totp import (
    check_recovery_code,
    generate_qr_code,
    generate_recovery_codes,
    generate_totp_secret,
    get_totp_uri,
    hash_recovery_code,
    verify_totp,
)

logger = logging.getLogger(__name__)

# JWT helpers for temp tokens ------------------------------------------------

try:
    from rest_framework_simplejwt.tokens import Token

    class TempTwoFactorToken(Token):
        token_type = "2fa_temp"
        lifetime = __import__("datetime").timedelta(minutes=5)

except Exception:
    TempTwoFactorToken = None  # type: ignore[assignment,misc]


def create_temp_2fa_token(user):
    """Create a short-lived JWT containing the user ID and a 2FA-pending flag."""
    token = RefreshToken()
    token["user_id"] = str(user.id)
    token["2fa_pending"] = True
    token.set_exp(lifetime=__import__("datetime").timedelta(minutes=5))
    return str(token.access_token)


def decode_temp_2fa_token(token_str):
    """Decode a temp 2FA token and return the user_id if valid."""
    from rest_framework_simplejwt.tokens import AccessToken

    try:
        token = AccessToken(token_str)
        if not token.get("2fa_pending"):
            return None
        user_id = token.get("user_id")
        return uuid.UUID(user_id) if user_id else None
    except Exception:
        return None


# Views -----------------------------------------------------------------------


class TwoFactorSetupView(APIView):
    """Generate a TOTP secret and QR code for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_2fa_enabled:
            return Response(
                {"detail": "2FA is already enabled. Disable it first to re-configure."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        secret = generate_totp_secret()
        # Store the secret (not yet enabled) so verify-setup can check against it
        user.totp_secret = secret
        user.save(update_fields=["totp_secret"])

        uri = get_totp_uri(user, secret)
        qr_code = generate_qr_code(uri)

        return Response({"secret": secret, "qr_code": qr_code})


class TwoFactorVerifySetupView(APIView):
    """Verify the TOTP code during setup and enable 2FA."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.totp_secret:
            return Response(
                {"detail": "No 2FA setup in progress. Call /auth/2fa/setup/ first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = serializer.validated_data["code"]
        if not verify_totp(user.totp_secret, code):
            logger.warning(
                f"2FA setup verify failed: Invalid code for user {user.email}. "
                f"Code: {code}, Secret length: {len(user.totp_secret)}"
            )
            return Response(
                {"detail": "Invalid code. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate and hash recovery codes
        raw_codes = generate_recovery_codes()
        hashed_codes = [hash_recovery_code(c) for c in raw_codes]

        user.is_2fa_enabled = True
        user.recovery_codes = hashed_codes
        user.save(update_fields=["is_2fa_enabled", "recovery_codes"])

        return Response({"recovery_codes": raw_codes})


class TwoFactorDisableView(APIView):
    """Disable 2FA for the authenticated user (requires password + TOTP code)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorDisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.is_2fa_enabled:
            return Response(
                {"detail": "2FA is not enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(serializer.validated_data["password"]):
            return Response(
                {"detail": "Incorrect password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verify_totp(user.totp_secret, serializer.validated_data["code"]):
            return Response(
                {"detail": "Invalid 2FA code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.totp_secret = ""
        user.is_2fa_enabled = False
        user.recovery_codes = []
        user.save(update_fields=["totp_secret", "is_2fa_enabled", "recovery_codes"])

        return Response({"detail": "Two-factor authentication has been disabled."})


class TwoFactorVerifyView(APIView):
    """
    Complete login by verifying a TOTP code against a temporary token.
    Called after the login endpoint returns `requires_2fa: true`.

    Security: Rate limited to prevent brute force attacks on TOTP codes.
    """

    permission_classes = [AllowAny]
    throttle_classes = [TwoFactorRateThrottle]

    def post(self, request):
        serializer = TwoFactorLoginVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = decode_temp_2fa_token(serializer.validated_data["temp_token"])
        if not user_id:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = User.objects.select_related("role").get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        code = serializer.validated_data["code"]

        # Debug logging for 2FA issues
        if not user.totp_secret:
            logger.error(f"2FA verify failed: No TOTP secret for user {user.email}")
            return Response(
                {"detail": "2FA not properly configured. Please contact support."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verify_totp(user.totp_secret, code):
            logger.warning(
                f"2FA verify failed: Invalid code for user {user.email}. "
                f"Code length: {len(code)}, Secret exists: {bool(user.totp_secret)}"
            )
            return Response(
                {"detail": "Invalid 2FA code."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Issue full JWT tokens
        refresh = RefreshToken.for_user(user)
        from apps.users.serializers import UserSerializer

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "access": access_token,
                "refresh": refresh_token,
                "user": UserSerializer(user).data,
                "cookies_set": True,
            }
        )

        # Set httpOnly cookies for browser clients
        set_auth_cookies(response, access_token, refresh_token)
        return response


class TwoFactorRecoveryView(APIView):
    """
    Complete login using a one-time recovery code.
    The code is consumed upon successful use.

    Security: Rate limited to prevent brute force attacks on recovery codes.
    """

    permission_classes = [AllowAny]
    throttle_classes = [TwoFactorRateThrottle]

    def post(self, request):
        serializer = TwoFactorRecoverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = decode_temp_2fa_token(serializer.validated_data["temp_token"])
        if not user_id:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = User.objects.select_related("role").get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not check_recovery_code(user, serializer.validated_data["recovery_code"]):
            return Response(
                {"detail": "Invalid recovery code."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Issue full JWT tokens
        refresh = RefreshToken.for_user(user)
        from apps.users.serializers import UserSerializer

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "access": access_token,
                "refresh": refresh_token,
                "user": UserSerializer(user).data,
                "cookies_set": True,
            }
        )

        # Set httpOnly cookies for browser clients
        set_auth_cookies(response, access_token, refresh_token)
        return response


class TwoFactorStatusView(APIView):
    """Return the current 2FA status for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        import pyotp
        from django.utils import timezone

        user = request.user
        policy = AuthenticationPolicy.load()

        # For debugging: include server time and TOTP diagnostics
        response_data = {
            "is_enabled": user.is_2fa_enabled,
            "enforce_required": policy.enforce_2fa,
        }

        # If 2FA is enabled and user wants to debug, include diagnostic info
        if request.query_params.get("debug") == "true" and user.is_2fa_enabled:
            now = timezone.now()
            response_data["debug"] = {
                "server_time": now.isoformat(),
                "server_timestamp": int(now.timestamp()),
                "has_secret": bool(user.totp_secret),
                "secret_length": len(user.totp_secret) if user.totp_secret else 0,
            }
            if user.totp_secret:
                try:
                    totp = pyotp.TOTP(user.totp_secret)
                    response_data["debug"]["current_code"] = totp.now()
                    response_data["debug"]["time_remaining"] = 30 - (
                        int(now.timestamp()) % 30
                    )
                except Exception as e:
                    response_data["debug"]["error"] = str(e)

        return Response(response_data)
