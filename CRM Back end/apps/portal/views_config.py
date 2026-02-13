from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import IsAdminRole
from apps.portal.models import PortalConfiguration
from apps.portal.serializers_config import (
    PortalConfigurationDetailSerializer,
    PortalConfigurationCreateUpdateSerializer,
)


class PortalConfigurationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Portal Configuration.

    Endpoints
    ---------
    GET    /                     list all configurations
    POST   /                     create new configuration
    GET    /{id}/                retrieve configuration
    PUT    /{id}/                full update
    PATCH  /{id}/                partial update
    DELETE /{id}/                destroy
    GET    /active/              get the current active configuration
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    ordering = ["-is_active", "-created_at"]

    def get_queryset(self):
        return PortalConfiguration.objects.prefetch_related(
            "menu_items",
            "shortcuts",
            "field_configs",
        ).select_related("default_assignee")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PortalConfigurationCreateUpdateSerializer
        return PortalConfigurationDetailSerializer

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        """Return the currently active portal configuration."""
        config = self.get_queryset().filter(is_active=True).first()
        if not config:
            return Response(
                {"detail": "No active portal configuration found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PortalConfigurationDetailSerializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="default-menu-items")
    def default_menu_items(self, request):
        """Return the list of available modules for the portal menu."""
        modules = [
            {"module_name": "home", "label": "Home", "is_enabled": True},
            {"module_name": "faq", "label": "FAQ", "is_enabled": True},
            {"module_name": "invoices", "label": "Invoices", "is_enabled": True},
            {"module_name": "quotes", "label": "Quotes", "is_enabled": True},
            {"module_name": "products", "label": "Products", "is_enabled": True},
            {"module_name": "services", "label": "Services", "is_enabled": True},
            {"module_name": "documents", "label": "Documents", "is_enabled": True},
            {"module_name": "assets", "label": "Assets", "is_enabled": True},
            {"module_name": "project_milestones", "label": "Project Milestones", "is_enabled": True},
            {"module_name": "projects", "label": "Projects", "is_enabled": True},
            {"module_name": "service_contracts", "label": "Service Contracts", "is_enabled": True},
            {"module_name": "cases", "label": "Cases", "is_enabled": True},
            {"module_name": "tasks", "label": "Tasks", "is_enabled": False},
            {"module_name": "deals", "label": "Deals", "is_enabled": False},
            {"module_name": "purchase_orders", "label": "Purchase Orders", "is_enabled": False},
            {"module_name": "sales_orders", "label": "Sales Orders", "is_enabled": False},
            {"module_name": "campaigns", "label": "Campaigns", "is_enabled": False},
            {"module_name": "vendors", "label": "Vendors", "is_enabled": False},
            {"module_name": "work_orders", "label": "Work Orders", "is_enabled": False},
            {"module_name": "esign_documents", "label": "Esign Documents", "is_enabled": False},
            {"module_name": "live_chats", "label": "Live Chats", "is_enabled": False},
            {"module_name": "payments", "label": "Payments", "is_enabled": False},
        ]
        return Response(modules)

    @action(detail=False, methods=["get"], url_path="default-field-configs")
    def default_field_configs(self, request):
        """Return default field configurations for Contacts and Organizations."""
        fields = {
            "contacts": [
                {"field_name": "first_name", "field_label": "First Name", "permission": "read_write", "is_mandatory": True},
                {"field_name": "last_name", "field_label": "Last Name", "permission": "read_write", "is_mandatory": True},
                {"field_name": "primary_email", "field_label": "Primary Email", "permission": "read_only", "is_mandatory": False},
                {"field_name": "secondary_email", "field_label": "Secondary Email", "permission": "read_write", "is_mandatory": False},
                {"field_name": "mobile_phone", "field_label": "Mobile Phone", "permission": "read_write", "is_mandatory": False},
                {"field_name": "office_phone", "field_label": "Office Phone", "permission": "read_write", "is_mandatory": False},
                {"field_name": "language", "field_label": "Language", "permission": "read_write", "is_mandatory": False},
            ],
            "organizations": [
                {"field_name": "name", "field_label": "Organization Name", "permission": "read_only", "is_mandatory": True},
                {"field_name": "website", "field_label": "Website", "permission": "read_write", "is_mandatory": False},
                {"field_name": "phone", "field_label": "Phone", "permission": "read_write", "is_mandatory": False},
                {"field_name": "address", "field_label": "Address", "permission": "read_write", "is_mandatory": False},
            ],
        }
        return Response(fields)
