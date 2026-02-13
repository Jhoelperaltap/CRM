from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.serializers import (
    NotificationPreferenceSerializer,
    NotificationSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and manage the authenticated user's notifications.

    Supports filtering by ``is_read`` and ``notification_type``.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)

        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() in ("true", "1"))

        notification_type = self.request.query_params.get("notification_type")
        if notification_type:
            qs = qs.filter(notification_type=notification_type)

        return qs

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all of the user's unread notifications as read."""
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"updated": count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Return the number of unread notifications for the bell badge."""
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"count": count})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """Manage per-type notification delivery preferences for the current user."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationPreferenceSerializer
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get", "put"], url_path="bulk")
    def bulk(self, request):
        """
        GET  — list all preferences (auto-create defaults).
        PUT  — bulk-update preferences.
        """
        if request.method == "GET":
            self._ensure_defaults(request.user)
            prefs = NotificationPreference.objects.filter(user=request.user)
            return Response(NotificationPreferenceSerializer(prefs, many=True).data)

        # PUT — expect list of {notification_type, in_app_enabled, email_enabled}
        for item in request.data:
            NotificationPreference.objects.update_or_create(
                user=request.user,
                notification_type=item["notification_type"],
                defaults={
                    "in_app_enabled": item.get("in_app_enabled", True),
                    "email_enabled": item.get("email_enabled", False),
                },
            )
        prefs = NotificationPreference.objects.filter(user=request.user)
        return Response(NotificationPreferenceSerializer(prefs, many=True).data)

    @staticmethod
    def _ensure_defaults(user):
        """Create default preference rows for any missing notification types."""
        existing = set(
            NotificationPreference.objects.filter(user=user).values_list(
                "notification_type", flat=True
            )
        )
        to_create = []
        for choice_value, _ in Notification.Type.choices:
            if choice_value not in existing:
                to_create.append(
                    NotificationPreference(
                        user=user,
                        notification_type=choice_value,
                        in_app_enabled=True,
                        email_enabled=False,
                    )
                )
        if to_create:
            NotificationPreference.objects.bulk_create(to_create)
