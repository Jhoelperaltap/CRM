import django_filters

from apps.portal.models import PortalDocumentUpload, PortalMessage


class PortalDocumentUploadFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=PortalDocumentUpload.Status.choices)
    contact = django_filters.UUIDFilter(field_name="contact_id")
    created_after = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte"
    )

    class Meta:
        model = PortalDocumentUpload
        fields = ["status", "contact", "created_after", "created_before"]


class PortalMessageFilter(django_filters.FilterSet):
    contact = django_filters.UUIDFilter(field_name="contact_id")
    is_read = django_filters.BooleanFilter()
    message_type = django_filters.ChoiceFilter(
        choices=PortalMessage.MessageType.choices
    )
    created_after = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte"
    )

    class Meta:
        model = PortalMessage
        fields = ["contact", "is_read", "message_type", "created_after", "created_before"]
