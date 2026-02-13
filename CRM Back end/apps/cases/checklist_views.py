from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cases.checklist_models import (
    CaseChecklist,
    CaseChecklistItem,
    ChecklistTemplate,
    ChecklistTemplateItem,
)
from apps.cases.checklist_serializers import (
    CaseChecklistItemSerializer,
    CaseChecklistSerializer,
    ChecklistTemplateItemSerializer,
    ChecklistTemplateListSerializer,
    ChecklistTemplateSerializer,
)
from apps.users.permissions import IsAdminRole


class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    """CRUD for checklist templates (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    search_fields = ["name", "case_type"]
    ordering = ["case_type", "-tax_year"]

    def get_queryset(self):
        return ChecklistTemplate.objects.prefetch_related("items").all()

    def get_serializer_class(self):
        if self.action == "list":
            return ChecklistTemplateListSerializer
        return ChecklistTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="items")
    def items(self, request, pk=None):
        """List or add items to a template."""
        template = self.get_object()

        if request.method == "GET":
            items = template.items.all()
            return Response(ChecklistTemplateItemSerializer(items, many=True).data)

        serializer = ChecklistTemplateItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(template=template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="items/(?P<item_id>[^/.]+)",
    )
    def item_detail(self, request, pk=None, item_id=None):
        """Update or delete a template item."""
        template = self.get_object()
        try:
            item = template.items.get(id=item_id)
        except ChecklistTemplateItem.DoesNotExist:
            return Response(
                {"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ChecklistTemplateItemSerializer(
            item, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CaseChecklistViewSet(viewsets.ViewSet):
    """
    Retrieve and manage a case's checklist.

    Mounted as a nested action on TaxCaseViewSet.
    """

    permission_classes = [IsAuthenticated]

    def retrieve(self, request, case_pk=None):
        """Get the checklist for a case."""
        try:
            checklist = CaseChecklist.objects.prefetch_related(
                "items", "items__completed_by", "items__linked_document"
            ).get(case_id=case_pk)
        except CaseChecklist.DoesNotExist:
            return Response(
                {"detail": "No checklist for this case."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(CaseChecklistSerializer(checklist).data)

    @action(detail=False, methods=["post"], url_path="items/(?P<item_id>[^/.]+)/toggle")
    def toggle_item(self, request, case_pk=None, item_id=None):
        """Toggle a checklist item's completion status."""
        try:
            checklist = CaseChecklist.objects.get(case_id=case_pk)
            item = checklist.items.get(id=item_id)
        except (CaseChecklist.DoesNotExist, CaseChecklistItem.DoesNotExist):
            return Response(
                {"detail": "Checklist or item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        item.is_completed = not item.is_completed
        if item.is_completed:
            item.completed_by = request.user
            item.completed_at = timezone.now()
        else:
            item.completed_by = None
            item.completed_at = None
        item.save(
            update_fields=[
                "is_completed",
                "completed_by",
                "completed_at",
                "updated_at",
            ]
        )

        # Update denormalized counts
        checklist.completed_count = checklist.items.filter(is_completed=True).count()
        checklist.save(update_fields=["completed_count", "updated_at"])

        return Response(CaseChecklistItemSerializer(item).data)
