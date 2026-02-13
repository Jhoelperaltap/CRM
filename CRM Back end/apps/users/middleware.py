import logging

from django.http import JsonResponse
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)


def _get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _get_jwt_user_and_token(request):
    """Extract JWT user and validated token from the Authorization header."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None, None
    try:
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(auth_header.split(" ", 1)[1])
        user = jwt_auth.get_user(validated_token)
        return user, validated_token
    except Exception:
        return None, None


class BlockedIPMiddleware:
    """
    Checks if the client IP is in the blocked IP list.
    Returns 403 if the IP is blocked.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from apps.users.models import BlockedIP

        client_ip = _get_client_ip(request)
        blocked_entries = BlockedIP.objects.filter(is_active=True)

        for entry in blocked_entries:
            if entry.matches(client_ip):
                # Log the blocked request
                self._log_blocked_request(entry, request, client_ip)
                return JsonResponse(
                    {"detail": "Access denied: Your IP address has been blocked."},
                    status=403,
                )

        return self.get_response(request)

    def _log_blocked_request(self, blocked_ip, request, client_ip):
        """Create a log entry for the blocked request."""
        from apps.users.models import BlockedIPLog

        # Determine request type
        path = request.path
        if "/webforms/" in path or "/webform" in path:
            request_type = BlockedIPLog.RequestType.WEBFORM
        elif "/auth/" in path or "/login" in path:
            request_type = BlockedIPLog.RequestType.LOGIN
        elif "/api/" in path:
            request_type = BlockedIPLog.RequestType.API
        else:
            request_type = BlockedIPLog.RequestType.OTHER

        # Create log entry
        try:
            BlockedIPLog.objects.create(
                blocked_ip=blocked_ip,
                ip_address=client_ip,
                request_type=request_type,
                request_path=path[:500],
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:1000],
            )
            # Increment counter
            blocked_ip.increment_blocked_count()
        except Exception as e:
            logger.warning(f"Failed to log blocked IP request: {e}")


class IPWhitelistMiddleware:
    """
    If active IP whitelist entries exist for the authenticated user's role
    or the user specifically, verify that the client IP matches at least one.
    Returns 403 if no match.  No-op when no whitelist entries exist.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Try JWT auth first, fall back to request.user
        user, _ = _get_jwt_user_and_token(request)
        if user is None:
            user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            from django.db.models import Q

            from apps.users.models import LoginIPWhitelist

            q = Q(is_active=True)
            role_q = Q(role=user.role) if user.role_id else Q()
            user_q = Q(user=user)
            entries = LoginIPWhitelist.objects.filter(q & (role_q | user_q))

            if entries.exists():
                client_ip = _get_client_ip(request)
                if not any(entry.matches(client_ip) for entry in entries):
                    return JsonResponse(
                        {"detail": "Access denied: IP address not allowed."},
                        status=403,
                    )

        return self.get_response(request)


class SessionTimeoutMiddleware:
    """
    Checks the UserSession associated with the JWT's jti claim.
    If idle for longer than the configured timeout, deactivates the session
    and returns 401.  Otherwise updates last_activity.

    NOTE: Token refresh endpoints are excluded from activity tracking to ensure
    that automatic token refreshes don't reset the inactivity timer.
    """

    # Paths that should NOT reset the inactivity timer
    EXCLUDED_PATHS = [
        "/api/v1/auth/refresh/",
        "/api/v1/portal/auth/refresh/",
        "/api/v1/settings/session-timeout/",  # Don't count checking timeout
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user, token = _get_jwt_user_and_token(request)
        if user and token:
            jti = token.get("jti")
            if jti:
                from apps.users.models import AuthenticationPolicy, UserSession

                try:
                    session = UserSession.objects.get(jti=jti, is_active=True)
                except UserSession.DoesNotExist:
                    # No tracked session — allow through
                    return self.get_response(request)

                policy = AuthenticationPolicy.load()
                idle_limit = timezone.timedelta(
                    minutes=policy.idle_session_timeout_minutes
                )
                if timezone.now() - session.last_activity > idle_limit:
                    session.is_active = False
                    session.save(update_fields=["is_active"])
                    return JsonResponse(
                        {"detail": "Session expired due to inactivity."},
                        status=401,
                    )

                # Only update last_activity for paths that indicate real user activity
                # Exclude token refresh and timeout-check endpoints
                if not any(
                    request.path.startswith(path) for path in self.EXCLUDED_PATHS
                ):
                    session.save(update_fields=["last_activity"])

        return self.get_response(request)


class ConcurrentSessionMiddleware:
    """
    Verifies that the user has not exceeded the maximum concurrent sessions.
    Enforcement primarily happens at login; this middleware acts as a guard
    for sessions that were deactivated after the token was issued.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user, token = _get_jwt_user_and_token(request)
        if user and token:
            jti = token.get("jti")
            if jti:
                from apps.users.models import UserSession

                try:
                    session = UserSession.objects.get(jti=jti)
                except UserSession.DoesNotExist:
                    return self.get_response(request)

                if not session.is_active:
                    return JsonResponse(
                        {
                            "detail": "Session terminated: concurrent session limit exceeded."
                        },
                        status=401,
                    )

        return self.get_response(request)
