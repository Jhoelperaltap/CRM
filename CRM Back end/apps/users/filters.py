import django_filters

from apps.users.models import User


class UserFilter(django_filters.FilterSet):
    """
    FilterSet for the User model.
    Supports filtering by role (UUID), role slug, and active status.
    """

    role = django_filters.UUIDFilter(field_name="role__id")
    role_slug = django_filters.CharFilter(field_name="role__slug", lookup_expr="exact")
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = User
        fields = ["role", "role_slug", "is_active"]
