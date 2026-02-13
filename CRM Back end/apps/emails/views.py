import mimetypes
import uuid

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.emails.filters import EmailMessageFilter, EmailThreadFilter
from apps.emails.models import (
    EmailAttachment,
    EmailMessage,
    EmailTemplate,
    EmailThread,
)
from apps.emails.serializers import (
    ComposeEmailSerializer,
    EmailMessageDetailSerializer,
    EmailMessageListSerializer,
    EmailTemplateRenderSerializer,
    EmailTemplateSerializer,
    EmailThreadDetailSerializer,
    EmailThreadListSerializer,
)
from apps.emails.tasks import send_email_task
from apps.users.permissions import ModulePermission


class EmailMessageViewSet(viewsets.ModelViewSet):
    """Inbox / message CRUD + compose, reply, assign, link."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "emails"
    filterset_class = EmailMessageFilter
    search_fields = ["subject", "from_address", "body_text"]
    ordering_fields = ["sent_at", "created_at", "subject"]
    ordering = ["-sent_at"]

    def get_queryset(self):
        return (
            EmailMessage.objects.select_related(
                "account", "thread", "contact", "case", "assigned_to", "sent_by"
            )
            .prefetch_related("attachments")
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return EmailMessageListSerializer
        if self.action == "compose":
            return ComposeEmailSerializer
        return EmailMessageDetailSerializer

    @action(
        detail=False,
        methods=["post"],
        url_path="compose",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def compose(self, request):
        """Compose and send a new email. Accepts JSON or multipart with files."""
        # When sent as multipart, JSON fields arrive as strings
        compose_data = request.data.copy()
        for list_field in (
            "to_addresses",
            "cc_addresses",
            "bcc_addresses",
            "attachment_ids",
        ):
            val = compose_data.get(list_field)
            if isinstance(val, str):
                import json

                try:
                    compose_data[list_field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    pass

        serializer = ComposeEmailSerializer(data=compose_data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Enforce user's assigned email account
        user = request.user
        if not user.email_account:
            return Response(
                {
                    "detail": "You do not have an email account assigned. Contact your administrator."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        account = user.email_account
        if not account.is_active:
            return Response(
                {
                    "detail": "Your assigned email account is inactive. Contact your administrator."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle template rendering
        subject = data["subject"]
        body_text = data["body_text"]
        if data.get("template_id"):
            try:
                template = EmailTemplate.objects.get(
                    id=data["template_id"], is_active=True
                )
                subject, body_text = template.render(data.get("template_context", {}))
            except EmailTemplate.DoesNotExist:
                pass

        # Find or create thread for replies
        thread = None
        if data.get("in_reply_to"):
            parent = (
                EmailMessage.objects.filter(message_id=data["in_reply_to"])
                .select_related("thread")
                .first()
            )
            if parent and parent.thread:
                thread = parent.thread

        if not thread:
            from apps.emails.tasks import _normalize_subject

            thread = EmailThread.objects.create(
                subject=_normalize_subject(subject),
                contact_id=data.get("contact"),
                case_id=data.get("case"),
            )

        # Create draft message
        placeholder_id = f"draft-{uuid.uuid4()}"
        msg = EmailMessage.objects.create(
            account=account,
            thread=thread,
            message_id=placeholder_id,
            in_reply_to=data.get("in_reply_to", ""),
            references=data.get("references", ""),
            direction=EmailMessage.Direction.OUTBOUND,
            from_address=account.email_address,
            to_addresses=data["to_addresses"],
            cc_addresses=data.get("cc_addresses", []),
            bcc_addresses=data.get("bcc_addresses", []),
            subject=subject,
            body_text=body_text,
            folder=EmailMessage.Folder.SENT,
            contact_id=data.get("contact"),
            case_id=data.get("case"),
            sent_by=request.user,
        )

        # Attach documents from CRM
        from apps.documents.models import Document

        for doc_id in data.get("attachment_ids", []):
            try:
                doc = Document.objects.get(id=doc_id)
                EmailAttachment.objects.create(
                    email=msg,
                    file=doc.file,
                    filename=doc.title,
                    mime_type=doc.mime_type,
                    file_size=doc.file_size,
                    document=doc,
                )
            except Document.DoesNotExist:
                continue

        # Attach uploaded files
        for uploaded in request.FILES.getlist("files"):
            mime = (
                uploaded.content_type
                or mimetypes.guess_type(uploaded.name)[0]
                or "application/octet-stream"
            )
            EmailAttachment.objects.create(
                email=msg,
                file=uploaded,
                filename=uploaded.name,
                mime_type=mime,
                file_size=uploaded.size,
            )

        # Send via Celery
        send_email_task.delay(str(msg.id))

        return Response(
            EmailMessageDetailSerializer(msg).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """Mark a message as read."""
        msg = self.get_object()
        msg.is_read = True
        msg.save(update_fields=["is_read", "updated_at"])
        return Response({"is_read": True})

    @action(detail=True, methods=["post"], url_path="mark-unread")
    def mark_unread(self, request, pk=None):
        """Mark a message as unread."""
        msg = self.get_object()
        msg.is_read = False
        msg.save(update_fields=["is_read", "updated_at"])
        return Response({"is_read": False})

    @action(detail=True, methods=["post"], url_path="toggle-star")
    def toggle_star(self, request, pk=None):
        """Toggle star status."""
        msg = self.get_object()
        msg.is_starred = not msg.is_starred
        msg.save(update_fields=["is_starred", "updated_at"])
        return Response({"is_starred": msg.is_starred})

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        """Assign an email to a user."""
        msg = self.get_object()
        user_id = request.data.get("user_id")
        if user_id:
            from apps.users.models import User

            try:
                user = User.objects.get(id=user_id)
                msg.assigned_to = user
            except User.DoesNotExist:
                return Response(
                    {"detail": "User not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            msg.assigned_to = None
        msg.save(update_fields=["assigned_to", "updated_at"])
        return Response(EmailMessageDetailSerializer(msg).data)

    @action(detail=True, methods=["post"], url_path="link-contact")
    def link_contact(self, request, pk=None):
        """Link an email to a contact."""
        msg = self.get_object()
        contact_id = request.data.get("contact_id")
        if contact_id:
            from apps.contacts.models import Contact

            try:
                contact = Contact.objects.get(id=contact_id)
                msg.contact = contact
            except Contact.DoesNotExist:
                return Response(
                    {"detail": "Contact not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            msg.contact = None
        msg.save(update_fields=["contact", "updated_at"])

        # Also update thread
        if msg.thread and msg.contact:
            msg.thread.contact = msg.contact
            msg.thread.save(update_fields=["contact", "updated_at"])

        return Response(EmailMessageDetailSerializer(msg).data)

    @action(detail=True, methods=["post"], url_path="link-case")
    def link_case(self, request, pk=None):
        """Link an email to a tax case."""
        msg = self.get_object()
        case_id = request.data.get("case_id")
        if case_id:
            from apps.cases.models import TaxCase

            try:
                case = TaxCase.objects.get(id=case_id)
                msg.case = case
            except TaxCase.DoesNotExist:
                return Response(
                    {"detail": "Case not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            msg.case = None
        msg.save(update_fields=["case", "updated_at"])

        # Also update thread
        if msg.thread and msg.case:
            msg.thread.case = msg.case
            msg.thread.save(update_fields=["case", "updated_at"])

        return Response(EmailMessageDetailSerializer(msg).data)

    @action(detail=True, methods=["post"], url_path="move-to-trash")
    def move_to_trash(self, request, pk=None):
        """Move an email to the trash folder."""
        msg = self.get_object()
        msg.folder = EmailMessage.Folder.TRASH
        msg.save(update_fields=["folder", "updated_at"])
        return Response(EmailMessageDetailSerializer(msg).data)


class EmailThreadViewSet(viewsets.ReadOnlyModelViewSet):
    """Email threads — list and retrieve with nested messages."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "emails"
    filterset_class = EmailThreadFilter
    ordering_fields = ["last_message_at", "created_at"]
    ordering = ["-last_message_at"]

    def get_queryset(self):
        return EmailThread.objects.select_related("contact", "case").prefetch_related(
            "messages"
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EmailThreadDetailSerializer
        return EmailThreadListSerializer

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive a thread."""
        thread = self.get_object()
        thread.is_archived = True
        thread.save(update_fields=["is_archived", "updated_at"])
        return Response(EmailThreadDetailSerializer(thread).data)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """CRUD for email templates + render preview."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "emails"
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="render")
    def render_preview(self, request, pk=None):
        """Render a template with given context variables."""
        template = self.get_object()
        ser = EmailTemplateRenderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        subject, body_text = template.render(ser.validated_data["context"])
        return Response({"subject": subject, "body_text": body_text})
