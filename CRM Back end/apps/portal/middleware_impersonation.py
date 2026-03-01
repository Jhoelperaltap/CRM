"""
Middleware for handling portal impersonation.

Detects impersonation tokens and:
1. Sets impersonation context on request
2. Blocks password change operations
3. Tracks impersonation activity
"""

from django.http import JsonResponse
from django.utils import timezone

from apps.portal.models_admin import PortalImpersonationToken


class PortalImpersonationMiddleware:
    """
    Middleware to handle impersonation in the portal.

    Checks for impersonation token in:
    - Query parameter: ?impersonate=<token>
    - Header: X-Impersonation-Token: <token>
    - Cookie: impersonation_token

    If valid token found, sets:
    - request.is_impersonating = True
    - request.impersonation_token = <token object>
    - request.impersonating_admin = <admin user>
    - request.impersonated_contact = <contact>
    """

    # Paths that are blocked during impersonation
    BLOCKED_PATHS = [
        "/api/v1/portal/auth/change-password",
        "/api/v1/portal/auth/update-password",
        "/api/v1/portal/auth/set-password",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Initialize impersonation attributes
        request.is_impersonating = False
        request.impersonation_token = None
        request.impersonating_admin = None
        request.impersonated_contact = None

        # Only check for portal routes
        if not request.path.startswith("/api/v1/portal/"):
            return self.get_response(request)

        # Try to get impersonation token
        token_value = self._get_token_from_request(request)

        if token_value:
            token = self._validate_token(token_value)
            if token:
                request.is_impersonating = True
                request.impersonation_token = token
                request.impersonating_admin = token.admin_user
                request.impersonated_contact = token.contact

                # Block certain operations during impersonation
                if self._is_blocked_path(request.path):
                    return JsonResponse(
                        {
                            "detail": "This operation is not allowed during impersonation.",
                            "code": "impersonation_blocked",
                        },
                        status=403,
                    )

        response = self.get_response(request)
        return response

    def _get_token_from_request(self, request):
        """Extract impersonation token from request."""
        # Check query parameter
        token = request.GET.get("impersonate")
        if token:
            return token

        # Check header
        token = request.META.get("HTTP_X_IMPERSONATION_TOKEN")
        if token:
            return token

        # Check cookie
        token = request.COOKIES.get("impersonation_token")
        if token:
            return token

        return None

    def _validate_token(self, token_value):
        """Validate impersonation token and return token object if valid."""
        try:
            token = PortalImpersonationToken.objects.select_related(
                "admin_user", "contact"
            ).get(token=token_value)

            if token.is_valid:
                return token

        except PortalImpersonationToken.DoesNotExist:
            pass

        return None

    def _is_blocked_path(self, path):
        """Check if the path is blocked during impersonation."""
        path_lower = path.lower()
        for blocked in self.BLOCKED_PATHS:
            if blocked.lower() in path_lower:
                return True
        return False


def get_impersonation_context(request):
    """
    Helper function to get impersonation context from request.

    Returns dict with impersonation info or None if not impersonating.
    """
    if not getattr(request, "is_impersonating", False):
        return None

    token = request.impersonation_token
    admin = request.impersonating_admin
    contact = request.impersonated_contact

    return {
        "is_impersonating": True,
        "admin_id": str(admin.id) if admin else None,
        "admin_name": f"{admin.first_name} {admin.last_name}".strip() if admin else None,
        "admin_email": admin.email if admin else None,
        "contact_id": str(contact.id) if contact else None,
        "contact_name": f"{contact.first_name} {contact.last_name}".strip() if contact else None,
        "expires_at": token.expires_at if token else None,
        "remaining_minutes": token.get_remaining_minutes() if token else 0,
    }
