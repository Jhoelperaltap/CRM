from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsAdminRole
from apps.workflows.filters import WorkflowExecutionLogFilter, WorkflowRuleFilter
from apps.workflows.models import WorkflowExecutionLog, WorkflowRule
from apps.workflows.serializers import (
    WorkflowExecutionLogSerializer,
    WorkflowRuleSerializer,
)


class WorkflowRuleViewSet(viewsets.ModelViewSet):
    """CRUD for workflow automation rules (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = WorkflowRuleSerializer
    filterset_class = WorkflowRuleFilter
    search_fields = ["name", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return WorkflowRule.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class WorkflowExecutionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only execution log (admin only)."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = WorkflowExecutionLogSerializer
    filterset_class = WorkflowExecutionLogFilter
    ordering = ["-triggered_at"]

    def get_queryset(self):
        return WorkflowExecutionLog.objects.select_related("rule").all()
