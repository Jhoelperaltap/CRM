import django_filters

from apps.workflows.models import WorkflowExecutionLog, WorkflowRule


class WorkflowRuleFilter(django_filters.FilterSet):
    trigger_type = django_filters.CharFilter(field_name="trigger_type")
    action_type = django_filters.CharFilter(field_name="action_type")
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = WorkflowRule
        fields = []


class WorkflowExecutionLogFilter(django_filters.FilterSet):
    rule = django_filters.UUIDFilter(field_name="rule")
    result = django_filters.CharFilter(field_name="result")
    trigger_object_type = django_filters.CharFilter(field_name="trigger_object_type")
    date_from = django_filters.DateTimeFilter(
        field_name="triggered_at", lookup_expr="gte"
    )
    date_to = django_filters.DateTimeFilter(
        field_name="triggered_at", lookup_expr="lte"
    )

    class Meta:
        model = WorkflowExecutionLog
        fields = []
