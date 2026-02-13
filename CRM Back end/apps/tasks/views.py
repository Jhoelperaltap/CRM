from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.tasks.filters import TaskFilter
from apps.tasks.models import Task
from apps.tasks.serializers import (
    TaskCreateUpdateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
)
from apps.users.permissions import ModulePermission


class TaskViewSet(viewsets.ModelViewSet):
    """CRUD for tasks."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "tasks"
    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["title", "priority", "status", "due_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Task.objects.select_related(
                "assigned_to", "created_by", "case", "contact"
            ).all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return TaskListSerializer
        if self.action in ("create", "update", "partial_update"):
            return TaskCreateUpdateSerializer
        return TaskDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
