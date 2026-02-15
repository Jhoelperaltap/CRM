"""
Example usage of SecurityEventLogger in authentication views.

This file demonstrates how to integrate the SecurityEventLogger
into your Django REST Framework views and authentication backends.
"""

from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.logging import security_event_logger
from apps.users.models import User


# Example 1: Login View with Security Logging
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login endpoint with comprehensive security logging.
    """
    email = request.data.get("email")
    password = request.data.get("password")

    # Get request metadata
    ip_address = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    # Check if IP is already flagged for suspicious activity
    if security_event_logger.is_suspicious_activity(ip_address=ip_address):
        security_event_logger.log_suspicious_activity(
            ip_address=ip_address,
            email=email,
            description="Login attempt from IP with suspicious activity history",
            user_agent=user_agent,
        )
        return Response(
            {"error": "Account temporarily locked. Please contact support."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Attempt authentication
    user = authenticate(request, email=email, password=password)

    if user is not None:
        if not user.is_active:
            security_event_logger.log_login_failed(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="account_inactive",
            )
            return Response(
                {"error": "Account is inactive"}, status=status.HTTP_403_FORBIDDEN
            )

        # Check if account is locked
        if hasattr(user, "is_locked") and user.is_locked:
            security_event_logger.log_login_failed(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="account_locked",
            )
            return Response(
                {"error": "Account is locked"}, status=status.HTTP_403_FORBIDDEN
            )

        # Successful login
        security_event_logger.log_login_success(
            user_id=str(user.id),
            email=user.email,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}",
                },
            }
        )

    else:
        # Failed login
        security_event_logger.log_login_failed(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="invalid_credentials",
        )

        # Check if we should lock the account
        failed_count = security_event_logger.get_failed_login_count(ip_address)
        if failed_count >= 5:  # Lock after 5 failed attempts
            try:
                user_to_lock = User.objects.get(email=email)
                user_to_lock.is_locked = True
                user_to_lock.save()

                security_event_logger.log_account_locked(
                    user_id=str(user_to_lock.id),
                    email=user_to_lock.email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason="too_many_failed_attempts",
                )
            except User.DoesNotExist:
                pass

        return Response(
            {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
        )


# Example 2: Password Change View with Security Logging
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change password endpoint with security logging.
    """
    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")

    ip_address = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    # Verify old password
    if not user.check_password(old_password):
        return Response(
            {"error": "Current password is incorrect"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Set new password
    user.set_password(new_password)
    user.save()

    # Log the password change
    security_event_logger.log_password_changed(
        user_id=str(user.id),
        email=user.email,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return Response({"message": "Password changed successfully"})


# Example 3: Enable 2FA View with Security Logging
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enable_2fa_view(request):
    """
    Enable two-factor authentication with security logging.
    """
    user = request.user
    method = request.data.get("method", "totp")

    ip_address = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    # Enable 2FA (implementation depends on your 2FA library)
    user.two_factor_enabled = True
    user.two_factor_method = method
    user.save()

    # Log the 2FA enablement
    security_event_logger.log_2fa_enabled(
        user_id=str(user.id),
        email=user.email,
        ip_address=ip_address,
        user_agent=user_agent,
        method=method,
    )

    return Response({"message": "2FA enabled successfully"})


# Example 4: Permission Denied Logging in DRF Permission Class
from rest_framework.permissions import BasePermission  # noqa: E402


class LoggedPermission(BasePermission):
    """
    Custom permission class that logs permission denials.
    """

    def has_permission(self, request, view):
        """Check if user has permission."""
        if not request.user.is_authenticated:
            return False

        # Check some custom permission logic
        has_perm = self._check_permission(request, view)

        if not has_perm:
            # Log permission denied
            ip_address = get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")

            security_event_logger.log_permission_denied(
                user_id=str(request.user.id),
                email=request.user.email,
                resource=request.path,
                action=request.method,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return has_perm

    def _check_permission(self, request, view):
        """Implement your permission logic here."""
        # Example: Check if user has required role
        required_role = getattr(view, "required_role", None)
        if required_role:
            return request.user.role.name == required_role
        return True


# Example 5: Middleware for Suspicious Activity Monitoring
class SuspiciousActivityMiddleware:
    """
    Middleware to monitor and block suspicious activity.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip_address = get_client_ip(request)

        # Check for suspicious activity before processing request
        if security_event_logger.is_suspicious_activity(ip_address=ip_address):
            # For non-authenticated endpoints, block the request
            if not request.user.is_authenticated and request.path.startswith(
                "/api/v1/auth/"
            ):
                return Response(
                    {"error": "Too many requests. Please try again later."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        response = self.get_response(request)
        return response


# Example 6: Custom Authentication Backend with Security Logging
from django.contrib.auth.backends import ModelBackend  # noqa: E402


class LoggedAuthenticationBackend(ModelBackend):
    """
    Custom authentication backend that integrates security logging.
    """

    def authenticate(self, request, email=None, password=None, **kwargs):
        """
        Authenticate user with security logging.
        """
        ip_address = get_client_ip(request) if request else None
        user_agent = request.META.get("HTTP_USER_AGENT", "") if request else ""

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # User not found - still log the attempt
            if request:
                security_event_logger.log_login_failed(
                    email=email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason="user_not_found",
                )
            return None

        # Check password
        if user.check_password(password):
            return user

        return None


# Helper function to extract client IP
def get_client_ip(request):
    """
    Get the client's IP address from the request.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


# Example 7: Scheduled Task to Review Security Events
from celery import shared_task  # noqa: E402


@shared_task
def review_security_events():
    """
    Periodic task to review and alert on security events.

    This could be scheduled to run every hour to check for:
    - Accounts with multiple failed login attempts
    - IPs with suspicious activity patterns
    - Unusual access patterns
    """
    # This is a placeholder - actual implementation would query
    # your logging/monitoring system (ELK, Splunk, etc.)

    # Example: Check Redis cache for IPs with high failed login counts
    # and send alerts to administrators

    pass


# Example 8: API View for Security Event Dashboard
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def security_events_view(request):
    """
    View recent security events (for administrators).

    This would typically query your centralized logging system.
    """
    if not request.user.is_staff:
        return Response(
            {"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN
        )

    # In production, this would query Elasticsearch, Splunk, etc.
    # For now, we can show information from cache

    ip_address = request.query_params.get("ip_address")
    email = request.query_params.get("email")

    result = {}

    if ip_address:
        failed_count = security_event_logger.get_failed_login_count(ip_address)
        is_suspicious = security_event_logger.is_suspicious_activity(
            ip_address=ip_address
        )
        result["ip_address"] = {
            "address": ip_address,
            "failed_login_count": failed_count,
            "is_suspicious": is_suspicious,
        }

    if email:
        is_suspicious = security_event_logger.is_suspicious_activity(email=email)
        result["email"] = {
            "address": email,
            "is_suspicious": is_suspicious,
        }

    return Response(result)
