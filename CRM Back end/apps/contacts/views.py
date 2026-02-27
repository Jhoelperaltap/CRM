import csv
import io

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Exists, OuterRef
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.contacts.filters import ContactFilter
from apps.contacts.models import Contact, ContactStar, ContactTag, ContactTagAssignment
from apps.contacts.serializers import (
    ContactCreateUpdateSerializer,
    ContactDetailSerializer,
    ContactImportSerializer,
    ContactListSerializer,
    ContactTagAssignmentSerializer,
    ContactTagSerializer,
)
from apps.core.validators import validate_csv_import
from apps.users.permissions import ModulePermission


class ContactViewSet(viewsets.ModelViewSet):
    """
    CRUD + extras for Contacts.

    Endpoints
    ---------
    GET    /                 list (paginated, filterable, searchable)
    POST   /                 create
    GET    /{id}/            retrieve
    PUT    /{id}/            full update
    PATCH  /{id}/            partial update
    DELETE /{id}/            destroy
    POST   /{id}/star/       toggle star for the requesting user
    GET    /starred/         list contacts starred by the requesting user
    POST   /import_csv/      bulk-create contacts from an uploaded CSV file
    GET    /export_csv/      download all contacts as a CSV file
    """

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "contacts"
    filterset_class = ContactFilter
    search_fields = ["first_name", "last_name", "email", "phone"]
    ordering_fields = [
        "first_name",
        "last_name",
        "email",
        "status",
        "created_at",
        "updated_at",
    ]
    ordering = ["last_name", "first_name"]

    # ------------------------------------------------------------------
    # Queryset
    # ------------------------------------------------------------------
    def get_queryset(self):
        qs = Contact.objects.select_related(
            "primary_corporation", "assigned_to", "created_by", "reports_to", "sla"
        ).prefetch_related("corporations").all()

        # Annotate a boolean ``_is_starred`` so serializers can avoid N+1
        if self.request.user.is_authenticated:
            star_subquery = ContactStar.objects.filter(
                user=self.request.user,
                contact=OuterRef("pk"),
            )
            qs = qs.annotate(_is_starred=Exists(star_subquery))

        return qs

    # ------------------------------------------------------------------
    # Serializer selection
    # ------------------------------------------------------------------
    def get_serializer_class(self):
        if self.action == "list" or self.action == "starred":
            return ContactListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ContactCreateUpdateSerializer
        # retrieve, star, etc.
        return ContactDetailSerializer

    # ------------------------------------------------------------------
    # Create -- inject created_by
    # ------------------------------------------------------------------
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # ------------------------------------------------------------------
    # Custom actions
    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="star")
    def star(self, request, pk=None):
        """
        Toggle the star status for the requesting user on this contact.
        If a star exists, it is removed; otherwise it is created.
        Returns ``{"starred": true/false}``.
        """
        contact = self.get_object()
        star, created = ContactStar.objects.get_or_create(
            user=request.user,
            contact=contact,
        )
        if not created:
            star.delete()
            return Response({"starred": False}, status=status.HTTP_200_OK)
        return Response({"starred": True}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="starred")
    def starred(self, request):
        """Return a paginated list of contacts starred by the requesting user."""
        starred_ids = ContactStar.objects.filter(
            user=request.user,
        ).values_list("contact_id", flat=True)

        qs = self.get_queryset().filter(id__in=starred_ids)
        qs = self.filter_queryset(qs)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["post"],
        url_path="import_csv",
        parser_classes=[MultiPartParser],
    )
    def import_csv(self, request):
        """
        Accept a CSV file upload and create contacts from each row.

        Expected CSV columns (header row required)::

            first_name, last_name, email, phone, mobile, salutation,
            date_of_birth, street_address, city, state, zip_code,
            country, status, source, description, tags

        Returns a summary with counts of created and errored rows.

        Limits: Max 10MB file size, max 10000 rows.
        """
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response(
                {"detail": "No file uploaded. Provide a 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size and format
        try:
            decoded, _row_count = validate_csv_import(csv_file)
        except DjangoValidationError as e:
            return Response(
                {"detail": str(e.message)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(decoded))

        created_count = 0
        errors = []
        skipped = []

        for row_number, row in enumerate(reader, start=2):  # row 1 is header
            # Normalise keys: strip whitespace, lowercase
            cleaned = {
                k.strip().lower().replace(" ", "_"): v.strip()
                for k, v in row.items()
                if k
            }

            serializer = ContactImportSerializer(data=cleaned)
            if not serializer.is_valid():
                errors.append({"row": row_number, "errors": serializer.errors})
                continue

            data = serializer.validated_data

            # Dedup by email
            if data.get("email"):
                match = Contact.objects.filter(email__iexact=data["email"]).first()
                if match:
                    skipped.append(
                        {
                            "row": row_number,
                            "reason": f"Duplicate email: {data['email']}",
                            "matched_id": str(match.id),
                        }
                    )
                    continue

            # Dedup by name + phone
            if data.get("phone"):
                match = Contact.objects.filter(
                    first_name__iexact=data.get("first_name", ""),
                    last_name__iexact=data.get("last_name", ""),
                    phone=data["phone"],
                ).first()
                if match:
                    skipped.append(
                        {
                            "row": row_number,
                            "reason": "Duplicate name+phone",
                            "matched_id": str(match.id),
                        }
                    )
                    continue

            Contact.objects.create(
                created_by=request.user,
                **data,
            )
            created_count += 1

        return Response(
            {
                "created": created_count,
                "skipped": skipped,
                "errors": errors,
                "total_processed": created_count + len(errors) + len(skipped),
            },
            status=(
                status.HTTP_201_CREATED
                if created_count
                else status.HTTP_400_BAD_REQUEST
            ),
        )

    @action(detail=True, methods=["get"], url_path="emails")
    def emails(self, request, pk=None):
        """List emails linked to this contact."""
        from apps.emails.models import EmailMessage
        from apps.emails.serializers import EmailMessageListSerializer

        contact = self.get_object()
        qs = EmailMessage.objects.filter(contact=contact).order_by("-sent_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = EmailMessageListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = EmailMessageListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="export_csv")
    def export_csv(self, request):
        """
        Export the current (filtered) queryset as a downloadable CSV file.
        Respects any active query-string filters / search.
        """
        qs = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="contacts_export.csv"'

        writer = csv.writer(response)

        # Header row
        header = [
            "id",
            "salutation",
            "first_name",
            "last_name",
            "email",
            "phone",
            "mobile",
            "date_of_birth",
            "ssn_last_four",
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            "status",
            "source",
            "primary_corporation",
            "assigned_to",
            "description",
            "tags",
            "created_at",
        ]
        writer.writerow(header)

        for contact in qs.iterator():
            writer.writerow(
                [
                    str(contact.id),
                    contact.salutation,
                    contact.first_name,
                    contact.last_name,
                    contact.email,
                    contact.phone,
                    contact.mobile,
                    contact.date_of_birth.isoformat() if contact.date_of_birth else "",
                    contact.ssn_last_four,
                    contact.street_address,
                    contact.city,
                    contact.state,
                    contact.zip_code,
                    contact.country,
                    contact.status,
                    contact.source,
                    contact.primary_corporation.name if contact.primary_corporation else "",
                    contact.assigned_to.get_full_name() if contact.assigned_to else "",
                    contact.description,
                    contact.tags,
                    contact.created_at.isoformat(),
                ]
            )

        return response

    # ------------------------------------------------------------------
    # Client Portal Messages
    # ------------------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="client-messages")
    def client_messages(self, request, pk=None):
        """
        List all portal messages for this contact (both directions).
        Returns messages sorted by created_at descending.
        """
        from apps.portal.models import PortalMessage
        from apps.portal.serializers import PortalMessageSerializer

        contact = self.get_object()
        qs = (
            PortalMessage.objects.filter(contact=contact)
            .select_related("sender_user", "case")
            .order_by("-created_at")
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = PortalMessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PortalMessageSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="send-client-message")
    def send_client_message(self, request, pk=None):
        """
        Send a message to the client via their portal.
        Required fields: subject, body
        Optional fields: case (case ID)
        """
        from apps.portal.models import PortalMessage

        contact = self.get_object()

        subject = request.data.get("subject", "").strip()
        body = request.data.get("body", "").strip()
        case_id = request.data.get("case")

        if not subject or not body:
            return Response(
                {"detail": "Subject and body are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message_data = {
            "contact": contact,
            "message_type": PortalMessage.MessageType.STAFF_TO_CLIENT,
            "subject": subject,
            "body": body,
            "sender_user": request.user,
            "is_read": False,
        }

        if case_id:
            from apps.cases.models import TaxCase

            try:
                case = TaxCase.objects.get(id=case_id, contact=contact)
                message_data["case"] = case
            except TaxCase.DoesNotExist:
                pass

        message = PortalMessage.objects.create(**message_data)

        # Create portal notification for client
        try:
            from apps.portal.models import PortalNotification

            PortalNotification.objects.create(
                contact=contact,
                notification_type=PortalNotification.Type.NEW_MESSAGE,
                title="New Message",
                message=f"From {request.user.get_full_name()}: {subject}",
                related_message=message,
                related_case=message_data.get("case"),
            )
        except Exception as e:
            # Log but don't fail the main operation
            import logging

            logging.getLogger(__name__).warning(
                f"Failed to create portal notification for contact {contact.id}: {e}"
            )

        # Send push notification to client if they have a device token
        try:
            from apps.notifications.services import send_push_notification
            from apps.portal.models import PortalDeviceToken

            device_tokens = PortalDeviceToken.objects.filter(
                contact=contact,
                is_active=True,
            ).values_list("token", flat=True)

            for token in device_tokens:
                send_push_notification(
                    token=token,
                    title="New Message",
                    body=f"{request.user.get_full_name()}: {subject}",
                    data={"type": "message", "message_id": str(message.id)},
                )
        except Exception as e:
            # Log but don't fail the main operation
            import logging

            logging.getLogger(__name__).warning(
                f"Failed to send push notification to contact {contact.id}: {e}"
            )

        from apps.portal.serializers import PortalMessageSerializer

        serializer = PortalMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ContactTagViewSet(viewsets.ModelViewSet):
    """
    CRUD for Contact Tags.

    Endpoints
    ---------
    GET    /                 list all tags
    POST   /                 create a new tag
    GET    /{id}/            retrieve a tag
    PUT    /{id}/            update a tag
    DELETE /{id}/            delete a tag
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ContactTagSerializer
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return tags visible to the user (shared + own personal tags)."""
        from django.db.models import Q

        user = self.request.user
        return ContactTag.objects.filter(
            Q(tag_type=ContactTag.TagType.SHARED)
            | Q(tag_type=ContactTag.TagType.PERSONAL, created_by=user)
        )


class ContactTagAssignmentViewSet(viewsets.ModelViewSet):
    """
    Manage tag assignments to contacts.

    Endpoints
    ---------
    GET    /                     list assignments
    POST   /                     assign a tag to a contact
    DELETE /{id}/                remove a tag assignment
    POST   /bulk-assign/         assign tags to multiple contacts
    POST   /bulk-remove/         remove tags from multiple contacts
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ContactTagAssignmentSerializer

    def get_queryset(self):
        qs = ContactTagAssignment.objects.select_related(
            "contact", "tag", "assigned_by"
        )

        # Filter by contact
        contact_id = self.request.query_params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)

        # Filter by tag
        tag_id = self.request.query_params.get("tag")
        if tag_id:
            qs = qs.filter(tag_id=tag_id)

        return qs

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        """Assign one or more tags to multiple contacts."""
        contact_ids = request.data.get("contact_ids", [])
        tag_ids = request.data.get("tag_ids", [])

        if not contact_ids or not tag_ids:
            return Response(
                {"detail": "Both contact_ids and tag_ids are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = 0
        for contact_id in contact_ids:
            for tag_id in tag_ids:
                _, was_created = ContactTagAssignment.objects.get_or_create(
                    contact_id=contact_id,
                    tag_id=tag_id,
                    defaults={"assigned_by": request.user},
                )
                if was_created:
                    created += 1

        return Response({"created": created})

    @action(detail=False, methods=["post"], url_path="bulk-remove")
    def bulk_remove(self, request):
        """Remove one or more tags from multiple contacts."""
        contact_ids = request.data.get("contact_ids", [])
        tag_ids = request.data.get("tag_ids", [])

        if not contact_ids or not tag_ids:
            return Response(
                {"detail": "Both contact_ids and tag_ids are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = ContactTagAssignment.objects.filter(
            contact_id__in=contact_ids,
            tag_id__in=tag_ids,
        ).delete()

        return Response({"deleted": deleted})
