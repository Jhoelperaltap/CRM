from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.portal.filters_staff import PortalDocumentUploadFilter, PortalMessageFilter
from apps.portal.models import (
    BillingPortalAccess,
    ClientPortalAccess,
    PortalDocumentUpload,
    PortalMessage,
)
from apps.portal.serializers_staff import (
    StaffBillingAccessCreateSerializer,
    StaffBillingAccessListSerializer,
    StaffBillingAccessSerializer,
    StaffBillingAccessUpdateSerializer,
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

    def retrieve(self, request, *args, **kwargs):
        """Get portal access with billing info."""
        instance = self.get_object()
        data = StaffPortalAccessDetailSerializer(instance).data

        # Include billing access info if exists
        try:
            billing_access = BillingPortalAccess.objects.select_related("tenant").get(
                portal_access=instance
            )
            data["billing_access"] = StaffBillingAccessSerializer(billing_access).data
        except BillingPortalAccess.DoesNotExist:
            data["billing_access"] = None

        return Response(data)

    @action(detail=True, methods=["post"], url_path="enable-billing")
    def enable_billing(self, request, pk=None):
        """
        Enable billing access for this portal account.

        Request body:
        - tenant: UUID of the corporation (required)
        - can_manage_products: bool (default: true)
        - can_manage_services: bool (default: true)
        - can_create_invoices: bool (default: true)
        - can_create_quotes: bool (default: true)
        - can_view_reports: bool (default: true)
        """
        portal_access = self.get_object()

        # Check if already has billing access
        if BillingPortalAccess.objects.filter(portal_access=portal_access).exists():
            return Response(
                {"detail": "This portal account already has billing access."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate tenant
        tenant_id = request.data.get("tenant")
        if not tenant_id:
            return Response(
                {"tenant": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.corporations.models import Corporation

        try:
            tenant = Corporation.objects.get(pk=tenant_id)
        except Corporation.DoesNotExist:
            return Response(
                {"tenant": "Corporation not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify contact belongs to corporation
        if portal_access.contact.corporation_id != tenant.id:
            return Response(
                {"tenant": "The contact must belong to this corporation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create billing access
        billing_access = BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=tenant,
            can_manage_products=request.data.get("can_manage_products", True),
            can_manage_services=request.data.get("can_manage_services", True),
            can_create_invoices=request.data.get("can_create_invoices", True),
            can_create_quotes=request.data.get("can_create_quotes", True),
            can_view_reports=request.data.get("can_view_reports", True),
        )

        return Response(
            StaffBillingAccessSerializer(billing_access).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="disable-billing")
    def disable_billing(self, request, pk=None):
        """Disable (deactivate) billing access for this portal account."""
        portal_access = self.get_object()

        try:
            billing_access = BillingPortalAccess.objects.get(portal_access=portal_access)
            billing_access.is_active = False
            billing_access.save(update_fields=["is_active", "updated_at"])
            return Response(StaffBillingAccessSerializer(billing_access).data)
        except BillingPortalAccess.DoesNotExist:
            return Response(
                {"detail": "No billing access found for this portal account."},
                status=status.HTTP_404_NOT_FOUND,
            )


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


class StaffBillingAccessViewSet(viewsets.ModelViewSet):
    """
    Manage billing portal access for client accounts (admin only).

    Endpoints:
    - GET /api/v1/settings/portal-staff/billing-access/
      List all billing accesses
    - POST /api/v1/settings/portal-staff/billing-access/
      Enable billing for a portal account
    - GET /api/v1/settings/portal-staff/billing-access/{id}/
      Get billing access details
    - PATCH /api/v1/settings/portal-staff/billing-access/{id}/
      Update billing permissions
    - DELETE /api/v1/settings/portal-staff/billing-access/{id}/
      Revoke billing access
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = BillingPortalAccess.objects.select_related(
        "portal_access", "portal_access__contact", "tenant"
    ).all()
    filterset_fields = ["portal_access", "tenant", "is_active"]
    search_fields = [
        "portal_access__email",
        "portal_access__contact__first_name",
        "portal_access__contact__last_name",
        "tenant__name",
    ]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return StaffBillingAccessCreateSerializer
        if self.action == "list":
            return StaffBillingAccessListSerializer
        if self.action in ("update", "partial_update"):
            return StaffBillingAccessUpdateSerializer
        return StaffBillingAccessSerializer

    def create(self, request, *args, **kwargs):
        serializer = StaffBillingAccessCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        billing_access = serializer.save()
        return Response(
            StaffBillingAccessSerializer(billing_access).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="by-portal-access/(?P<portal_access_id>[^/.]+)")
    def by_portal_access(self, request, portal_access_id=None):
        """Get billing access for a specific portal account."""
        try:
            billing_access = BillingPortalAccess.objects.select_related(
                "portal_access", "portal_access__contact", "tenant"
            ).get(portal_access_id=portal_access_id)
            return Response(StaffBillingAccessSerializer(billing_access).data)
        except BillingPortalAccess.DoesNotExist:
            return Response(
                {"detail": "No billing access found for this portal account."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"], url_path="by-tenant/(?P<tenant_id>[^/.]+)")
    def by_tenant(self, request, tenant_id=None):
        """List all billing accesses for a specific tenant/corporation."""
        accesses = BillingPortalAccess.objects.filter(
            tenant_id=tenant_id
        ).select_related("portal_access", "portal_access__contact", "tenant")
        serializer = StaffBillingAccessListSerializer(accesses, many=True)
        return Response(serializer.data)
