from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import ModulePermissionViewSet, RoleViewSet

app_name = "roles"

router = DefaultRouter()
router.register("", RoleViewSet, basename="role")

# Nested route: /api/v1/roles/<role_pk>/permissions/
# Falls back to a manual path if drf-nested-routers is not installed.
try:
    from rest_framework_nested.routers import NestedDefaultRouter

    permissions_router = NestedDefaultRouter(router, "", lookup="role")
    permissions_router.register(
        "permissions",
        ModulePermissionViewSet,
        basename="role-permissions",
    )
    nested_urls = permissions_router.urls
except ImportError:
    # Fallback without drf-nested-routers
    nested_urls = [
        path(
            "<uuid:role_pk>/permissions/",
            ModulePermissionViewSet.as_view({"get": "list"}),
            name="role-permissions-list",
        ),
        path(
            "<uuid:role_pk>/permissions/<uuid:pk>/",
            ModulePermissionViewSet.as_view({"put": "update"}),
            name="role-permissions-detail",
        ),
    ]

urlpatterns = [
    path("", include(router.urls)),
] + nested_urls
