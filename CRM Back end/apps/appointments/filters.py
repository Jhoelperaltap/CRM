import django_filters

from apps.appointments.models import Appointment


class AppointmentFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__id")
    contact = django_filters.UUIDFilter(field_name="contact__id")
    case = django_filters.UUIDFilter(field_name="case__id")
    date_from = django_filters.DateTimeFilter(field_name="start_datetime", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="start_datetime", lookup_expr="lte")
    assigned_to__in = django_filters.BaseInFilter(
        field_name="assigned_to__id", lookup_expr="in"
    )
    recurrence_pattern = django_filters.CharFilter(
        field_name="recurrence_pattern", lookup_expr="exact"
    )

    class Meta:
        model = Appointment
        fields = []
