from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.filters import AuditLogFilter
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogListSerializer
from apps.users.permissions import IsAdminRole


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for audit logs. Admin only."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = AuditLogListSerializer
    filterset_class = AuditLogFilter
    search_fields = ["object_repr", "module"]
    ordering_fields = ["timestamp", "action", "module"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        return AuditLog.objects.select_related("user").all()
