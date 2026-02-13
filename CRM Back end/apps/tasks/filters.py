import django_filters

from apps.tasks.models import Task


class TaskFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    priority = django_filters.CharFilter(field_name="priority", lookup_expr="exact")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__id")
    case = django_filters.UUIDFilter(field_name="case__id")
    contact = django_filters.UUIDFilter(field_name="contact__id")
    due_before = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_after = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")

    class Meta:
        model = Task
        fields = [
            "status",
            "priority",
            "assigned_to",
            "case",
            "contact",
            "due_before",
            "due_after",
        ]
