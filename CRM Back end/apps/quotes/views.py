from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.quotes.filters import QuoteFilter
from apps.quotes.models import Quote
from apps.quotes.serializers import (
    QuoteCreateUpdateSerializer,
    QuoteDetailSerializer,
    QuoteListSerializer,
)
from apps.users.permissions import ModulePermission


class QuoteViewSet(viewsets.ModelViewSet):
    """
    CRUD + stage transitions for Quotes / Proposals.

    Endpoints
    ---------
    GET    /                  list (paginated, filterable, searchable)
    POST   /                  create (auto-generates quote_number)
    GET    /{id}/             retrieve
    PUT    /{id}/             full update
    PATCH  /{id}/             partial update
    DELETE /{id}/             destroy
    POST   /{id}/send/        transition stage → sent
    POST   /{id}/accept/      transition stage → accepted
    POST   /{id}/reject/      transition stage → rejected
    """

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "quotes"
    filterset_class = QuoteFilter
    search_fields = ["quote_number", "subject"]
    ordering_fields = [
        "quote_number",
        "subject",
        "stage",
        "total",
        "valid_until",
        "created_at",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Quote.objects.select_related(
                "contact",
                "corporation",
                "case",
                "assigned_to",
                "created_by",
            )
            .prefetch_related("line_items")
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return QuoteListSerializer
        if self.action in ("create", "update", "partial_update"):
            return QuoteCreateUpdateSerializer
        return QuoteDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # --- Stage transition actions ---
    @action(detail=True, methods=["post"], url_path="send")
    def send_quote(self, request, pk=None):
        """Transition the quote stage to 'sent'."""
        quote = self.get_object()
        if quote.stage not in (Quote.Stage.DRAFT,):
            return Response(
                {"detail": f"Cannot send a quote in '{quote.get_stage_display()}' stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quote.stage = Quote.Stage.SENT
        quote.save(update_fields=["stage", "updated_at"])
        return Response(QuoteDetailSerializer(quote).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept_quote(self, request, pk=None):
        """Transition the quote stage to 'accepted'."""
        quote = self.get_object()
        if quote.stage not in (Quote.Stage.SENT,):
            return Response(
                {"detail": f"Cannot accept a quote in '{quote.get_stage_display()}' stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quote.stage = Quote.Stage.ACCEPTED
        quote.save(update_fields=["stage", "updated_at"])
        return Response(QuoteDetailSerializer(quote).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject_quote(self, request, pk=None):
        """Transition the quote stage to 'rejected'."""
        quote = self.get_object()
        if quote.stage not in (Quote.Stage.SENT,):
            return Response(
                {"detail": f"Cannot reject a quote in '{quote.get_stage_display()}' stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quote.stage = Quote.Stage.REJECTED
        quote.save(update_fields=["stage", "updated_at"])
        return Response(QuoteDetailSerializer(quote).data, status=status.HTTP_200_OK)
