import django_filters

from apps.corporations.models import Corporation


class CorporationFilter(django_filters.FilterSet):
    """
    FilterSet for the Corporation model.

    Supported query parameters:
        - entity_type  (exact match)
        - status       (exact match)
        - assigned_to  (exact UUID match)
        - search       (handled via SearchFilter on the viewset)
    """

    entity_type = django_filters.CharFilter(
        field_name="entity_type",
        lookup_expr="exact",
    )
    status = django_filters.CharFilter(
        field_name="status",
        lookup_expr="exact",
    )
    assigned_to = django_filters.UUIDFilter(
        field_name="assigned_to__id",
    )

    class Meta:
        model = Corporation
        fields = ["entity_type", "status", "assigned_to"]
