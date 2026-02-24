import csv
import io

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.validators import validate_csv_import
from apps.corporations.filters import CorporationFilter
from apps.corporations.models import Corporation
from apps.corporations.serializers import (
    ClientStatusChangeSerializer,
    CorporationCreateUpdateSerializer,
    CorporationDetailSerializer,
    CorporationImportSerializer,
    CorporationListSerializer,
)
from apps.users.permissions import ModulePermission


class CorporationViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for Corporation entities.

    - **list**:     paginated, filterable, searchable list of corporations.
    - **retrieve**: full detail for a single corporation.
    - **create**:   create a new corporation (sets ``created_by`` automatically).
    - **update**:   full or partial update.
    - **destroy**:  soft-delete is not implemented; this performs a hard delete.

    Custom actions
    - **contacts**  ``GET /corporations/<pk>/contacts/``  -- contacts linked to this corporation.
    - **cases**     ``GET /corporations/<pk>/cases/``     -- tax cases linked to this corporation.
    """

    queryset = Corporation.objects.all()
    filterset_class = CorporationFilter
    search_fields = ["name", "legal_name", "ein"]
    ordering_fields = [
        "name",
        "entity_type",
        "status",
        "annual_revenue",
        "date_incorporated",
        "created_at",
    ]
    ordering = ["name"]
    module_name = "corporations"

    # ------------------------------------------------------------------
    # Queryset optimization to prevent N+1 queries
    # ------------------------------------------------------------------
    def get_queryset(self):
        qs = Corporation.objects.all()

        if self.action == "list":
            # List view: only needs relations shown in CorporationListSerializer
            qs = qs.select_related("primary_contact", "assigned_to", "member_of")
        elif self.action in ("retrieve", "update", "partial_update"):
            # Detail view: needs all relations shown in CorporationDetailSerializer
            qs = qs.select_related(
                "primary_contact",
                "assigned_to",
                "created_by",
                "closed_by",
                "paused_by",
                "member_of",
                "sla",
            )
        else:
            # Other actions: basic prefetching
            qs = qs.select_related("primary_contact", "assigned_to", "created_by")

        return qs

    # ------------------------------------------------------------------
    # Permissions
    # ------------------------------------------------------------------
    def get_permissions(self):
        if self.action in ("list", "retrieve", "contacts", "cases"):
            return [IsAuthenticated()]
        if self.action in ("change_client_status", "log_access"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), ModulePermission()]

    # ------------------------------------------------------------------
    # Serializer selection
    # ------------------------------------------------------------------
    def get_serializer_class(self):
        if self.action == "list":
            return CorporationListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CorporationCreateUpdateSerializer
        return CorporationDetailSerializer

    # ------------------------------------------------------------------
    # Create override — auto-set created_by
    # ------------------------------------------------------------------
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # ------------------------------------------------------------------
    # Custom actions
    # ------------------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="contacts")
    def contacts(self, request, pk=None):
        """
        Return all contacts associated with this corporation.

        Contacts are discovered via:
        1. The ``primary_contact`` FK on the corporation.
        2. Any Contact whose ``corporation`` FK points to this corporation
           (if the Contact model carries that field).
        """
        corporation = self.get_object()

        from apps.contacts.models import Contact
        from apps.contacts.serializers import ContactListSerializer

        # Use select_related to prevent N+1 queries for ContactListSerializer
        contacts_qs = Contact.objects.select_related(
            "corporation", "assigned_to"
        ).filter(corporation=corporation)

        # Include the primary contact even if it does not have the
        # corporation FK set (defensive).
        if (
            corporation.primary_contact_id
            and not contacts_qs.filter(pk=corporation.primary_contact_id).exists()
        ):
            contacts_qs = contacts_qs | Contact.objects.select_related(
                "corporation", "assigned_to"
            ).filter(pk=corporation.primary_contact_id)

        contacts_qs = contacts_qs.distinct().order_by("last_name", "first_name")
        serializer = ContactListSerializer(contacts_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="cases")
    def cases(self, request, pk=None):
        """
        Return all tax cases associated with this corporation.

        Cases are discovered via TaxCase.corporation FK.
        """
        corporation = self.get_object()

        from apps.cases.models import TaxCase
        from apps.cases.serializers import TaxCaseListSerializer

        # Use select_related to prevent N+1 queries for TaxCaseListSerializer
        cases_qs = (
            TaxCase.objects.select_related("contact", "assigned_preparer")
            .filter(corporation=corporation)
            .order_by("-created_at")
        )
        serializer = TaxCaseListSerializer(cases_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="change-client-status")
    def change_client_status(self, request, pk=None):
        """
        Change the client status of a corporation.
        Only managers/admins can set status to 'business_closed'.
        """
        corporation = self.get_object()
        serializer = ClientStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["client_status"]
        closure_reason = serializer.validated_data.get("closure_reason", "")
        pause_reason = serializer.validated_data.get("pause_reason", "")

        if new_status == Corporation.ClientStatus.BUSINESS_CLOSED:
            corporation.closure_reason = closure_reason
            corporation.closed_at = timezone.now()
            corporation.closed_by = request.user
            # Clear pause fields when closing
            corporation.pause_reason = ""
            corporation.paused_at = None
            corporation.paused_by = None
        elif new_status == Corporation.ClientStatus.PAUSED:
            corporation.pause_reason = pause_reason
            corporation.paused_at = timezone.now()
            corporation.paused_by = request.user
        else:
            # If reactivating from closed, clear closure fields
            if corporation.client_status == Corporation.ClientStatus.BUSINESS_CLOSED:
                corporation.closure_reason = ""
                corporation.closed_at = None
                corporation.closed_by = None
            # If reactivating from paused, clear pause fields
            if corporation.client_status == Corporation.ClientStatus.PAUSED:
                corporation.pause_reason = ""
                corporation.paused_at = None
                corporation.paused_by = None

        corporation.client_status = new_status
        corporation.save(
            update_fields=[
                "client_status",
                "closure_reason",
                "closed_at",
                "closed_by",
                "pause_reason",
                "paused_at",
                "paused_by",
            ]
        )

        return Response(CorporationDetailSerializer(corporation).data)

    @action(detail=True, methods=["post"], url_path="log-access")
    def log_access(self, request, pk=None):
        """
        Log access to a closed or paused corporation.
        Triggers a Celery task to notify managers/admins.
        """
        corporation = self.get_object()

        # Only log access for closed or paused corporations
        if corporation.client_status not in [
            Corporation.ClientStatus.BUSINESS_CLOSED,
            Corporation.ClientStatus.PAUSED,
        ]:
            return Response(
                {
                    "detail": "Access logging only applies to closed or paused corporations."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the reason based on status
        reason = ""
        if corporation.client_status == Corporation.ClientStatus.BUSINESS_CLOSED:
            reason = corporation.closure_reason
        elif corporation.client_status == Corporation.ClientStatus.PAUSED:
            reason = corporation.pause_reason

        # Trigger Celery task to notify managers/admins
        from apps.corporations.tasks import notify_closed_corporation_access

        notify_closed_corporation_access.delay(
            corporation_id=str(corporation.id),
            corporation_name=corporation.name,
            accessed_by_user_id=str(request.user.id),
            accessed_by_name=request.user.get_full_name() or request.user.email,
            client_status=corporation.client_status,
            reason=reason,
        )

        return Response(
            {"detail": "Access logged successfully."}, status=status.HTTP_200_OK
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="import_csv",
        parser_classes=[MultiPartParser],
    )
    def import_csv(self, request):
        """
        Bulk-create corporations from an uploaded CSV file.
        Dedup: skip rows that match an existing EIN or name.

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

        for row_number, row in enumerate(reader, start=2):
            cleaned = {
                k.strip().lower().replace(" ", "_"): v.strip()
                for k, v in row.items()
                if k
            }

            serializer = CorporationImportSerializer(data=cleaned)
            if not serializer.is_valid():
                errors.append({"row": row_number, "errors": serializer.errors})
                continue

            data = serializer.validated_data
            # Dedup by EIN
            if data.get("ein"):
                match = Corporation.objects.filter(ein=data["ein"]).first()
                if match:
                    skipped.append(
                        {
                            "row": row_number,
                            "reason": f"Duplicate EIN: {data['ein']}",
                            "matched_id": str(match.id),
                        }
                    )
                    continue

            # Dedup by name
            match = Corporation.objects.filter(name__iexact=data["name"]).first()
            if match:
                skipped.append(
                    {
                        "row": row_number,
                        "reason": f"Duplicate name: {data['name']}",
                        "matched_id": str(match.id),
                    }
                )
                continue

            Corporation.objects.create(created_by=request.user, **data)
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

    @action(detail=False, methods=["get"], url_path="export_csv")
    def export_csv(self, request):
        """Export the current (filtered) queryset as a downloadable CSV file."""
        qs = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="corporations_export.csv"'
        )

        writer = csv.writer(response)
        header = [
            "id",
            "name",
            "legal_name",
            "entity_type",
            "ein",
            "state_id",
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            "phone",
            "fax",
            "email",
            "website",
            "industry",
            "annual_revenue",
            "fiscal_year_end",
            "date_incorporated",
            "status",
            "primary_contact",
            "assigned_to",
            "description",
            "created_at",
        ]
        writer.writerow(header)

        for corp in qs.iterator():
            writer.writerow(
                [
                    str(corp.id),
                    corp.name,
                    corp.legal_name,
                    corp.entity_type,
                    corp.ein,
                    corp.state_id,
                    corp.street_address,
                    corp.city,
                    corp.state,
                    corp.zip_code,
                    corp.country,
                    corp.phone,
                    corp.fax,
                    corp.email,
                    corp.website,
                    corp.industry,
                    str(corp.annual_revenue) if corp.annual_revenue else "",
                    corp.fiscal_year_end,
                    (
                        corp.date_incorporated.isoformat()
                        if corp.date_incorporated
                        else ""
                    ),
                    corp.status,
                    (
                        corp.primary_contact.first_name
                        + " "
                        + corp.primary_contact.last_name
                        if corp.primary_contact
                        else ""
                    ),
                    corp.assigned_to.get_full_name() if corp.assigned_to else "",
                    corp.description,
                    corp.created_at.isoformat(),
                ]
            )

        return response
