"""
JWT authentication utilities for the client portal.

Portal tokens are distinct from staff JWT tokens — they carry
a ``portal: true`` claim and a ``contact_id`` instead of ``user_id``.

SECURITY:
- Portal uses a SEPARATE signing key (PORTAL_JWT_SIGNING_KEY) from
  staff JWT (JWT_SIGNING_KEY). This prevents privilege escalation attacks where
  a compromised portal token could be used to access staff APIs.
- Tokens are stored in httpOnly cookies to prevent XSS attacks.
"""

import datetime

import jwt
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

# Cookie names for portal authentication
PORTAL_ACCESS_TOKEN_COOKIE = "portal_access_token"
PORTAL_REFRESH_TOKEN_COOKIE = "portal_refresh_token"


def _get_portal_signing_key() -> str:
    """
    Get the portal-specific JWT signing key.

    SECURITY: This is intentionally separate from the staff JWT signing key
    to prevent token cross-contamination and privilege escalation.
    """
    return getattr(
        settings,
        "PORTAL_JWT_SIGNING_KEY",
        settings.SECRET_KEY,  # Fallback for backwards compatibility only
    )


def hash_portal_password(raw_password: str) -> str:
    return make_password(raw_password)


def verify_portal_password(portal_access, raw_password: str) -> bool:
    return check_password(raw_password, portal_access.password_hash)


def create_portal_tokens(portal_access):
    """
    Return an access/refresh token pair with portal-specific claims.

    SECURITY: Uses PORTAL_JWT_SIGNING_KEY, separate from staff JWT key.
    """
    now = timezone.now()
    signing_key = _get_portal_signing_key()

    access_payload = {
        "portal": True,
        "contact_id": str(portal_access.contact_id),
        "portal_access_id": str(portal_access.id),
        "email": portal_access.email,
        "token_type": "access",
        "exp": now + datetime.timedelta(minutes=30),
        "iat": now,
    }

    refresh_payload = {
        "portal": True,
        "contact_id": str(portal_access.contact_id),
        "portal_access_id": str(portal_access.id),
        "token_type": "refresh",
        "exp": now + datetime.timedelta(days=1),
        "iat": now,
    }

    access_token = jwt.encode(access_payload, signing_key, algorithm="HS256")
    refresh_token = jwt.encode(refresh_payload, signing_key, algorithm="HS256")

    return {
        "access": access_token,
        "refresh": refresh_token,
    }


def decode_portal_token(token: str):
    """
    Decode and validate a portal JWT.
    Returns the payload dict or raises jwt.InvalidTokenError.

    SECURITY: Uses PORTAL_JWT_SIGNING_KEY, separate from staff JWT key.
    This means staff tokens cannot be decoded as portal tokens and vice versa.
    """
    signing_key = _get_portal_signing_key()
    payload = jwt.decode(token, signing_key, algorithms=["HS256"])
    if not payload.get("portal"):
        raise jwt.InvalidTokenError("Not a portal token")
    return payload


def get_portal_cookie_settings(is_access_token: bool = True) -> dict:
    """
    Get secure cookie settings for portal tokens.

    SECURITY: httpOnly cookies prevent JavaScript access (XSS protection).
    """
    is_production = not settings.DEBUG

    cookie_settings = {
        "httponly": True,  # Prevent JavaScript access (XSS protection)
        "samesite": "Lax",  # CSRF protection while allowing navigation
        "path": "/",
    }

    # Secure flag - only send over HTTPS in production
    cookie_settings["secure"] = is_production

    # Set max_age based on token type
    if is_access_token:
        cookie_settings["max_age"] = 30 * 60  # 30 minutes
    else:
        cookie_settings["max_age"] = 24 * 60 * 60  # 1 day

    return cookie_settings


def set_portal_auth_cookies(response, access_token: str, refresh_token: str = None):
    """
    Set portal JWT tokens as httpOnly cookies.

    SECURITY: This prevents XSS attacks from stealing portal authentication tokens.
    """
    access_settings = get_portal_cookie_settings(is_access_token=True)
    response.set_cookie(PORTAL_ACCESS_TOKEN_COOKIE, access_token, **access_settings)

    if refresh_token:
        refresh_settings = get_portal_cookie_settings(is_access_token=False)
        response.set_cookie(
            PORTAL_REFRESH_TOKEN_COOKIE, refresh_token, **refresh_settings
        )

    return response


def clear_portal_auth_cookies(response):
    """
    Clear portal JWT cookies on logout.
    """
    response.delete_cookie(PORTAL_ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(PORTAL_REFRESH_TOKEN_COOKIE, path="/")
    return response


def get_portal_token_from_cookie(request, token_type: str = "access") -> str:
    """
    Extract portal token from cookie.

    Args:
        request: Django request object
        token_type: "access" or "refresh"

    Returns:
        Token string or None
    """
    cookie_name = (
        PORTAL_ACCESS_TOKEN_COOKIE
        if token_type == "access"
        else PORTAL_REFRESH_TOKEN_COOKIE
    )
    return request.COOKIES.get(cookie_name)
