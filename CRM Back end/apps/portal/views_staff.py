from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.portal.filters_staff import PortalDocumentUploadFilter, PortalMessageFilter
from apps.portal.models import ClientPortalAccess, PortalDocumentUpload, PortalMessage
from apps.portal.serializers_staff import (
    StaffDocumentReviewActionSerializer,
    StaffDocumentReviewListSerializer,
    StaffPortalAccessCreateSerializer,
    StaffPortalAccessDetailSerializer,
    StaffPortalAccessListSerializer,
    StaffPortalMessageListSerializer,
    StaffPortalMessageReplySerializer,
)
from apps.users.permissions import IsAdminRole


class StaffPortalAccessViewSet(viewsets.ModelViewSet):
    """Manage client portal access records (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = ClientPortalAccess.objects.select_related("contact").all()
    search_fields = ["email", "contact__first_name", "contact__last_name"]
    filterset_fields = ["contact", "is_active"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return StaffPortalAccessCreateSerializer
        if self.action == "retrieve":
            return StaffPortalAccessDetailSerializer
        return StaffPortalAccessListSerializer

    def create(self, request, *args, **kwargs):
        serializer = StaffPortalAccessCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access = serializer.save()
        return Response(
            {
                **StaffPortalAccessDetailSerializer(access).data,
                "temp_password": access._temp_password,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = StaffPortalAccessDetailSerializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)


class StaffDocumentReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """Review portal document uploads (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = StaffDocumentReviewListSerializer
    queryset = PortalDocumentUpload.objects.select_related(
        "contact", "document", "case", "reviewed_by"
    ).all()
    filterset_class = PortalDocumentUploadFilter
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        upload = self.get_object()
        upload.status = PortalDocumentUpload.Status.APPROVED
        upload.reviewed_by = request.user
        upload.reviewed_at = timezone.now()
        upload.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        return Response(StaffDocumentReviewListSerializer(upload).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        serializer = StaffDocumentReviewActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = self.get_object()
        upload.status = PortalDocumentUpload.Status.REJECTED
        upload.reviewed_by = request.user
        upload.reviewed_at = timezone.now()
        upload.rejection_reason = serializer.validated_data.get("rejection_reason", "")
        upload.save(
            update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"]
        )
        return Response(StaffDocumentReviewListSerializer(upload).data)


class StaffPortalMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """View and reply to portal messages (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = StaffPortalMessageListSerializer
    queryset = PortalMessage.objects.select_related(
        "contact", "sender_user", "case", "parent_message"
    ).all()
    filterset_class = PortalMessageFilter
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        parent = self.get_object()
        serializer = StaffPortalMessageReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subject = serializer.validated_data.get("subject") or f"Re: {parent.subject}"
        reply_msg = PortalMessage.objects.create(
            contact=parent.contact,
            case=parent.case,
            message_type=PortalMessage.MessageType.STAFF_TO_CLIENT,
            subject=subject,
            body=serializer.validated_data["body"],
            sender_user=request.user,
            parent_message=parent,
        )
        return Response(
            StaffPortalMessageListSerializer(reply_msg).data,
            status=status.HTTP_201_CREATED,
        )
