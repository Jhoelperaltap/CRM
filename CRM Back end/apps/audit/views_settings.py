from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.filters_settings import (
    EncryptedFieldAccessLogFilter,
    LoginHistoryFilter,
    SettingsLogFilter,
)
from apps.audit.models import EncryptedFieldAccessLog, LoginHistory, SettingsLog
from apps.audit.serializers_settings import (
    EncryptedFieldAccessLogSerializer,
    LoginHistorySerializer,
    SettingsLogSerializer,
)
from apps.users.permissions import IsAdminRole


class LoginHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to login history.  Admin only."""

    queryset = LoginHistory.objects.select_related("user").all()
    serializer_class = LoginHistorySerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = LoginHistoryFilter
    ordering_fields = ["timestamp", "status"]
    ordering = ["-timestamp"]


class SettingsLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to settings change log.  Admin only."""

    queryset = SettingsLog.objects.select_related("user").all()
    serializer_class = SettingsLogSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = SettingsLogFilter
    ordering_fields = ["timestamp", "setting_area"]
    ordering = ["-timestamp"]


class EncryptedFieldAccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to PII field access log.  Admin only."""

    queryset = EncryptedFieldAccessLog.objects.select_related("user").all()
    serializer_class = EncryptedFieldAccessLogSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = EncryptedFieldAccessLogFilter
    ordering_fields = ["timestamp", "module"]
    ordering = ["-timestamp"]
