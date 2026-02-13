"""
Custom JWT authentication that reads tokens from httpOnly cookies.

This replaces the standard JWT header-based authentication to prevent
XSS attacks from stealing tokens stored in localStorage.

Security features:
- Access token stored in httpOnly cookie (not accessible via JavaScript)
- Refresh token stored in separate httpOnly cookie
- Secure flag enabled in production (HTTPS only)
- SameSite=Lax to prevent CSRF in most cases
- Short-lived access tokens (30 min) with longer refresh tokens (1 day)
"""

from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

# Cookie names
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that reads the access token from an httpOnly cookie.

    Falls back to Authorization header for:
    - Mobile apps (can't use httpOnly cookies)
    - API clients that prefer header-based auth
    - Backwards compatibility during migration
    """

    def authenticate(self, request):
        # First, try to get token from cookie
        raw_token = request.COOKIES.get(ACCESS_TOKEN_COOKIE)

        # If no cookie, fall back to Authorization header (for mobile/API clients)
        if not raw_token:
            return super().authenticate(request)

        # Validate the token from cookie
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except (InvalidToken, TokenError) as e:
            # Token invalid - let the request proceed without auth
            # The permission classes will handle denial
            raise exceptions.AuthenticationFailed(str(e))


def get_cookie_settings(is_access_token: bool = True) -> dict:
    """
    Get secure cookie settings based on environment.

    Args:
        is_access_token: True for access token, False for refresh token

    Returns:
        Dictionary of cookie settings
    """
    is_production = not settings.DEBUG

    # Base settings
    cookie_settings = {
        "httponly": True,  # Prevent JavaScript access (XSS protection)
        "samesite": "Lax",  # CSRF protection while allowing normal navigation
        "path": "/",  # Available for all paths
    }

    # Secure flag - only send over HTTPS in production
    if is_production:
        cookie_settings["secure"] = True
    else:
        # In development, allow non-HTTPS (localhost)
        cookie_settings["secure"] = False

    # Set max_age based on token type
    if is_access_token:
        # Access token lifetime from settings (default 30 minutes)
        lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
        cookie_settings["max_age"] = int(lifetime.total_seconds()) if lifetime else 1800
    else:
        # Refresh token lifetime from settings (default 1 day)
        lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
        cookie_settings["max_age"] = int(lifetime.total_seconds()) if lifetime else 86400

    return cookie_settings


def set_auth_cookies(response, access_token: str, refresh_token: str = None):
    """
    Set JWT tokens as httpOnly cookies on the response.

    Args:
        response: Django/DRF response object
        access_token: The JWT access token
        refresh_token: The JWT refresh token (optional)
    """
    # Set access token cookie
    access_settings = get_cookie_settings(is_access_token=True)
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        access_token,
        **access_settings
    )

    # Set refresh token cookie if provided
    if refresh_token:
        refresh_settings = get_cookie_settings(is_access_token=False)
        response.set_cookie(
            REFRESH_TOKEN_COOKIE,
            refresh_token,
            **refresh_settings
        )

    return response


def clear_auth_cookies(response):
    """
    Clear JWT cookies on logout.

    Args:
        response: Django/DRF response object
    """
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")
    return response


def get_refresh_token_from_cookie(request) -> str:
    """
    Extract refresh token from cookie.

    Args:
        request: Django request object

    Returns:
        Refresh token string or None
    """
    return request.COOKIES.get(REFRESH_TOKEN_COOKIE)
