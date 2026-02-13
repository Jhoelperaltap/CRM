import django_filters

from apps.contacts.models import Contact, ContactStar


class ContactFilter(django_filters.FilterSet):
    """
    FilterSet for the Contact model.

    Supported query parameters
    --------------------------
    - ``status``           exact match (active / inactive / lead)
    - ``assigned_to``      exact UUID of the assigned user
    - ``corporation``      exact UUID of the linked corporation
    - ``created_after``    contacts created on or after this date
    - ``created_before``   contacts created on or before this date
    - ``is_starred``       boolean -- filters to contacts the requesting
                           user has starred (true) or not starred (false)

    Text search on first_name, last_name, email, and phone is handled by
    DRF's ``SearchFilter`` backend (configured in the viewset).
    """

    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__id")
    corporation = django_filters.UUIDFilter(field_name="corporation__id")
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    is_starred = django_filters.BooleanFilter(method="filter_is_starred")

    class Meta:
        model = Contact
        fields = [
            "status",
            "assigned_to",
            "corporation",
            "created_after",
            "created_before",
            "is_starred",
        ]

    def filter_is_starred(self, queryset, name, value):
        """
        When ``is_starred=true``, return only contacts that the requesting
        user has starred.  When ``is_starred=false``, return contacts the
        user has *not* starred.
        """
        request = self.request
        if not request or not request.user.is_authenticated:
            return queryset

        starred_ids = ContactStar.objects.filter(
            user=request.user,
        ).values_list("contact_id", flat=True)

        if value:
            return queryset.filter(id__in=starred_ids)
        return queryset.exclude(id__in=starred_ids)
