from datetime import timedelta

from django.db import models
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Playbook,
    PlaybookExecution,
    PlaybookStep,
    PlaybookStepExecution,
    PlaybookTemplate,
)
from .serializers import (
    CompleteStepSerializer,
    PlaybookDetailSerializer,
    PlaybookExecutionDetailSerializer,
    PlaybookExecutionListSerializer,
    PlaybookListSerializer,
    PlaybookStepExecutionSerializer,
    PlaybookStepSerializer,
    PlaybookTemplateSerializer,
    StartPlaybookSerializer,
)


class PlaybookViewSet(viewsets.ModelViewSet):
    """ViewSet for managing playbooks"""

    queryset = Playbook.objects.prefetch_related("steps").all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ["playbook_type", "is_active", "trigger_type"]
    search_fields = ["name", "description"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PlaybookDetailSerializer
        return PlaybookListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Create a copy of this playbook"""
        playbook = self.get_object()
        steps = list(playbook.steps.all())

        # Create new playbook
        playbook.pk = None
        playbook.name = f"{playbook.name} (Copy)"
        playbook.times_started = 0
        playbook.times_completed = 0
        playbook.avg_completion_time = None
        playbook.created_by = request.user
        playbook.save()

        # Copy steps
        for step in steps:
            step.pk = None
            step.playbook = playbook
            step.save()

        return Response(
            PlaybookDetailSerializer(playbook).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start a playbook execution"""
        playbook = self.get_object()
        serializer = StartPlaybookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create execution
        steps = playbook.steps.filter(is_active=True).order_by("order")
        execution = PlaybookExecution.objects.create(
            playbook=playbook,
            contact_id=data.get("contact_id"),
            case_id=data.get("case_id"),
            corporation_id=data.get("corporation_id"),
            current_step=steps.first() if steps.exists() else None,
            total_steps=steps.count(),
            assigned_to_id=data.get("assigned_to_id"),
            started_by=request.user,
            notes=data.get("notes", ""),
            target_completion_date=(
                timezone.now().date() + timedelta(days=playbook.target_completion_days)
                if playbook.target_completion_days
                else None
            ),
        )

        # Create step executions
        for step in steps:
            PlaybookStepExecution.objects.create(
                execution=execution,
                step=step,
                assigned_to_id=data.get("assigned_to_id"),
            )

        # Update playbook stats
        playbook.times_started += 1
        playbook.save(update_fields=["times_started"])

        return Response(
            PlaybookExecutionDetailSerializer(execution).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get playbook statistics"""
        playbooks = Playbook.objects.filter(is_active=True)
        executions = PlaybookExecution.objects.all()

        return Response(
            {
                "total_playbooks": playbooks.count(),
                "active_executions": executions.filter(
                    status=PlaybookExecution.Status.IN_PROGRESS
                ).count(),
                "completed_this_month": executions.filter(
                    status=PlaybookExecution.Status.COMPLETED,
                    completed_at__month=timezone.now().month,
                ).count(),
                "avg_completion_rate": playbooks.aggregate(avg=Avg("times_completed"))[
                    "avg"
                ]
                or 0,
                "overdue_executions": sum(1 for e in executions if e.is_overdue),
            }
        )


class PlaybookStepViewSet(viewsets.ModelViewSet):
    """ViewSet for managing playbook steps"""

    queryset = PlaybookStep.objects.select_related("playbook").all()
    serializer_class = PlaybookStepSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["playbook", "step_type", "is_required", "is_active"]

    def get_queryset(self):
        queryset = super().get_queryset()
        playbook_id = self.request.query_params.get("playbook")
        if playbook_id:
            queryset = queryset.filter(playbook_id=playbook_id)
        return queryset

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        """Change step order"""
        step = self.get_object()
        new_order = request.data.get("order")

        if new_order is None:
            return Response(
                {"error": "Order is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Shift other steps
        if new_order < step.order:
            PlaybookStep.objects.filter(
                playbook=step.playbook,
                order__gte=new_order,
                order__lt=step.order,
            ).update(order=models.F("order") + 1)
        else:
            PlaybookStep.objects.filter(
                playbook=step.playbook,
                order__gt=step.order,
                order__lte=new_order,
            ).update(order=models.F("order") - 1)

        step.order = new_order
        step.save()

        return Response(PlaybookStepSerializer(step).data)


class PlaybookExecutionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing playbook executions"""

    queryset = (
        PlaybookExecution.objects.select_related(
            "playbook", "contact", "case", "corporation", "assigned_to", "current_step"
        )
        .prefetch_related("step_executions")
        .all()
    )
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        "playbook",
        "status",
        "assigned_to",
        "contact",
        "case",
        "corporation",
    ]
    ordering_fields = ["started_at", "target_completion_date"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PlaybookExecutionDetailSerializer
        return PlaybookExecutionListSerializer

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause the execution"""
        execution = self.get_object()
        if execution.status != PlaybookExecution.Status.IN_PROGRESS:
            return Response(
                {"error": "Can only pause in-progress executions"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        execution.status = PlaybookExecution.Status.PAUSED
        execution.paused_at = timezone.now()
        execution.save()

        return Response(PlaybookExecutionDetailSerializer(execution).data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume a paused execution"""
        execution = self.get_object()
        if execution.status != PlaybookExecution.Status.PAUSED:
            return Response(
                {"error": "Can only resume paused executions"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        execution.status = PlaybookExecution.Status.IN_PROGRESS
        execution.paused_at = None
        execution.save()

        return Response(PlaybookExecutionDetailSerializer(execution).data)

    @action(detail=True, methods=["post"])
    def abandon(self, request, pk=None):
        """Abandon the execution"""
        execution = self.get_object()
        if execution.status not in [
            PlaybookExecution.Status.IN_PROGRESS,
            PlaybookExecution.Status.PAUSED,
        ]:
            return Response(
                {"error": "Cannot abandon this execution"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        execution.status = PlaybookExecution.Status.ABANDONED
        execution.outcome = request.data.get("reason", "Abandoned by user")
        execution.save()

        return Response(PlaybookExecutionDetailSerializer(execution).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark execution as completed"""
        execution = self.get_object()
        execution.status = PlaybookExecution.Status.COMPLETED
        execution.completed_at = timezone.now()
        execution.outcome = request.data.get("outcome", "Completed")
        execution.outcome_notes = request.data.get("outcome_notes", "")
        execution.save()

        # Update playbook stats
        playbook = execution.playbook
        playbook.times_completed += 1

        # Calculate average completion time
        completed_executions = PlaybookExecution.objects.filter(
            playbook=playbook,
            status=PlaybookExecution.Status.COMPLETED,
            completed_at__isnull=False,
        )
        if completed_executions.exists():
            total_days = sum(
                (e.completed_at.date() - e.started_at.date()).days
                for e in completed_executions
            )
            playbook.avg_completion_time = total_days / completed_executions.count()

        playbook.save()

        return Response(PlaybookExecutionDetailSerializer(execution).data)

    @action(detail=False, methods=["get"])
    def my_executions(self, request):
        """Get executions assigned to the current user"""
        executions = self.queryset.filter(
            assigned_to=request.user,
            status=PlaybookExecution.Status.IN_PROGRESS,
        )
        return Response(PlaybookExecutionListSerializer(executions, many=True).data)

    @action(detail=False, methods=["get"])
    def overdue(self, request):
        """Get overdue executions"""
        executions = [e for e in self.queryset if e.is_overdue]
        return Response(PlaybookExecutionListSerializer(executions, many=True).data)


class PlaybookStepExecutionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing step executions"""

    queryset = PlaybookStepExecution.objects.select_related(
        "execution", "step", "assigned_to", "completed_by"
    ).all()
    serializer_class = PlaybookStepExecutionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["execution", "status", "assigned_to"]

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start working on a step"""
        step_execution = self.get_object()
        if step_execution.status != PlaybookStepExecution.Status.PENDING:
            return Response(
                {"error": "Step already started"}, status=status.HTTP_400_BAD_REQUEST
            )

        step_execution.status = PlaybookStepExecution.Status.IN_PROGRESS
        step_execution.started_at = timezone.now()
        step_execution.assigned_to = request.user
        step_execution.save()

        return Response(PlaybookStepExecutionSerializer(step_execution).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete a step"""
        step_execution = self.get_object()
        serializer = CompleteStepSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("skip"):
            step_execution.status = PlaybookStepExecution.Status.SKIPPED
        else:
            step_execution.status = PlaybookStepExecution.Status.COMPLETED

        step_execution.completed_at = timezone.now()
        step_execution.completed_by = request.user
        step_execution.notes = data.get("notes", "")
        step_execution.output_data = data.get("output_data", {})
        step_execution.save()

        # Update execution progress
        execution = step_execution.execution
        completed = execution.step_executions.filter(
            status__in=[
                PlaybookStepExecution.Status.COMPLETED,
                PlaybookStepExecution.Status.SKIPPED,
            ]
        ).count()
        execution.steps_completed = completed

        # Move to next step
        next_steps = execution.step_executions.filter(
            status=PlaybookStepExecution.Status.PENDING
        ).order_by("step__order")

        if next_steps.exists():
            execution.current_step = next_steps.first().step
        else:
            # All steps completed
            execution.current_step = None
            execution.status = PlaybookExecution.Status.COMPLETED
            execution.completed_at = timezone.now()

            # Update playbook stats
            playbook = execution.playbook
            playbook.times_completed += 1
            playbook.save(update_fields=["times_completed"])

        execution.save()

        return Response(PlaybookStepExecutionSerializer(step_execution).data)


class PlaybookTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing playbook templates"""

    queryset = PlaybookTemplate.objects.all()
    serializer_class = PlaybookTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "is_system", "is_public"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Show public templates or user's own templates
        return queryset.filter(
            models.Q(is_public=True) | models.Q(created_by=self.request.user)
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def create_playbook(self, request, pk=None):
        """Create a playbook from this template"""
        template = self.get_object()
        data = template.playbook_data

        # Create playbook
        playbook = Playbook.objects.create(
            name=data.get("name", template.name),
            description=data.get("description", template.description),
            playbook_type=data.get("type", Playbook.PlaybookType.CUSTOM),
            trigger_type=data.get("trigger_type", Playbook.TriggerType.MANUAL),
            target_completion_days=data.get("target_completion_days"),
            created_by=request.user,
        )

        # Create steps
        for i, step_data in enumerate(data.get("steps", [])):
            PlaybookStep.objects.create(
                playbook=playbook,
                order=i,
                name=step_data.get("name", f"Step {i + 1}"),
                description=step_data.get("description", ""),
                step_type=step_data.get("type", PlaybookStep.StepType.TASK),
                is_required=step_data.get("required", True),
                config=step_data.get("config", {}),
                wait_duration=step_data.get("wait_duration"),
                wait_unit=step_data.get("wait_unit", PlaybookStep.WaitUnit.DAYS),
            )

        # Update template stats
        template.times_used += 1
        template.save(update_fields=["times_used"])

        return Response(
            PlaybookDetailSerializer(playbook).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def rate(self, request, pk=None):
        """Rate this template"""
        template = self.get_object()
        rating = request.data.get("rating")

        if not rating or not (1 <= rating <= 5):
            return Response(
                {"error": "Rating must be between 1 and 5"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rolling average
        current_total = template.rating * template.rating_count
        template.rating_count += 1
        template.rating = (current_total + rating) / template.rating_count
        template.save(update_fields=["rating", "rating_count"])

        return Response(PlaybookTemplateSerializer(template).data)
