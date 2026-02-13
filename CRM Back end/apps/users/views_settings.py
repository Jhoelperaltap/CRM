from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.utils import log_settings_change
from apps.users.models import (
    AuthenticationPolicy,
    BlockedIP,
    BlockedIPLog,
    LoginIPWhitelist,
    SharingRule,
    User,
    UserGroup,
    UserGroupMembership,
)
from apps.users.permissions import IsAdminRole
from apps.users.serializers_settings import (
    AuthenticationPolicySerializer,
    BlockedIPCreateUpdateSerializer,
    BlockedIPDetailSerializer,
    BlockedIPListSerializer,
    BlockedIPLogSerializer,
    LoginIPWhitelistSerializer,
    SharingRuleSerializer,
    UserGroupDetailSerializer,
    UserGroupMemberSerializer,
    UserGroupSerializer,
)


# ---------------------------------------------------------------------------
# User Groups
# ---------------------------------------------------------------------------
class UserGroupViewSet(viewsets.ModelViewSet):
    """CRUD for user groups.  Admin only."""

    queryset = UserGroup.objects.prefetch_related("memberships").all()
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return UserGroupDetailSerializer
        return UserGroupSerializer

    @action(detail=True, methods=["post"], url_path="members")
    def add_member(self, request, pk=None):
        """Add a user to the group."""
        group = self.get_object()
        serializer = UserGroupMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data["user_id"]

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        _, created = UserGroupMembership.objects.get_or_create(
            group=group, user=user
        )
        if not created:
            return Response(
                {"detail": "User is already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": "Member added."},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a user from the group."""
        group = self.get_object()
        deleted, _ = UserGroupMembership.objects.filter(
            group=group, user_id=user_id
        ).delete()
        if not deleted:
            return Response(
                {"detail": "Membership not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Sharing Rules
# ---------------------------------------------------------------------------
class SharingRuleViewSet(viewsets.ModelViewSet):
    """CRUD for sharing rules.  Admin only."""

    queryset = SharingRule.objects.select_related(
        "shared_from_role",
        "shared_to_role",
        "shared_from_group",
        "shared_to_group",
    ).all()
    serializer_class = SharingRuleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


# ---------------------------------------------------------------------------
# Authentication Policy (singleton GET / PATCH)
# ---------------------------------------------------------------------------
class AuthenticationPolicyView(APIView):
    """
    GET   -> returns the current authentication policy
    PATCH -> updates the policy and logs changes
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        policy = AuthenticationPolicy.load()
        serializer = AuthenticationPolicySerializer(policy)
        return Response(serializer.data)

    def patch(self, request):
        policy = AuthenticationPolicy.load()
        old_data = AuthenticationPolicySerializer(policy).data

        serializer = AuthenticationPolicySerializer(
            policy, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Log each changed field
        new_data = serializer.data
        for key in new_data:
            if key in ("id", "updated_at"):
                continue
            if old_data.get(key) != new_data.get(key):
                log_settings_change(
                    user=request.user,
                    setting_area="authentication_policy",
                    setting_key=key,
                    old_value=old_data.get(key),
                    new_value=new_data.get(key),
                )

        return Response(serializer.data)


class SessionTimeoutView(APIView):
    """
    GET -> returns only the idle session timeout setting.
    Accessible by any authenticated user (no admin required).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        policy = AuthenticationPolicy.load()
        return Response({
            "idle_session_timeout_minutes": policy.idle_session_timeout_minutes,
        })


# ---------------------------------------------------------------------------
# Login IP Whitelist
# ---------------------------------------------------------------------------
class LoginIPWhitelistViewSet(viewsets.ModelViewSet):
    """CRUD for IP whitelist entries.  Admin only."""

    queryset = LoginIPWhitelist.objects.select_related("role", "user").all()
    serializer_class = LoginIPWhitelistSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


# ---------------------------------------------------------------------------
# Blocked IPs
# ---------------------------------------------------------------------------
class BlockedIPViewSet(viewsets.ModelViewSet):
    """CRUD for blocked IP addresses.  Admin only."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return (
            BlockedIP.objects.select_related("created_by")
            .annotate(log_count=Count("logs"))
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BlockedIPDetailSerializer
        if self.action in ("create", "update", "partial_update"):
            return BlockedIPCreateUpdateSerializer
        return BlockedIPListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"], url_path="logs")
    def logs(self, request, pk=None):
        """Get all logs for a blocked IP."""
        blocked_ip = self.get_object()
        logs = blocked_ip.logs.all()[:100]  # Limit to 100 most recent
        serializer = BlockedIPLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="clear-logs")
    def clear_logs(self, request, pk=None):
        """Clear all logs for a blocked IP."""
        blocked_ip = self.get_object()
        count, _ = blocked_ip.logs.all().delete()
        blocked_ip.blocked_webform_requests = 0
        blocked_ip.save(update_fields=["blocked_webform_requests", "updated_at"])
        return Response({"detail": f"Cleared {count} logs."})


class BlockedIPLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to all blocked IP logs.  Admin only."""

    queryset = BlockedIPLog.objects.select_related("blocked_ip").order_by("-timestamp")
    serializer_class = BlockedIPLogSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_fields = ["blocked_ip", "request_type"]
