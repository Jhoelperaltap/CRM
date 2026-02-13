"""
IDOR (Insecure Direct Object Reference) protection permissions.

Security: These permissions ensure that users can only access resources
they own or have explicit permission to access, preventing unauthorized
access to other users' data by manipulating IDs in URLs.
"""

from rest_framework.permissions import BasePermission


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission to only allow owners or admins to access an object.

    Assumes the model instance has an `owner` or `user` or `created_by` field.
    Admin users and superusers bypass this check.

    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
            owner_field = 'user'  # Optional: specify the owner field name
    """

    # Common field names for ownership
    OWNER_FIELDS = ["owner", "user", "created_by", "uploaded_by", "assigned_to"]

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Superusers and admins bypass IDOR checks
        if user.is_superuser:
            return True

        from apps.users.models import Role

        if user.role and user.role.slug == Role.RoleSlug.ADMIN:
            return True

        # Get the owner field name from the view or use defaults
        owner_field = getattr(view, "owner_field", None)

        if owner_field:
            owner = getattr(obj, owner_field, None)
            return owner == user

        # Try common field names
        for field_name in self.OWNER_FIELDS:
            if hasattr(obj, field_name):
                owner = getattr(obj, field_name, None)
                if owner == user:
                    return True
                elif owner is not None:
                    # Field exists but user doesn't match
                    return False

        # If no owner field found, deny access by default
        return False


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission that allows:
    - Read access (GET, HEAD, OPTIONS) to anyone authenticated
    - Write access (POST, PUT, PATCH, DELETE) only to owners

    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    """

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
    OWNER_FIELDS = ["owner", "user", "created_by", "uploaded_by", "assigned_to"]

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in self.SAFE_METHODS:
            return True

        user = request.user

        # Superusers and admins can write
        if user.is_superuser:
            return True

        from apps.users.models import Role

        if user.role and user.role.slug == Role.RoleSlug.ADMIN:
            return True

        # Check ownership for write operations
        owner_field = getattr(view, "owner_field", None)

        if owner_field:
            owner = getattr(obj, owner_field, None)
            return owner == user

        for field_name in self.OWNER_FIELDS:
            if hasattr(obj, field_name):
                owner = getattr(obj, field_name, None)
                if owner == user:
                    return True
                elif owner is not None:
                    return False

        return False


class HasRelatedObjectAccess(BasePermission):
    """
    Checks that the user has access to related objects.

    This prevents IDOR attacks where a user creates resources linked to
    objects they don't own (e.g., creating a note on someone else's case).

    Usage:
        class NoteViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HasRelatedObjectAccess]
            related_object_checks = [
                ("case", "apps.cases.models.TaxCase", "user"),
                ("contact", "apps.contacts.models.Contact", "owner"),
            ]
    """

    def has_permission(self, request, view):
        if request.method not in ("POST", "PUT", "PATCH"):
            return True

        user = request.user

        # Superusers bypass
        if user.is_superuser:
            return True

        from apps.users.models import Role

        if user.role and user.role.slug == Role.RoleSlug.ADMIN:
            return True

        related_checks = getattr(view, "related_object_checks", [])

        for field_name, model_path, owner_field in related_checks:
            related_id = request.data.get(field_name)
            if related_id:
                # Import the model dynamically
                module_path, model_name = model_path.rsplit(".", 1)
                module = __import__(module_path, fromlist=[model_name])
                model_class = getattr(module, model_name)

                try:
                    related_obj = model_class.objects.get(pk=related_id)
                    owner = getattr(related_obj, owner_field, None)
                    if owner != user:
                        return False
                except model_class.DoesNotExist:
                    # Object doesn't exist - let serializer handle validation
                    pass

        return True


class CanAccessContact(BasePermission):
    """
    Specific permission for contact access based on sharing rules.

    Contacts can be accessed if:
    - User owns the contact
    - User is assigned to the contact
    - Contact is shared with user's team/group
    - User has admin role
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.is_superuser:
            return True

        from apps.users.models import Role

        if user.role and user.role.slug == Role.RoleSlug.ADMIN:
            return True

        # Owner check
        if getattr(obj, "owner", None) == user:
            return True

        # Assigned to check
        if getattr(obj, "assigned_to", None) == user:
            return True

        # Check if contact is shared with user's groups
        # This would require a sharing model - implement if needed

        return False


class CanAccessCase(BasePermission):
    """
    Specific permission for case access.

    Cases can be accessed if:
    - User owns the case
    - User is assigned as preparer
    - User is assigned as reviewer
    - Case is in user's team
    - User has admin/manager role
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.is_superuser:
            return True

        from apps.users.models import Role

        if user.role and user.role.slug in [
            Role.RoleSlug.ADMIN,
            Role.RoleSlug.MANAGER,
        ]:
            return True

        # Owner/created_by check
        if getattr(obj, "created_by", None) == user:
            return True

        # Assigned preparer
        if getattr(obj, "assigned_preparer", None) == user:
            return True

        # Assigned reviewer
        if getattr(obj, "assigned_reviewer", None) == user:
            return True

        return False


class CanAccessDocument(BasePermission):
    """
    Specific permission for document access.

    Documents can be accessed if:
    - User uploaded the document
    - User has access to the related contact/case/corporation
    - User has admin role
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.is_superuser:
            return True

        from apps.users.models import Role

        if user.role and user.role.slug == Role.RoleSlug.ADMIN:
            return True

        # Uploader check
        if getattr(obj, "uploaded_by", None) == user:
            return True

        # Check access to related objects
        contact = getattr(obj, "contact", None)
        if contact and getattr(contact, "owner", None) == user:
            return True

        case = getattr(obj, "case", None)
        if case:
            if getattr(case, "created_by", None) == user:
                return True
            if getattr(case, "assigned_preparer", None) == user:
                return True
            if getattr(case, "assigned_reviewer", None) == user:
                return True

        return False
