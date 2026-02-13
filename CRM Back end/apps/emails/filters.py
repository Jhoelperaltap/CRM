import django_filters
from django.db import models

from apps.emails.models import EmailMessage, EmailSyncLog, EmailThread


class EmailMessageFilter(django_filters.FilterSet):
    folder = django_filters.CharFilter(field_name="folder")
    direction = django_filters.CharFilter(field_name="direction")
    is_read = django_filters.BooleanFilter(field_name="is_read")
    is_starred = django_filters.BooleanFilter(field_name="is_starred")
    contact = django_filters.UUIDFilter(field_name="contact")
    case = django_filters.UUIDFilter(field_name="case")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to")
    account = django_filters.UUIDFilter(field_name="account")
    date_from = django_filters.DateTimeFilter(field_name="sent_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="sent_at", lookup_expr="lte")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = EmailMessage
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(subject__icontains=value)
            | models.Q(from_address__icontains=value)
            | models.Q(body_text__icontains=value)
        )


class EmailThreadFilter(django_filters.FilterSet):
    contact = django_filters.UUIDFilter(field_name="contact")
    case = django_filters.UUIDFilter(field_name="case")
    is_archived = django_filters.BooleanFilter(field_name="is_archived")

    class Meta:
        model = EmailThread
        fields = []


class EmailSyncLogFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="account")
    status = django_filters.CharFilter(field_name="status")
    date_from = django_filters.DateTimeFilter(field_name="started_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="started_at", lookup_expr="lte")

    class Meta:
        model = EmailSyncLog
        fields = []
