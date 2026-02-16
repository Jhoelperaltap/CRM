import django_filters

from apps.documents.models import Document, DocumentLink


class DocumentFilter(django_filters.FilterSet):
    doc_type = django_filters.CharFilter(field_name="doc_type", lookup_expr="exact")
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    contact = django_filters.UUIDFilter(field_name="contact__id")
    corporation = django_filters.UUIDFilter(field_name="corporation__id")
    case = django_filters.UUIDFilter(field_name="case__id")
    folder = django_filters.UUIDFilter(field_name="folder__id")
    folder_null = django_filters.BooleanFilter(
        field_name="folder", lookup_expr="isnull"
    )
    tags = django_filters.UUIDFilter(field_name="tags__id")
    department_folder = django_filters.UUIDFilter(field_name="department_folder__id")

    class Meta:
        model = Document
        fields = [
            "doc_type",
            "status",
            "contact",
            "corporation",
            "case",
            "folder",
            "tags",
            "department_folder",
        ]


class DocumentLinkFilter(django_filters.FilterSet):
    folder = django_filters.UUIDFilter(field_name="folder__id")
    tags = django_filters.UUIDFilter(field_name="tags__id")
    contact = django_filters.UUIDFilter(field_name="contact__id")
    corporation = django_filters.UUIDFilter(field_name="corporation__id")
    case = django_filters.UUIDFilter(field_name="case__id")

    class Meta:
        model = DocumentLink
        fields = ["folder", "tags", "contact", "corporation", "case"]
