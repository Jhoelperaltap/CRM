import django_filters
from django.db.models import Q

from apps.contacts.models import Contact, ContactStar


class ContactFilter(django_filters.FilterSet):
    """
    FilterSet for the Contact model.

    Supported query parameters
    --------------------------
    - ``status``           exact match (active / inactive / lead)
    - ``assigned_to``      exact UUID of the assigned user
    - ``corporation``      exact UUID of linked corporation (searches M2M)
    - ``created_after``    contacts created on or after this date
    - ``created_before``   contacts created on or before this date
    - ``is_starred``       boolean -- filters to contacts the requesting
                           user has starred (true) or not starred (false)
    - ``search``           text search with related contacts included
    - ``include_related``  if true, includes contacts from same corporation
    """

    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__id")
    # Use M2M corporations field to find all contacts linked to a corporation
    corporation = django_filters.UUIDFilter(field_name="corporations__id")
    # Filter by reports_to (find contacts that report to a specific contact)
    reports_to = django_filters.UUIDFilter(field_name="reports_to__id")
    # Filter by office services
    office_services = django_filters.CharFilter(
        field_name="office_services", lookup_expr="iexact"
    )
    created_after = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date__gte"
    )
    created_before = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date__lte"
    )
    is_starred = django_filters.BooleanFilter(method="filter_is_starred")
    # Custom search filter with related contacts
    search = django_filters.CharFilter(method="filter_search_with_related")
    include_related = django_filters.BooleanFilter(method="filter_noop")

    class Meta:
        model = Contact
        fields = [
            "status",
            "assigned_to",
            "corporation",
            "reports_to",
            "office_services",
            "created_after",
            "created_before",
            "is_starred",
            "search",
            "include_related",
        ]

    def filter_noop(self, queryset, name, value):
        """No-op filter, handled by filter_search_with_related."""
        return queryset

    def filter_search_with_related(self, queryset, name, value):
        """
        Search contacts by name, email, phone, or corporation name.
        If include_related=true, also include contacts that share corporations
        or are linked via reports_to.
        """
        if not value or len(value) < 2:
            return queryset

        include_related = self.data.get("include_related", "").lower() == "true"

        # Direct matches on contact fields and corporation name
        direct_q = (
            Q(first_name__icontains=value)
            | Q(last_name__icontains=value)
            | Q(email__icontains=value)
            | Q(phone__icontains=value)
            | Q(corporations__name__icontains=value)
            | Q(primary_corporation__name__icontains=value)
        )

        if not include_related:
            return queryset.filter(direct_q).distinct()

        # Find direct matches first
        direct_matches = queryset.filter(direct_q).distinct()
        direct_ids = set(direct_matches.values_list("id", flat=True))

        # Collect corporation IDs from direct matches
        corp_ids = set()
        for contact in direct_matches.prefetch_related("corporations"):
            if contact.primary_corporation_id:
                corp_ids.add(contact.primary_corporation_id)
            for corp in contact.corporations.all():
                corp_ids.add(corp.id)

        # Also find corporations by name directly
        from apps.corporations.models import Corporation

        matching_corps = Corporation.objects.filter(
            Q(name__icontains=value) | Q(legal_name__icontains=value)
        )
        for corp in matching_corps:
            corp_ids.add(corp.id)

        # Collect all related contact IDs
        all_contact_ids = set(direct_ids)

        # Add contacts that report to found contacts
        for contact in direct_matches:
            if contact.reports_to_id:
                all_contact_ids.add(contact.reports_to_id)

        # Add contacts that are reported to by found contacts
        reporting_ids = Contact.objects.filter(
            reports_to_id__in=direct_ids
        ).values_list("id", flat=True)
        all_contact_ids.update(reporting_ids)

        # Add all contacts from the same corporations
        if corp_ids:
            contacts_in_corps = Contact.objects.filter(
                Q(corporations__id__in=corp_ids)
                | Q(primary_corporation_id__in=corp_ids)
            ).values_list("id", flat=True)
            all_contact_ids.update(contacts_in_corps)

        return queryset.filter(id__in=all_contact_ids).distinct()

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
