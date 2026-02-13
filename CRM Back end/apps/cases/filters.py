import django_filters

from apps.cases.models import TaxCase


class TaxCaseFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    case_type = django_filters.CharFilter(field_name="case_type", lookup_expr="exact")
    priority = django_filters.CharFilter(field_name="priority", lookup_expr="exact")
    fiscal_year = django_filters.NumberFilter(field_name="fiscal_year")
    assigned_preparer = django_filters.UUIDFilter(field_name="assigned_preparer__id")
    contact = django_filters.UUIDFilter(field_name="contact__id")
    corporation = django_filters.UUIDFilter(field_name="corporation__id")
    due_after = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")
    due_before = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")

    class Meta:
        model = TaxCase
        fields = [
            "status",
            "case_type",
            "priority",
            "fiscal_year",
            "assigned_preparer",
            "contact",
            "corporation",
            "due_after",
            "due_before",
        ]
