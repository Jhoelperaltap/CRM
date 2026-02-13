from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.internal_tickets.filters import InternalTicketFilter
from apps.internal_tickets.models import InternalTicket
from apps.internal_tickets.serializers import (
    InternalTicketCreateUpdateSerializer,
    InternalTicketDetailSerializer,
    InternalTicketListSerializer,
)
from apps.users.permissions import ModulePermission


class InternalTicketViewSet(viewsets.ModelViewSet):
    """CRUD for internal tickets."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "internal_tickets"
    filterset_class = InternalTicketFilter
    search_fields = ["title", "description", "ticket_number"]
    ordering_fields = [
        "title",
        "ticket_number",
        "status",
        "priority",
        "created_at",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        return InternalTicket.objects.select_related(
            "assigned_to", "employee", "created_by", "group"
        ).all()

    def get_serializer_class(self):
        if self.action == "list":
            return InternalTicketListSerializer
        if self.action in ("create", "update", "partial_update"):
            return InternalTicketCreateUpdateSerializer
        return InternalTicketDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
