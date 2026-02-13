import django_filters

from apps.audit.models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    module = django_filters.CharFilter(field_name="module", lookup_expr="exact")
    action = django_filters.CharFilter(field_name="action", lookup_expr="exact")
    user = django_filters.UUIDFilter(field_name="user__id")
    date_from = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")
    object_id = django_filters.CharFilter(field_name="object_id", lookup_expr="exact")

    class Meta:
        model = AuditLog
        fields = ["module", "action", "user", "date_from", "date_to", "object_id"]
