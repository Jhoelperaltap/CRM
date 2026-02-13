"""
Portal-specific permission classes.

These bypass the normal staff-user JWT flow and instead verify
the portal-specific JWT claims.
"""

import jwt
from rest_framework.permissions import BasePermission

from apps.portal.auth import decode_portal_token
from apps.portal.models import ClientPortalAccess


class IsPortalAuthenticated(BasePermission):
    """
    Allows access only to authenticated portal users.
    Extracts the portal JWT from the Authorization header and attaches
    ``request.portal_access`` and ``request.portal_contact_id`` for
    downstream views.
    """

    def has_permission(self, request, view):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False

        token = auth_header[7:]
        try:
            payload = decode_portal_token(token)
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
            return False

        if payload.get("token_type") != "access":
            return False

        portal_access_id = payload.get("portal_access_id")
        try:
            portal_access = ClientPortalAccess.objects.select_related("contact").get(
                id=portal_access_id, is_active=True
            )
        except ClientPortalAccess.DoesNotExist:
            return False

        request.portal_access = portal_access
        request.portal_contact_id = str(portal_access.contact_id)
        return True


class IsContactOwner(BasePermission):
    """
    Ensures the portal user can only access data belonging to their
    own contact record.

    Assumes ``IsPortalAuthenticated`` has already run and set
    ``request.portal_contact_id``.
    """

    def has_object_permission(self, request, view, obj):
        contact_id = getattr(request, "portal_contact_id", None)
        if not contact_id:
            return False

        # Try common FK patterns
        if hasattr(obj, "contact_id"):
            return str(obj.contact_id) == contact_id
        if hasattr(obj, "id") and obj.__class__.__name__ == "Contact":
            return str(obj.id) == contact_id
        return False
