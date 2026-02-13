from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cases.checklist_views import CaseChecklistViewSet
from apps.cases.filters import TaxCaseFilter
from apps.cases.models import TaxCase, TaxCaseNote
from apps.cases.serializers import (
    TaxCaseCreateUpdateSerializer,
    TaxCaseDetailSerializer,
    TaxCaseListSerializer,
    TaxCaseNoteCreateSerializer,
    TaxCaseNoteSerializer,
    TaxCaseTransitionSerializer,
)
from apps.cases.services import transition_case_status
from apps.users.permissions import ModulePermission


class TaxCaseViewSet(viewsets.ModelViewSet):
    """
    CRUD + workflow for Tax Cases.

    Endpoints
    ---------
    GET    /                         list (paginated, filterable, searchable)
    POST   /                         create (auto-generates case_number)
    GET    /{id}/                    retrieve
    PUT    /{id}/                    full update
    PATCH  /{id}/                    partial update
    DELETE /{id}/                    destroy
    POST   /{id}/transition/         transition case status
    GET    /{id}/notes/              list notes for a case
    POST   /{id}/notes/              add a note to a case
    """

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "cases"
    filterset_class = TaxCaseFilter
    search_fields = ["case_number", "title"]
    ordering_fields = [
        "case_number",
        "title",
        "case_type",
        "fiscal_year",
        "status",
        "priority",
        "due_date",
        "created_at",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            TaxCase.objects.select_related(
                "contact",
                "corporation",
                "assigned_preparer",
                "reviewer",
                "created_by",
            )
            .prefetch_related("notes__author")
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return TaxCaseListSerializer
        if self.action in ("create", "update", "partial_update"):
            return TaxCaseCreateUpdateSerializer
        return TaxCaseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_locked:
            return Response(
                {"detail": f"Cannot edit a case in '{instance.get_status_display()}' status. Only status transitions are allowed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_locked:
            return Response(
                {"detail": f"Cannot edit a case in '{instance.get_status_display()}' status. Only status transitions are allowed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        """Transition the case to a new workflow status."""
        case = self.get_object()
        serializer = TaxCaseTransitionSerializer(
            data=request.data,
            context={"case": case, "request": request},
        )
        serializer.is_valid(raise_exception=True)

        updated_case = transition_case_status(
            case=case,
            new_status=serializer.validated_data["status"],
            user=request.user,
        )
        return Response(
            TaxCaseDetailSerializer(updated_case).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post"], url_path="checklist(?:/items/(?P<item_id>[^/.]+)/toggle)?")
    def checklist(self, request, pk=None, item_id=None):
        """Get case checklist or toggle an item."""
        checklist_vs = CaseChecklistViewSet()
        checklist_vs.request = request
        checklist_vs.kwargs = {"case_pk": pk}

        if item_id and request.method == "POST":
            return checklist_vs.toggle_item(request, case_pk=pk, item_id=item_id)
        return checklist_vs.retrieve(request, case_pk=pk)

    @action(detail=True, methods=["get"], url_path="emails")
    def emails(self, request, pk=None):
        """List emails linked to this case."""
        from apps.emails.models import EmailMessage
        from apps.emails.serializers import EmailMessageListSerializer

        case = self.get_object()
        qs = EmailMessage.objects.filter(case=case).order_by("-sent_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = EmailMessageListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = EmailMessageListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        """List or add notes for a case."""
        case = self.get_object()

        if request.method == "GET":
            notes_qs = case.notes.select_related("author").all()
            serializer = TaxCaseNoteSerializer(notes_qs, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # POST — create a new note
        serializer = TaxCaseNoteCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(case=case, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
