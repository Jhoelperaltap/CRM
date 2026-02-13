import django_filters

from apps.module_config.models import (
    CRMModule,
    CustomField,
    FieldLabel,
    Picklist,
    PicklistValue,
)


class CRMModuleFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = CRMModule
        fields = ["is_active"]


class CustomFieldFilter(django_filters.FilterSet):
    field_type = django_filters.CharFilter(field_name="field_type", lookup_expr="exact")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    section = django_filters.CharFilter(field_name="section", lookup_expr="exact")

    class Meta:
        model = CustomField
        fields = ["field_type", "is_active", "section"]


class PicklistFilter(django_filters.FilterSet):
    module = django_filters.UUIDFilter(field_name="module__id")
    module_name = django_filters.CharFilter(field_name="module__name")
    is_system = django_filters.BooleanFilter(field_name="is_system")

    class Meta:
        model = Picklist
        fields = ["module", "module_name", "is_system"]


class PicklistValueFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = PicklistValue
        fields = ["is_active"]


class FieldLabelFilter(django_filters.FilterSet):
    language = django_filters.CharFilter(field_name="language", lookup_expr="exact")

    class Meta:
        model = FieldLabel
        fields = ["language"]
