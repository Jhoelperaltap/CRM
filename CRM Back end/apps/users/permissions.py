from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.users.models import ModulePermission as ModulePermissionModel
from apps.users.models import Role

# Map custom action names to permission fields
ACTION_PERM_MAP = {
    "export": "can_export",
    "import": "can_import",
}


def has_action_permission(user, module_name, action_name):
    """
    Check whether *user* has the named action permission on *module_name*.
    Useful for export / import custom actions.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if user.role and user.role.slug == Role.RoleSlug.ADMIN:
        return True

    perm_field = ACTION_PERM_MAP.get(action_name)
    if perm_field is None:
        return False

    try:
        perm = ModulePermissionModel.objects.get(role=user.role, module=module_name)
    except ModulePermissionModel.DoesNotExist:
        return False

    return getattr(perm, perm_field, False)


class ModulePermission(BasePermission):
    """
    Checks the requesting user's role-level permission for the module
    identified by ``view.module_name``.

    HTTP method mapping:
        GET / HEAD / OPTIONS  -> can_view
        POST                  -> can_create
        PUT / PATCH           -> can_edit
        DELETE                -> can_delete

    Admin role bypasses all checks.
    """

    # Map HTTP methods to the boolean field on ModulePermission
    METHOD_PERM_MAP = {
        "GET": "can_view",
        "HEAD": "can_view",
        "OPTIONS": "can_view",
        "POST": "can_create",
        "PUT": "can_edit",
        "PATCH": "can_edit",
        "DELETE": "can_delete",
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Superuser always passes
        if user.is_superuser:
            return True

        # Admin role bypasses module-level checks
        if user.role and user.role.slug == Role.RoleSlug.ADMIN:
            return True

        module_name = getattr(view, "module_name", None)
        if module_name is None:
            # If the view does not declare a module, deny by default.
            return False

        # Check if the module is active
        from apps.module_config.services import is_module_active

        if not is_module_active(module_name):
            return False

        perm_field = self.METHOD_PERM_MAP.get(request.method)
        if perm_field is None:
            return False

        try:
            perm = ModulePermissionModel.objects.get(
                role=user.role,
                module=module_name,
            )
        except ModulePermissionModel.DoesNotExist:
            return False

        return getattr(perm, perm_field, False)


class IsAdminRole(BasePermission):
    """
    Allows access only to users whose role slug is ``admin``
    or who are Django superusers.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.role and user.role.slug == Role.RoleSlug.ADMIN
