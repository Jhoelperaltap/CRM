import csv
import io

from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.corporations.filters import CorporationFilter
from apps.corporations.models import Corporation
from apps.corporations.serializers import (
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

    queryset = (
        Corporation.objects
        .select_related("primary_contact", "assigned_to", "created_by")
        .all()
    )
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
    # Permissions
    # ------------------------------------------------------------------
    def get_permissions(self):
        if self.action in ("list", "retrieve", "contacts", "cases"):
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

        contacts_qs = Contact.objects.filter(corporation=corporation)

        # Include the primary contact even if it does not have the
        # corporation FK set (defensive).
        if (
            corporation.primary_contact_id
            and not contacts_qs.filter(pk=corporation.primary_contact_id).exists()
        ):
            contacts_qs = contacts_qs | Contact.objects.filter(
                pk=corporation.primary_contact_id,
            )

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

        cases_qs = (
            TaxCase.objects
            .filter(corporation=corporation)
            .order_by("-created_at")
        )
        serializer = TaxCaseListSerializer(cases_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        """
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response(
                {"detail": "No file uploaded. Provide a 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = csv_file.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response(
                {"detail": "File must be UTF-8 encoded."},
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
                    skipped.append({
                        "row": row_number,
                        "reason": f"Duplicate EIN: {data['ein']}",
                        "matched_id": str(match.id),
                    })
                    continue

            # Dedup by name
            match = Corporation.objects.filter(name__iexact=data["name"]).first()
            if match:
                skipped.append({
                    "row": row_number,
                    "reason": f"Duplicate name: {data['name']}",
                    "matched_id": str(match.id),
                })
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
            status=status.HTTP_201_CREATED if created_count else status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["get"], url_path="export_csv")
    def export_csv(self, request):
        """Export the current (filtered) queryset as a downloadable CSV file."""
        qs = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="corporations_export.csv"'

        writer = csv.writer(response)
        header = [
            "id", "name", "legal_name", "entity_type", "ein", "state_id",
            "street_address", "city", "state", "zip_code", "country",
            "phone", "fax", "email", "website", "industry",
            "annual_revenue", "fiscal_year_end", "date_incorporated",
            "status", "primary_contact", "assigned_to", "description",
            "created_at",
        ]
        writer.writerow(header)

        for corp in qs.iterator():
            writer.writerow([
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
                corp.date_incorporated.isoformat() if corp.date_incorporated else "",
                corp.status,
                corp.primary_contact.first_name + " " + corp.primary_contact.last_name if corp.primary_contact else "",
                corp.assigned_to.get_full_name() if corp.assigned_to else "",
                corp.description,
                corp.created_at.isoformat(),
            ])

        return response
