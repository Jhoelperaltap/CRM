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
    Extracts the portal JWT from either:
    1. Authorization header (Bearer token) - for mobile apps
    2. httpOnly cookies - for web browsers (XSS protection)

    Attaches ``request.portal_access`` and ``request.portal_contact_id`` for
    downstream views.
    """

    def has_permission(self, request, view):
        from apps.portal.auth import PORTAL_ACCESS_TOKEN_COOKIE

        token = None

        # Try Authorization header first (mobile apps)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        # Fall back to httpOnly cookie (web browsers)
        if not token:
            token = request.COOKIES.get(PORTAL_ACCESS_TOKEN_COOKIE)

        if not token:
            return False

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


class HasBillingPortalAccess(BasePermission):
    """
    Allows access only to portal users with active billing portal access.
    Attaches ``request.billing_access`` and ``request.tenant`` for downstream views.

    Assumes ``IsPortalAuthenticated`` has already run and set
    ``request.portal_access``.
    """

    def has_permission(self, request, view):
        portal_access = getattr(request, "portal_access", None)
        if not portal_access:
            return False

        from apps.portal.models import BillingPortalAccess

        try:
            billing_access = BillingPortalAccess.objects.select_related("tenant").get(
                portal_access=portal_access, is_active=True
            )
        except BillingPortalAccess.DoesNotExist:
            return False

        request.billing_access = billing_access
        request.tenant = billing_access.tenant
        return True


class CanManageProducts(BasePermission):
    """Check if billing user can manage products."""

    def has_permission(self, request, view):
        billing_access = getattr(request, "billing_access", None)
        if not billing_access:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return billing_access.can_manage_products


class CanManageServices(BasePermission):
    """Check if billing user can manage services."""

    def has_permission(self, request, view):
        billing_access = getattr(request, "billing_access", None)
        if not billing_access:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return billing_access.can_manage_services


class CanCreateInvoices(BasePermission):
    """Check if billing user can create/manage invoices."""

    def has_permission(self, request, view):
        billing_access = getattr(request, "billing_access", None)
        if not billing_access:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return billing_access.can_create_invoices


class CanCreateQuotes(BasePermission):
    """Check if billing user can create/manage quotes."""

    def has_permission(self, request, view):
        billing_access = getattr(request, "billing_access", None)
        if not billing_access:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return billing_access.can_create_quotes


class CanViewReports(BasePermission):
    """Check if billing user can view reports/dashboard."""

    def has_permission(self, request, view):
        billing_access = getattr(request, "billing_access", None)
        if not billing_access:
            return False
        return billing_access.can_view_reports
