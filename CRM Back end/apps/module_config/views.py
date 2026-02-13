from django.core.cache import cache
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.module_config.filters import (
    CRMModuleFilter,
    CustomFieldFilter,
    FieldLabelFilter,
    PicklistFilter,
    PicklistValueFilter,
)
from apps.module_config.models import (
    CRMModule,
    CustomField,
    FieldLabel,
    Picklist,
    PicklistValue,
)
from apps.module_config.serializers import (
    CRMModuleDetailSerializer,
    CRMModuleListSerializer,
    CRMModuleUpdateSerializer,
    CustomFieldReorderSerializer,
    CustomFieldSerializer,
    CustomFieldWriteSerializer,
    FieldLabelSerializer,
    FieldLabelWriteSerializer,
    PicklistSerializer,
    PicklistValueReorderSerializer,
    PicklistValueSerializer,
    PicklistValueWriteSerializer,
    PicklistWriteSerializer,
)
from apps.users.permissions import IsAdminRole


# ---------------------------------------------------------------------------
# CRM Module ViewSet
# ---------------------------------------------------------------------------
class CRMModuleViewSet(viewsets.ModelViewSet):
    """
    Module registry management.
    No create/delete — modules are managed via seed data.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = CRMModuleFilter
    search_fields = ["name", "label"]
    ordering_fields = ["sort_order", "name", "label"]
    ordering = ["sort_order", "name"]
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_queryset(self):
        return CRMModule.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return CRMModuleListSerializer
        if self.action in ("update", "partial_update"):
            return CRMModuleUpdateSerializer
        return CRMModuleDetailSerializer

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """Toggle module active/inactive status."""
        module = self.get_object()
        module.is_active = not module.is_active
        module.save(update_fields=["is_active", "updated_at"])
        # Invalidate cache
        cache.delete(f"module_active_{module.name}")
        return Response(
            CRMModuleDetailSerializer(module).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reset-numbering")
    def reset_numbering(self, request, pk=None):
        """Reset the sequence counter to 1."""
        module = self.get_object()
        module.number_next_seq = 1
        module.save(update_fields=["number_next_seq", "updated_at"])
        return Response(
            CRMModuleDetailSerializer(module).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Custom Field ViewSet (nested under module)
# ---------------------------------------------------------------------------
class CustomFieldViewSet(viewsets.ModelViewSet):
    """
    CRUD for custom fields, nested under a module.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = CustomFieldFilter
    search_fields = ["field_name", "label"]
    ordering_fields = ["sort_order", "field_name"]
    ordering = ["sort_order"]

    def get_queryset(self):
        return CustomField.objects.filter(
            module_id=self.kwargs["module_pk"]
        ).select_related("module")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CustomFieldWriteSerializer
        return CustomFieldSerializer

    def perform_create(self, serializer):
        serializer.save(module_id=self.kwargs["module_pk"])

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, module_pk=None):
        """Bulk reorder custom fields."""
        serializer = CustomFieldReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        field_ids = serializer.validated_data["field_ids"]
        fields = CustomField.objects.filter(module_id=module_pk, id__in=field_ids)
        field_map = {f.id: f for f in fields}

        for idx, field_id in enumerate(field_ids):
            if field_id in field_map:
                field_map[field_id].sort_order = idx
                field_map[field_id].save(update_fields=["sort_order", "updated_at"])

        return Response({"status": "reordered"}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Picklist ViewSet
# ---------------------------------------------------------------------------
class PicklistViewSet(viewsets.ModelViewSet):
    """
    CRUD for picklists.
    System picklists cannot be deleted.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = PicklistFilter
    search_fields = ["name", "label"]
    ordering_fields = ["name", "label"]
    ordering = ["name"]

    def get_queryset(self):
        return Picklist.objects.select_related("module").prefetch_related("values")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PicklistWriteSerializer
        return PicklistSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {"detail": "System picklists cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="reorder-values")
    def reorder_values(self, request, pk=None):
        """Bulk reorder picklist values."""
        serializer = PicklistValueReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        value_ids = serializer.validated_data["value_ids"]
        values = PicklistValue.objects.filter(picklist_id=pk, id__in=value_ids)
        value_map = {v.id: v for v in values}

        for idx, value_id in enumerate(value_ids):
            if value_id in value_map:
                value_map[value_id].sort_order = idx
                value_map[value_id].save(update_fields=["sort_order", "updated_at"])

        # Invalidate picklist values cache
        picklist = self.get_object()
        module_name = picklist.module.name if picklist.module else "global"
        cache.delete(f"picklist_values_{picklist.name}_{module_name}")

        return Response({"status": "reordered"}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Picklist Value ViewSet (nested under picklist)
# ---------------------------------------------------------------------------
class PicklistValueViewSet(viewsets.ModelViewSet):
    """
    CRUD for picklist values, nested under a picklist.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = PicklistValueFilter
    ordering_fields = ["sort_order", "value"]
    ordering = ["sort_order", "value"]

    def get_queryset(self):
        return PicklistValue.objects.filter(picklist_id=self.kwargs["picklist_pk"])

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PicklistValueWriteSerializer
        return PicklistValueSerializer

    def perform_create(self, serializer):
        serializer.save(picklist_id=self.kwargs["picklist_pk"])

    def perform_update(self, serializer):
        instance = serializer.save()
        # Invalidate cache
        picklist = instance.picklist
        module_name = picklist.module.name if picklist.module else "global"
        cache.delete(f"picklist_values_{picklist.name}_{module_name}")

    def perform_destroy(self, instance):
        picklist = instance.picklist
        module_name = picklist.module.name if picklist.module else "global"
        cache.delete(f"picklist_values_{picklist.name}_{module_name}")
        instance.delete()


# ---------------------------------------------------------------------------
# Field Label ViewSet (nested under module)
# ---------------------------------------------------------------------------
class FieldLabelViewSet(viewsets.ModelViewSet):
    """
    CRUD for field label overrides, nested under a module.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = None
    filterset_class = FieldLabelFilter
    ordering_fields = ["field_name", "language"]
    ordering = ["field_name"]

    def get_queryset(self):
        return FieldLabel.objects.filter(
            module_id=self.kwargs["module_pk"]
        ).select_related("module")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FieldLabelWriteSerializer
        return FieldLabelSerializer

    def perform_create(self, serializer):
        serializer.save(module_id=self.kwargs["module_pk"])
