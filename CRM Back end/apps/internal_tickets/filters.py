import django_filters

from apps.internal_tickets.models import InternalTicket


class InternalTicketFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    priority = django_filters.CharFilter(field_name="priority", lookup_expr="exact")
    category = django_filters.CharFilter(field_name="category", lookup_expr="exact")
    channel = django_filters.CharFilter(field_name="channel", lookup_expr="exact")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__id")
    employee = django_filters.UUIDFilter(field_name="employee__id")
    group = django_filters.UUIDFilter(field_name="group__id")
    created_by = django_filters.UUIDFilter(field_name="created_by__id")

    class Meta:
        model = InternalTicket
        fields = [
            "status",
            "priority",
            "category",
            "channel",
            "assigned_to",
            "employee",
            "group",
            "created_by",
        ]
