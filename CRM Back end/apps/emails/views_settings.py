from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.emails.filters import EmailSyncLogFilter
from apps.emails.models import EmailAccount, EmailSettings, EmailSyncLog
from apps.emails.serializers_settings import (
    EmailAccountSerializer,
    EmailSettingsSerializer,
    EmailSyncLogSerializer,
)
from apps.emails.tasks import sync_email_account
from apps.users.permissions import IsAdminRole


class EmailAccountViewSet(viewsets.ModelViewSet):
    """Admin CRUD for email accounts (IMAP/SMTP settings)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = EmailAccountSerializer
    search_fields = ["name", "email_address"]
    ordering = ["name"]

    def get_queryset(self):
        return EmailAccount.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="test-connection")
    def test_connection(self, request, pk=None):
        """Test IMAP connection for the account."""
        account = self.get_object()
        from apps.emails.imap_client import IMAPClient
        try:
            with IMAPClient(
                host=account.imap_host,
                port=account.imap_port,
                use_ssl=account.imap_use_ssl,
                username=account.username,
                password=account.password,
            ):
                pass
            return Response({"status": "ok", "message": "Connection successful."})
        except Exception as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=400,
            )

    @action(detail=True, methods=["post"], url_path="sync-now")
    def sync_now(self, request, pk=None):
        """Trigger an immediate sync for this account."""
        account = self.get_object()
        sync_email_account.delay(str(account.id))
        return Response({"status": "ok", "message": "Sync task dispatched."})


class EmailSettingsView(APIView):
    """GET / PUT the global email settings singleton."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        settings = EmailSettings.load()
        return Response(EmailSettingsSerializer(settings).data)

    def put(self, request):
        settings = EmailSettings.load()
        serializer = EmailSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def post(self, request):
        """Reset to defaults."""
        settings = EmailSettings.load()
        for field in settings._meta.fields:
            if field.name in ("id", "created_at", "updated_at"):
                continue
            if hasattr(field, "default") and field.default is not None:
                default = field.default
                if callable(default):
                    default = default()
                setattr(settings, field.name, default)
        settings.save()
        return Response(EmailSettingsSerializer(settings).data)


class EmailSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of email sync logs (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = EmailSyncLogSerializer
    filterset_class = EmailSyncLogFilter
    ordering = ["-started_at"]

    def get_queryset(self):
        return EmailSyncLog.objects.select_related("account").all()
