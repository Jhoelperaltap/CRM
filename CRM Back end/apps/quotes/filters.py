import django_filters

from apps.quotes.models import Quote


class QuoteFilter(django_filters.FilterSet):
    stage = django_filters.CharFilter(field_name="stage", lookup_expr="exact")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__id")
    contact = django_filters.UUIDFilter(field_name="contact__id")
    corporation = django_filters.UUIDFilter(field_name="corporation__id")
    valid_after = django_filters.DateFilter(field_name="valid_until", lookup_expr="gte")
    valid_before = django_filters.DateFilter(
        field_name="valid_until", lookup_expr="lte"
    )

    class Meta:
        model = Quote
        fields = [
            "stage",
            "assigned_to",
            "contact",
            "corporation",
            "valid_after",
            "valid_before",
        ]
