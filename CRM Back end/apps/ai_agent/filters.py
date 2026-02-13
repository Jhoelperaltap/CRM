"""
Django filter classes for the AI Agent system.
"""

import django_filters

from apps.ai_agent.models import AgentAction, AgentInsight, AgentLog


class AgentActionFilter(django_filters.FilterSet):
    """Filter for agent actions."""

    action_type = django_filters.ChoiceFilter(choices=AgentAction.ActionType.choices)
    status = django_filters.ChoiceFilter(choices=AgentAction.Status.choices)
    requires_approval = django_filters.BooleanFilter()

    created_after = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )

    has_outcome = django_filters.BooleanFilter(
        field_name="outcome_score",
        lookup_expr="isnull",
        exclude=True,
    )

    related_contact = django_filters.UUIDFilter(field_name="related_contact__id")
    related_case = django_filters.UUIDFilter(field_name="related_case__id")
    related_task = django_filters.UUIDFilter(field_name="related_task__id")
    related_appointment = django_filters.UUIDFilter(field_name="related_appointment__id")

    class Meta:
        model = AgentAction
        fields = [
            "action_type",
            "status",
            "requires_approval",
            "created_after",
            "created_before",
            "has_outcome",
            "related_contact",
            "related_case",
            "related_task",
            "related_appointment",
        ]


class AgentLogFilter(django_filters.FilterSet):
    """Filter for agent logs."""

    level = django_filters.ChoiceFilter(choices=AgentLog.LogLevel.choices)
    component = django_filters.CharFilter(lookup_expr="iexact")

    created_after = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )

    has_tokens = django_filters.BooleanFilter(
        field_name="tokens_used",
        lookup_expr="isnull",
        exclude=True,
    )

    action = django_filters.UUIDFilter(field_name="action__id")

    class Meta:
        model = AgentLog
        fields = [
            "level",
            "component",
            "created_after",
            "created_before",
            "has_tokens",
            "action",
        ]


class AgentInsightFilter(django_filters.FilterSet):
    """Filter for agent insights."""

    insight_type = django_filters.ChoiceFilter(choices=AgentInsight.InsightType.choices)
    priority = django_filters.NumberFilter()
    priority_min = django_filters.NumberFilter(
        field_name="priority",
        lookup_expr="gte",
    )
    is_actionable = django_filters.BooleanFilter()
    is_acknowledged = django_filters.BooleanFilter()

    created_after = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )

    class Meta:
        model = AgentInsight
        fields = [
            "insight_type",
            "priority",
            "priority_min",
            "is_actionable",
            "is_acknowledged",
            "created_after",
            "created_before",
        ]
