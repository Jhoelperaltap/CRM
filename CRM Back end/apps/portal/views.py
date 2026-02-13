import hashlib
import secrets

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView


def _hash_reset_token(token: str) -> str:
    """
    Hash a reset token for secure storage.

    SECURITY: Reset tokens are hashed before storage to prevent
    token theft if the database is compromised.
    """
    return hashlib.sha256(token.encode()).hexdigest()


# -----------------------------------------------------------------------
# Security: Rate limiting for auth endpoints
# -----------------------------------------------------------------------


class PortalLoginThrottle(AnonRateThrottle):
    """Limit login attempts to prevent brute force attacks."""
    rate = "5/minute"


class PortalPasswordResetThrottle(AnonRateThrottle):
    """Limit password reset requests to prevent abuse."""
    rate = "3/hour"

from apps.portal.auth import (
    create_portal_tokens,
    hash_portal_password,
    verify_portal_password,
)
from apps.portal.models import (
    ClientPortalAccess,
    PortalDeviceToken,
    PortalDocumentUpload,
    PortalMessage,
    PortalNotification,
)
from apps.portal.permissions import IsContactOwner, IsPortalAuthenticated
from apps.portal.serializers import (
    PortalAppointmentSerializer,
    PortalCaseDetailSerializer,
    PortalCaseListSerializer,
    PortalContactSerializer,
    PortalDeviceTokenCreateSerializer,
    PortalDeviceTokenSerializer,
    PortalDocumentCreateSerializer,
    PortalDocumentSerializer,
    PortalDocumentUploadSerializer,
    PortalLoginSerializer,
    PortalMeSerializer,
    PortalMessageCreateSerializer,
    PortalMessageSerializer,
    PortalNotificationSerializer,
    PortalPasswordResetConfirmSerializer,
    PortalPasswordResetRequestSerializer,
)


# -----------------------------------------------------------------------
# Auth views
# -----------------------------------------------------------------------


class PortalLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PortalLoginThrottle]

    def post(self, request):
        serializer = PortalLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            portal_access = ClientPortalAccess.objects.select_related("contact").get(
                email=email, is_active=True
            )
        except ClientPortalAccess.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not verify_portal_password(portal_access, password):
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        portal_access.last_login = timezone.now()
        portal_access.save(update_fields=["last_login"])

        tokens = create_portal_tokens(portal_access)
        contact_data = PortalContactSerializer(portal_access.contact).data

        return Response(
            {
                **tokens,
                "contact": contact_data,
            }
        )


class PortalLogoutView(APIView):
    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def post(self, request):
        # Portal tokens are stateless — client discards them.
        return Response({"detail": "Logged out."})


class PortalMeView(APIView):
    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def get(self, request):
        serializer = PortalMeSerializer(request.portal_access)
        return Response(serializer.data)


class PortalPasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PortalPasswordResetThrottle]

    def post(self, request):
        serializer = PortalPasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        try:
            portal_access = ClientPortalAccess.objects.get(
                email=email, is_active=True
            )
        except ClientPortalAccess.DoesNotExist:
            # Don't reveal whether the email exists
            return Response(
                {"detail": "If the email exists, a reset link has been sent."}
            )

        # Generate a secure token
        token = secrets.token_urlsafe(48)
        # SECURITY: Hash the token before storage to prevent theft if DB is compromised
        token_hash = _hash_reset_token(token)
        portal_access.reset_token = token_hash
        portal_access.reset_token_expires_at = timezone.now() + timezone.timedelta(
            hours=24
        )
        portal_access.save(update_fields=["reset_token", "reset_token_expires_at"])

        # TODO: Send email with reset link containing the UNHASHED token
        # The token variable (not token_hash) should be sent to the user
        return Response(
            {"detail": "If the email exists, a reset link has been sent."}
        )


class PortalPasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PortalPasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        # SECURITY: Hash the incoming token to compare with stored hash
        token_hash = _hash_reset_token(token)

        try:
            portal_access = ClientPortalAccess.objects.get(
                reset_token=token_hash,
                is_active=True,
                reset_token_expires_at__gt=timezone.now(),
            )
        except ClientPortalAccess.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        portal_access.password_hash = hash_portal_password(new_password)
        portal_access.reset_token = ""
        portal_access.reset_token_expires_at = None
        portal_access.save(
            update_fields=[
                "password_hash",
                "reset_token",
                "reset_token_expires_at",
            ]
        )

        return Response({"detail": "Password has been reset."})


class PortalTokenRefreshView(APIView):
    """Refresh portal access token using a valid refresh token."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import jwt
        from apps.portal.auth import decode_portal_token

        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = decode_portal_token(refresh_token)
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if payload.get("token_type") != "refresh":
            return Response(
                {"detail": "Invalid token type."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        portal_access_id = payload.get("portal_access_id")
        try:
            portal_access = ClientPortalAccess.objects.select_related("contact").get(
                id=portal_access_id, is_active=True
            )
        except ClientPortalAccess.DoesNotExist:
            return Response(
                {"detail": "Portal access not found or inactive."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = create_portal_tokens(portal_access)
        return Response(tokens)


# -----------------------------------------------------------------------
# Portal data viewsets
# -----------------------------------------------------------------------


class PortalCaseViewSet(viewsets.ViewSet):
    """Read-only access to the client's own cases."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        from apps.cases.models import TaxCase

        qs = TaxCase.objects.filter(
            contact_id=request.portal_contact_id
        ).order_by("-created_at")

        serializer = PortalCaseListSerializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        from apps.cases.models import TaxCase

        try:
            case = TaxCase.objects.select_related("checklist").prefetch_related(
                "checklist__items"
            ).get(
                pk=pk, contact_id=request.portal_contact_id
            )
        except TaxCase.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PortalCaseDetailSerializer(case)
        return Response(serializer.data)


class PortalDocumentViewSet(viewsets.ViewSet):
    """List & upload documents for the portal client."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        from apps.documents.models import Document

        # Get regular documents associated with the contact
        regular_docs = Document.objects.filter(
            contact_id=request.portal_contact_id
        ).select_related("case").order_by("-created_at")

        # Serialize regular documents
        regular_data = PortalDocumentSerializer(regular_docs, many=True).data

        # Also get portal uploads (if any)
        portal_uploads = PortalDocumentUpload.objects.filter(
            contact_id=request.portal_contact_id
        ).select_related("document").order_by("-created_at")

        # Convert portal uploads to similar format
        portal_data = []
        for upload in portal_uploads:
            portal_data.append({
                "id": str(upload.id),
                "title": upload.document.title,
                "doc_type": upload.document.doc_type,
                "file": upload.document.file.url if upload.document.file else None,
                "file_size": upload.document.file_size,
                "mime_type": upload.document.mime_type,
                "status": upload.status,
                "case_id": str(upload.case_id) if upload.case_id else None,
                "case_number": upload.case.case_number if upload.case else None,
                "created_at": upload.created_at.isoformat(),
                "source": "portal_upload",
                "download_url": f"/api/v1/portal/documents/{upload.id}/download/",
                "view_url": f"/api/v1/portal/documents/{upload.id}/download/?inline=true",
            })

        # Combine both lists
        all_documents = list(regular_data) + portal_data

        return Response(all_documents)

    def retrieve(self, request, pk=None):
        try:
            upload = PortalDocumentUpload.objects.select_related("document").get(
                pk=pk, contact_id=request.portal_contact_id
            )
        except PortalDocumentUpload.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PortalDocumentUploadSerializer(upload)
        return Response(serializer.data)

    def create(self, request):
        serializer = PortalDocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.documents.models import Document

        uploaded_file = serializer.validated_data["file"]
        doc = Document.objects.create(
            title=serializer.validated_data["title"],
            file=uploaded_file,
            doc_type=serializer.validated_data.get("doc_type", "other"),
            status="pending",
            file_size=uploaded_file.size,
            mime_type=uploaded_file.content_type or "application/octet-stream",
            contact_id=request.portal_contact_id,
            case_id=serializer.validated_data.get("case"),
        )

        upload = PortalDocumentUpload.objects.create(
            contact_id=request.portal_contact_id,
            case_id=serializer.validated_data.get("case"),
            document=doc,
            status=PortalDocumentUpload.Status.PENDING,
        )

        return Response(
            PortalDocumentUploadSerializer(upload).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="download", permission_classes=[])
    def download(self, request, pk=None):
        """Download or view a document file.

        Query params:
            inline: If 'true', display inline (for PDF viewing) instead of download.
            token: Portal JWT token (for browser/app access without headers)
        """
        from django.http import FileResponse
        from apps.documents.models import Document
        from apps.portal.auth import decode_portal_token

        # Authenticate via header or query param token
        contact_id = None

        # Try header authentication first
        if hasattr(request, 'portal_contact_id'):
            contact_id = request.portal_contact_id
        else:
            # Try query param token
            token = request.query_params.get("token")
            if token:
                try:
                    payload = decode_portal_token(token)
                    contact_id = payload.get("contact_id")
                except Exception:
                    pass

        if not contact_id:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Try to find the document - either from portal upload or regular document
        document = None

        # First check if it's a portal upload
        try:
            upload = PortalDocumentUpload.objects.select_related("document").get(
                pk=pk, contact_id=contact_id
            )
            document = upload.document
        except PortalDocumentUpload.DoesNotExist:
            pass

        # If not found, check regular documents
        if not document:
            try:
                document = Document.objects.get(
                    pk=pk, contact_id=contact_id
                )
            except Document.DoesNotExist:
                return Response(
                    {"detail": "Document not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        if not document.file:
            return Response(
                {"detail": "No file associated with this document."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Determine content disposition
        inline_view = request.query_params.get("inline", "").lower() == "true"
        disposition = "inline" if inline_view else "attachment"

        # Get file
        try:
            file_handle = document.file.open("rb")
            response = FileResponse(
                file_handle,
                content_type=document.mime_type or "application/octet-stream",
            )
            # Use proper filename encoding for special characters
            filename = document.title.replace('"', '\\"')
            response["Content-Disposition"] = f'{disposition}; filename="{filename}"'
            response["Content-Length"] = document.file_size or document.file.size
            # Allow CORS for mobile app
            response["Access-Control-Allow-Origin"] = "*"
            return response
        except Exception:
            return Response(
                {"detail": "Error reading file."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PortalMessageViewSet(viewsets.ViewSet):
    """Messaging between portal clients and staff."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        qs = PortalMessage.objects.filter(
            contact_id=request.portal_contact_id
        ).select_related("sender_user", "contact").order_by("-created_at")

        serializer = PortalMessageSerializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            message = PortalMessage.objects.select_related(
                "sender_user", "contact"
            ).get(
                pk=pk, contact_id=request.portal_contact_id
            )
        except PortalMessage.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PortalMessageSerializer(message)
        return Response(serializer.data)

    def create(self, request):
        serializer = PortalMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = PortalMessage.objects.create(
            contact_id=request.portal_contact_id,
            case_id=serializer.validated_data.get("case"),
            message_type=PortalMessage.MessageType.CLIENT_TO_STAFF,
            subject=serializer.validated_data["subject"],
            body=serializer.validated_data["body"],
            parent_message_id=serializer.validated_data.get("parent_message"),
        )

        # Create notification for staff members
        self._notify_staff_of_client_message(message)

        return Response(
            PortalMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

    def _notify_staff_of_client_message(self, message):
        """Create notifications for staff when a client sends a message."""
        from apps.notifications.models import Notification
        from apps.users.models import User, Role
        from apps.contacts.models import Contact
        import logging

        logger = logging.getLogger(__name__)
        print(f"[NOTIFICATION DEBUG] Starting notification creation for message: {message.id}")
        print(f"[NOTIFICATION DEBUG] Message contact_id: {message.contact_id}")

        try:
            contact = Contact.objects.get(id=message.contact_id)
            print(f"[NOTIFICATION DEBUG] Found contact: {contact}")
            contact_name = f"{contact.first_name} {contact.last_name}".strip() or "Client"

            # Notify the assigned user if exists
            recipients = []
            print(f"[NOTIFICATION DEBUG] Contact assigned_to_id: {contact.assigned_to_id}")

            if contact.assigned_to_id:
                recipients.append(contact.assigned_to)
                print(f"[NOTIFICATION DEBUG] Using assigned user: {contact.assigned_to}")

            # If no assigned user, try admins
            if not recipients:
                admin_users = User.objects.filter(is_active=True, role__slug=Role.RoleSlug.ADMIN)
                print(f"[NOTIFICATION DEBUG] Admin query: {admin_users.query}")
                recipients = list(admin_users)
                print(f"[NOTIFICATION DEBUG] Found {len(recipients)} admins")

            # If still no recipients, try superusers
            if not recipients:
                recipients = list(User.objects.filter(is_active=True, is_superuser=True))
                print(f"[NOTIFICATION DEBUG] Found {len(recipients)} superusers")

            # Last resort: any active user
            if not recipients:
                recipients = list(User.objects.filter(is_active=True)[:3])
                print(f"[NOTIFICATION DEBUG] Using first {len(recipients)} active users")

            print(f"[NOTIFICATION DEBUG] Total recipients: {len(recipients)}")

            if not recipients:
                print("[NOTIFICATION DEBUG] ERROR: No recipients found!")
                return

            for recipient in recipients:
                print(f"[NOTIFICATION DEBUG] Creating notification for: {recipient.email}")
                notif = Notification.objects.create(
                    recipient=recipient,
                    notification_type=Notification.Type.CLIENT_MESSAGE,
                    title=f"New message from {contact_name}",
                    message=f"Subject: {message.subject}\n\n{message.body[:200]}{'...' if len(message.body) > 200 else ''}",
                    severity=Notification.Severity.INFO,
                    related_object_type="contact",
                    related_object_id=contact.id,
                    action_url=f"/contacts/{contact.id}?tab=client-messages",
                )
                print(f"[NOTIFICATION DEBUG] Created notification ID: {notif.id}")

        except Exception as e:
            print(f"[NOTIFICATION DEBUG] EXCEPTION: {e}")
            import traceback
            traceback.print_exc()
            logger.error(f"Failed to create staff notification for client message: {e}", exc_info=True)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        try:
            message = PortalMessage.objects.get(
                pk=pk, contact_id=request.portal_contact_id
            )
        except PortalMessage.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response({"detail": "Marked as read."})


class PortalAppointmentViewSet(viewsets.ViewSet):
    """Read-only access to the client's appointments."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        from apps.appointments.models import Appointment

        qs = Appointment.objects.filter(
            contact_id=request.portal_contact_id
        ).select_related("assigned_to").order_by("-start_datetime")

        serializer = PortalAppointmentSerializer(qs, many=True)
        return Response(serializer.data)


# -----------------------------------------------------------------------
# Push notifications
# -----------------------------------------------------------------------


class PortalDeviceRegisterView(APIView):
    """Register a device for push notifications."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def post(self, request):
        serializer = PortalDeviceTokenCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        platform = serializer.validated_data["platform"]

        # Update or create the device token
        device, created = PortalDeviceToken.objects.update_or_create(
            token=token,
            defaults={
                "contact_id": request.portal_contact_id,
                "platform": platform,
                "is_active": True,
                "last_used_at": timezone.now(),
            },
        )

        return Response(
            PortalDeviceTokenSerializer(device).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        """Unregister a device (deactivate notifications)."""
        token = request.data.get("token")
        if not token:
            return Response(
                {"detail": "Token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = PortalDeviceToken.objects.get(
                token=token,
                contact_id=request.portal_contact_id,
            )
            device.is_active = False
            device.save(update_fields=["is_active", "updated_at"])
            return Response({"detail": "Device unregistered."})
        except PortalDeviceToken.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


class PortalNotificationViewSet(viewsets.ViewSet):
    """Notifications for portal clients (mobile app)."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        """List all notifications for the portal client."""
        qs = PortalNotification.objects.filter(
            contact_id=request.portal_contact_id
        ).select_related(
            "related_message", "related_case", "related_appointment"
        ).order_by("-created_at")

        serializer = PortalNotificationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = PortalNotification.objects.filter(
            contact_id=request.portal_contact_id,
            is_read=False,
        ).count()
        return Response({"count": count})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        try:
            notification = PortalNotification.objects.get(
                pk=pk, contact_id=request.portal_contact_id
            )
        except PortalNotification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"detail": "Marked as read."})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        PortalNotification.objects.filter(
            contact_id=request.portal_contact_id,
            is_read=False,
        ).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})
