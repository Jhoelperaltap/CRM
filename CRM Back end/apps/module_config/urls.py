from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.module_config.views import (
    CRMModuleViewSet,
    CustomFieldViewSet,
    FieldLabelViewSet,
    PicklistValueViewSet,
    PicklistViewSet,
)

# Main router
router = DefaultRouter()
router.register(r"modules", CRMModuleViewSet, basename="crmmodule")
router.register(r"picklists", PicklistViewSet, basename="picklist")

# Nested routes for custom fields under modules
custom_field_list = CustomFieldViewSet.as_view({"get": "list", "post": "create"})
custom_field_detail = CustomFieldViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)
custom_field_reorder = CustomFieldViewSet.as_view({"post": "reorder"})

# Nested routes for field labels under modules
field_label_list = FieldLabelViewSet.as_view({"get": "list", "post": "create"})
field_label_detail = FieldLabelViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

# Nested routes for picklist values under picklists
picklist_value_list = PicklistValueViewSet.as_view({"get": "list", "post": "create"})
picklist_value_detail = PicklistValueViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

urlpatterns = [
    path("", include(router.urls)),
    # Nested: /modules/{module_pk}/fields/
    path(
        "modules/<uuid:module_pk>/fields/",
        custom_field_list,
        name="customfield-list",
    ),
    path(
        "modules/<uuid:module_pk>/fields/<uuid:pk>/",
        custom_field_detail,
        name="customfield-detail",
    ),
    path(
        "modules/<uuid:module_pk>/fields/reorder/",
        custom_field_reorder,
        name="customfield-reorder",
    ),
    # Nested: /modules/{module_pk}/labels/
    path(
        "modules/<uuid:module_pk>/labels/",
        field_label_list,
        name="fieldlabel-list",
    ),
    path(
        "modules/<uuid:module_pk>/labels/<uuid:pk>/",
        field_label_detail,
        name="fieldlabel-detail",
    ),
    # Nested: /picklists/{picklist_pk}/values/
    path(
        "picklists/<uuid:picklist_pk>/values/",
        picklist_value_list,
        name="picklistvalue-list",
    ),
    path(
        "picklists/<uuid:picklist_pk>/values/<uuid:pk>/",
        picklist_value_detail,
        name="picklistvalue-detail",
    ),
]
