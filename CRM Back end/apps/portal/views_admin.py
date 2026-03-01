"""
Views for Portal Administration.

Only accessible by Admin role users.
"""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contacts.models import Contact
from apps.portal.models import ClientPortalAccess
from apps.portal.models_admin import (
    PortalAdminLog,
    PortalClientConfig,
    PortalImpersonationToken,
    PortalModulePreset,
    PortalSession,
)
from apps.portal.serializers_admin import (
    ImpersonationStartSerializer,
    PortalAdminLogSerializer,
    PortalAdminStatsSerializer,
    PortalClientConfigSerializer,
    PortalClientConfigUpdateSerializer,
    PortalClientDetailSerializer,
    PortalClientListSerializer,
    PortalModulePresetCreateSerializer,
    PortalModulePresetSerializer,
    PortalSessionSerializer,
)
from apps.portal.tasks import send_impersonation_notification_email


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_admin_action(admin_user, contact, action, details=None, ip_address=None):
    """Create an admin audit log entry."""
    PortalAdminLog.objects.create(
        admin_user=admin_user,
        contact=contact,
        action=action,
        details=details or {},
        ip_address=ip_address,
    )


class IsAdminUser:
    """Permission class to check if user is Admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusers always have access
        if request.user.is_superuser:
            return True
        # Check if user has Admin role (by name or slug)
        if hasattr(request.user, "role") and request.user.role:
            role = request.user.role
            return role.slug == "admin" or role.name in ("Admin", "Administrator")
        return False


# -----------------------------------------------------------------------
# Module Presets
# -----------------------------------------------------------------------


class PortalModulePresetViewSet(viewsets.ModelViewSet):
    """CRUD operations for module presets."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = None  # Presets are a small list, no pagination needed
    queryset = PortalModulePreset.objects.all()

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return PortalModulePresetCreateSerializer
        return PortalModulePresetSerializer

    def destroy(self, request, *args, **kwargs):
        preset = self.get_object()
        if preset.is_system:
            return Response(
                {"detail": "Cannot delete system presets."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


# -----------------------------------------------------------------------
# Portal Clients
# -----------------------------------------------------------------------


class PortalClientViewSet(viewsets.ViewSet):
    """Manage portal clients."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request):
        """List all contacts that have or can have portal access."""
        queryset = Contact.objects.select_related(
            "portal_access",
            "portal_config",
            "portal_config__preset",
        ).prefetch_related("portal_sessions")

        # Filters
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        has_access = request.query_params.get("has_access")
        if has_access == "true":
            queryset = queryset.filter(portal_access__isnull=False)
        elif has_access == "false":
            queryset = queryset.filter(portal_access__isnull=True)

        is_active = request.query_params.get("is_active")
        if is_active == "true":
            queryset = queryset.filter(portal_config__is_portal_active=True)
        elif is_active == "false":
            queryset = queryset.filter(
                Q(portal_config__is_portal_active=False) | Q(portal_config__isnull=True)
            )

        # Pagination
        page_size = int(request.query_params.get("page_size", 20))
        page = int(request.query_params.get("page", 1))
        offset = (page - 1) * page_size

        total = queryset.count()
        clients = queryset.order_by("-created_at")[offset : offset + page_size]

        serializer = PortalClientListSerializer(clients, many=True)
        return Response(
            {
                "results": serializer.data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }
        )

    def retrieve(self, request, pk=None):
        """Get detailed info for a single client."""
        try:
            contact = Contact.objects.select_related(
                "portal_access",
                "portal_config",
                "portal_config__preset",
            ).prefetch_related("portal_sessions").get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Log the view action
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.VIEW_CLIENT,
            ip_address=get_client_ip(request),
        )

        serializer = PortalClientDetailSerializer(contact)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "put", "patch"])
    def config(self, request, pk=None):
        """Get or update client portal configuration."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Get or create config
        config, created = PortalClientConfig.objects.get_or_create(contact=contact)

        if request.method == "GET":
            serializer = PortalClientConfigSerializer(config)
            return Response(serializer.data)

        # Update config
        serializer = PortalClientConfigUpdateSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Track what changed
        old_values = {
            field: getattr(config, field)
            for field in serializer.validated_data.keys()
        }

        serializer.save()

        # Log the update
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.UPDATE_CONFIG,
            details={
                "old_values": {k: str(v) for k, v in old_values.items()},
                "new_values": {k: str(v) for k, v in serializer.validated_data.items()},
            },
            ip_address=get_client_ip(request),
        )

        return Response(PortalClientConfigSerializer(config).data)

    @action(detail=True, methods=["post"], url_path="apply-preset")
    def apply_preset(self, request, pk=None):
        """Apply a module preset to a client."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        preset_id = request.data.get("preset_id")
        if not preset_id:
            return Response(
                {"detail": "preset_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            preset = PortalModulePreset.objects.get(pk=preset_id)
        except PortalModulePreset.DoesNotExist:
            return Response(
                {"detail": "Preset not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get or create config
        config, _ = PortalClientConfig.objects.get_or_create(contact=contact)
        config.apply_preset(preset)

        # Log the action
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.APPLY_PRESET,
            details={"preset_name": preset.name, "preset_id": str(preset.id)},
            ip_address=get_client_ip(request),
        )

        return Response(PortalClientConfigSerializer(config).data)

    @action(detail=True, methods=["post"], url_path="toggle-access")
    def toggle_access(self, request, pk=None):
        """Enable or disable portal access for a client."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        config, _ = PortalClientConfig.objects.get_or_create(contact=contact)

        # Toggle or set specific value
        new_value = request.data.get("is_active")
        if new_value is None:
            new_value = not config.is_portal_active
        else:
            new_value = bool(new_value)

        old_value = config.is_portal_active
        config.is_portal_active = new_value
        config.save(update_fields=["is_portal_active", "updated_at"])

        # Log the action
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.TOGGLE_ACCESS,
            details={"old_value": old_value, "new_value": new_value},
            ip_address=get_client_ip(request),
        )

        return Response({
            "is_portal_active": config.is_portal_active,
            "message": f"Portal access {'enabled' if new_value else 'disabled'}",
        })

    @action(detail=True, methods=["get"])
    def sessions(self, request, pk=None):
        """Get active sessions for a client."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        sessions = PortalSession.objects.filter(contact=contact).order_by("-last_activity")[:20]
        serializer = PortalSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="force-logout")
    def force_logout(self, request, pk=None):
        """Force logout all active sessions for a client."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # End all active sessions
        count = PortalSession.objects.filter(
            contact=contact,
            is_active=True,
        ).update(
            is_active=False,
            logged_out_at=timezone.now(),
        )

        # Log the action
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.FORCE_LOGOUT,
            details={"sessions_ended": count},
            ip_address=get_client_ip(request),
        )

        return Response({
            "message": f"Logged out {count} active session(s)",
            "sessions_ended": count,
        })

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Reset portal password for a client (sends reset email)."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not hasattr(contact, "portal_access") or not contact.portal_access:
            return Response(
                {"detail": "Client does not have portal access"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate reset token
        import secrets
        from datetime import timedelta

        portal_access = contact.portal_access
        portal_access.reset_token = secrets.token_urlsafe(32)
        portal_access.reset_token_expires_at = timezone.now() + timedelta(hours=24)
        portal_access.save(update_fields=["reset_token", "reset_token_expires_at", "updated_at"])

        # TODO: Send reset email
        # send_password_reset_email.delay(contact.id)

        # Log the action
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.RESET_PASSWORD,
            ip_address=get_client_ip(request),
        )

        return Response({
            "message": "Password reset initiated. Email will be sent to client.",
        })

    @action(detail=True, methods=["post"])
    def impersonate(self, request, pk=None):
        """Start impersonating a client."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not hasattr(contact, "portal_access") or not contact.portal_access:
            return Response(
                {"detail": "Client does not have portal access"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if portal is active
        config = getattr(contact, "portal_config", None)
        if not config or not config.is_portal_active:
            return Response(
                {"detail": "Client portal access is not active"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create impersonation token
        token = PortalImpersonationToken.create_for_admin(
            admin_user=request.user,
            contact=contact,
            ip_address=get_client_ip(request),
        )

        # Log the action
        log_admin_action(
            request.user,
            contact,
            PortalAdminLog.Action.IMPERSONATE_START,
            details={"token_id": str(token.id)},
            ip_address=get_client_ip(request),
        )

        # Send notification email to client (async)
        try:
            send_impersonation_notification_email.delay(
                contact_id=str(contact.id),
                admin_name=f"{request.user.first_name} {request.user.last_name}".strip(),
                admin_email=request.user.email,
            )
        except Exception:
            # Don't fail if email task fails
            pass

        # Build portal URL with impersonation token
        portal_base_url = request.build_absolute_uri("/portal/")
        portal_url = f"{portal_base_url}?impersonate={token.token}"

        return Response(
            ImpersonationStartSerializer(
                {
                    "token": token.token,
                    "expires_at": token.expires_at,
                    "remaining_minutes": token.get_remaining_minutes(),
                    "contact_id": contact.id,
                    "contact_name": f"{contact.first_name} {contact.last_name}".strip(),
                    "portal_url": portal_url,
                }
            ).data
        )

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        """Get admin logs for a client."""
        try:
            contact = Contact.objects.get(pk=pk)
        except Contact.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        logs = PortalAdminLog.objects.filter(contact=contact).select_related(
            "admin_user"
        ).order_by("-created_at")[:50]

        serializer = PortalAdminLogSerializer(logs, many=True)
        return Response(serializer.data)


# -----------------------------------------------------------------------
# Impersonation Management
# -----------------------------------------------------------------------


class ImpersonationView(APIView):
    """Manage impersonation sessions."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get current impersonation status for the admin."""
        token = PortalImpersonationToken.objects.filter(
            admin_user=request.user,
            is_active=True,
        ).select_related("contact").first()

        if not token or not token.is_valid:
            return Response({"is_impersonating": False})

        return Response({
            "is_impersonating": True,
            "token": token.token,
            "contact_id": str(token.contact.id),
            "contact_name": f"{token.contact.first_name} {token.contact.last_name}".strip(),
            "expires_at": token.expires_at,
            "remaining_minutes": token.get_remaining_minutes(),
        })

    def delete(self, request):
        """End current impersonation session."""
        token = PortalImpersonationToken.objects.filter(
            admin_user=request.user,
            is_active=True,
        ).first()

        if not token:
            return Response(
                {"detail": "No active impersonation session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Log the end
        log_admin_action(
            request.user,
            token.contact,
            PortalAdminLog.Action.IMPERSONATE_END,
            details={"token_id": str(token.id)},
            ip_address=get_client_ip(request),
        )

        token.end_impersonation()

        return Response({"message": "Impersonation session ended"})


# -----------------------------------------------------------------------
# Audit Logs
# -----------------------------------------------------------------------


class PortalAdminLogsView(APIView):
    """View all portal administration audit logs."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """
        Get all admin audit logs with filtering and pagination.

        Query params:
        - action: Filter by action type (impersonate_start, toggle_access, etc.)
        - admin: Filter by admin user ID
        - contact: Filter by contact ID
        - search: Search in contact or admin name
        - start_date: Filter logs after this date (YYYY-MM-DD)
        - end_date: Filter logs before this date (YYYY-MM-DD)
        - page: Page number (default: 1)
        - page_size: Items per page (default: 50, max: 100)
        """
        queryset = PortalAdminLog.objects.select_related(
            "admin_user", "contact"
        ).order_by("-created_at")

        # Filter by action
        action = request.query_params.get("action")
        if action:
            queryset = queryset.filter(action=action)

        # Filter by admin
        admin_id = request.query_params.get("admin")
        if admin_id:
            queryset = queryset.filter(admin_user_id=admin_id)

        # Filter by contact
        contact_id = request.query_params.get("contact")
        if contact_id:
            queryset = queryset.filter(contact_id=contact_id)

        # Search
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(contact__first_name__icontains=search)
                | Q(contact__last_name__icontains=search)
                | Q(admin_user__first_name__icontains=search)
                | Q(admin_user__last_name__icontains=search)
                | Q(admin_user__email__icontains=search)
            )

        # Date filters
        from datetime import datetime

        start_date = request.query_params.get("start_date")
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                queryset = queryset.filter(created_at__date__gte=start)
            except ValueError:
                pass

        end_date = request.query_params.get("end_date")
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d")
                queryset = queryset.filter(created_at__date__lte=end)
            except ValueError:
                pass

        # Pagination
        page_size = min(int(request.query_params.get("page_size", 50)), 100)
        page = int(request.query_params.get("page", 1))
        offset = (page - 1) * page_size

        total = queryset.count()
        logs = queryset[offset : offset + page_size]

        serializer = PortalAdminLogSerializer(logs, many=True)

        # Get available actions for filter
        actions = [
            {"value": action[0], "label": action[1]}
            for action in PortalAdminLog.Action.choices
        ]

        return Response(
            {
                "results": serializer.data,
                "count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size,
                "actions": actions,
            }
        )


# -----------------------------------------------------------------------
# Statistics
# -----------------------------------------------------------------------


class PortalAdminStatsView(APIView):
    """Get portal administration statistics."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get overall portal statistics."""
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        fifteen_minutes_ago = now - timedelta(minutes=15)

        # Total contacts
        total_clients = Contact.objects.count()

        # Contacts with portal access
        clients_with_access = ClientPortalAccess.objects.filter(is_active=True).count()

        # Active portal configs
        active_clients = PortalClientConfig.objects.filter(is_portal_active=True).count()

        # Online now (active session in last 15 minutes)
        online_now = PortalSession.objects.filter(
            is_active=True,
            last_activity__gte=fifteen_minutes_ago,
        ).values("contact_id").distinct().count()

        # Inactive (no activity in 30 days)
        inactive_30_days = PortalClientConfig.objects.filter(
            Q(last_activity__lt=thirty_days_ago) | Q(last_activity__isnull=True)
        ).count()

        return Response(
            PortalAdminStatsSerializer(
                {
                    "total_clients": total_clients,
                    "clients_with_access": clients_with_access,
                    "active_clients": active_clients,
                    "online_now": online_now,
                    "inactive_30_days": inactive_30_days,
                }
            ).data
        )
