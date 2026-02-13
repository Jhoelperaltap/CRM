"""
API views for the AI Agent system.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_agent.filters import AgentActionFilter, AgentInsightFilter, AgentLogFilter
from apps.ai_agent.models import (
    AgentAction,
    AgentConfiguration,
    AgentInsight,
    AgentLog,
    AgentMetrics,
)
from apps.ai_agent.serializers import (
    AgentActionApproveSerializer,
    AgentActionDetailSerializer,
    AgentActionListSerializer,
    AgentActionOutcomeSerializer,
    AgentActionRejectSerializer,
    AgentConfigurationSerializer,
    AgentConfigurationUpdateSerializer,
    AgentInsightAcknowledgeSerializer,
    AgentInsightDetailSerializer,
    AgentInsightListSerializer,
    AgentLogSerializer,
    AgentMetricsSerializer,
    AgentStatusSerializer,
    LearningProgressSerializer,
    PerformanceSummarySerializer,
)
from apps.users.permissions import IsAdminRole


class AgentConfigurationView(APIView):
    """
    API view for AI Agent configuration.
    GET: Retrieve current configuration
    PUT/PATCH: Update configuration
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        """Get current AI agent configuration."""
        config = AgentConfiguration.get_config()
        serializer = AgentConfigurationSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        """Update AI agent configuration."""
        config = AgentConfiguration.get_config()
        serializer = AgentConfigurationUpdateSerializer(
            config,
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        """Partially update AI agent configuration."""
        config = AgentConfiguration.get_config()
        serializer = AgentConfigurationUpdateSerializer(
            config,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AgentToggleView(APIView):
    """Quick toggle for AI agent on/off."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        """Toggle AI agent active state."""
        config = AgentConfiguration.get_config()
        config.is_active = not config.is_active
        config.save()
        return Response(
            {
                "is_active": config.is_active,
                "message": f"AI Agent is now {'active' if config.is_active else 'inactive'}",
            }
        )


class AgentStatusView(APIView):
    """Get current AI agent status and health."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get AI agent status."""
        from apps.ai_agent.services.agent_brain import AgentBrain

        brain = AgentBrain()
        status_data = brain.get_status()
        serializer = AgentStatusSerializer(status_data)
        return Response(serializer.data)


class AgentActionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AI Agent actions.
    Supports listing, detail view, approval, rejection, and outcome recording.
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AgentActionFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "status", "action_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AgentAction.objects.select_related(
            "related_contact",
            "related_case",
            "related_task",
            "related_appointment",
            "related_email",
            "approved_by",
            "rejected_by",
        ).all()

    def get_serializer_class(self):
        if self.action == "list":
            return AgentActionListSerializer
        return AgentActionDetailSerializer

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Get all pending actions requiring approval."""
        queryset = self.get_queryset().filter(status="pending")
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AgentActionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AgentActionListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminRole]
    )
    def approve(self, request, pk=None):
        """Approve a pending action."""
        action_obj = self.get_object()

        if action_obj.status != "pending":
            return Response(
                {"error": f"Cannot approve action with status: {action_obj.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgentActionApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.ai_agent.services.agent_brain import AgentBrain

        brain = AgentBrain()

        if serializer.validated_data.get("execute_immediately", True):
            action_obj = brain.execute_action(action_obj, approved_by=request.user)
        else:
            action_obj.status = AgentAction.Status.APPROVED
            action_obj.approved_by = request.user
            from django.utils import timezone

            action_obj.approved_at = timezone.now()
            action_obj.save()

        return Response(AgentActionDetailSerializer(action_obj).data)

    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminRole]
    )
    def reject(self, request, pk=None):
        """Reject a pending action."""
        action_obj = self.get_object()

        if action_obj.status != "pending":
            return Response(
                {"error": f"Cannot reject action with status: {action_obj.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgentActionRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.ai_agent.services.agent_brain import AgentBrain

        brain = AgentBrain()
        action_obj = brain.reject_action(
            action_obj,
            rejected_by=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )

        return Response(AgentActionDetailSerializer(action_obj).data)

    @action(detail=True, methods=["post"])
    def outcome(self, request, pk=None):
        """Record the outcome of an executed action."""
        action_obj = self.get_object()

        if action_obj.status != "executed":
            return Response(
                {"error": "Can only record outcomes for executed actions"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgentActionOutcomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.ai_agent.services.learning_engine import LearningEngine
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()
        engine = LearningEngine(config)

        action_obj = engine.record_outcome(
            action_obj,
            outcome=serializer.validated_data["outcome"],
            score=serializer.validated_data["score"],
            recorded_by=request.user,
        )

        return Response(AgentActionDetailSerializer(action_obj).data)


class AgentLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for AI Agent logs."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = AgentLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AgentLogFilter
    search_fields = ["message"]
    ordering_fields = ["created_at", "level", "component"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AgentLog.objects.select_related("action").all()

    @action(detail=False, methods=["get"])
    def export(self, request):
        """Export logs as CSV."""
        import csv
        from django.http import HttpResponse

        queryset = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="agent_logs.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Timestamp",
                "Level",
                "Component",
                "Message",
                "Tokens Used",
                "Latency (ms)",
            ]
        )

        for log in queryset[:10000]:  # Limit export size
            writer.writerow(
                [
                    log.created_at.isoformat(),
                    log.level,
                    log.component,
                    log.message,
                    log.tokens_used or "",
                    log.ai_latency_ms or "",
                ]
            )

        return response


class AgentInsightViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for AI Agent insights."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AgentInsightFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "priority", "insight_type"]
    ordering = ["-priority", "-created_at"]

    def get_queryset(self):
        return AgentInsight.objects.select_related(
            "acknowledged_by",
            "source_action",
        ).all()

    def get_serializer_class(self):
        if self.action == "list":
            return AgentInsightListSerializer
        return AgentInsightDetailSerializer

    @action(detail=False, methods=["get"])
    def unacknowledged(self, request):
        """Get all unacknowledged insights."""
        queryset = self.get_queryset().filter(is_acknowledged=False)
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AgentInsightListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AgentInsightListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Acknowledge an insight."""
        insight = self.get_object()

        if insight.is_acknowledged:
            return Response(
                {"error": "Insight already acknowledged"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgentInsightAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.utils import timezone

        insight.is_acknowledged = True
        insight.acknowledged_by = request.user
        insight.acknowledged_at = timezone.now()

        if serializer.validated_data.get("outcome"):
            insight.outcome = serializer.validated_data["outcome"]
            insight.outcome_recorded_at = timezone.now()

        insight.save()

        return Response(AgentInsightDetailSerializer(insight).data)


class AgentMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for AI Agent metrics."""

    permission_classes = [IsAuthenticated]
    serializer_class = AgentMetricsSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ["date"]
    ordering = ["-date"]

    def get_queryset(self):
        return AgentMetrics.objects.all()

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get performance summary."""
        days = int(request.query_params.get("days", 30))

        from apps.ai_agent.services.learning_engine import LearningEngine
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()
        engine = LearningEngine(config)
        summary = engine.get_performance_summary(days=days)

        serializer = PerformanceSummarySerializer(summary)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def learning(self, request):
        """Get learning progress metrics."""
        from apps.ai_agent.services.learning_engine import LearningEngine
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()
        engine = LearningEngine(config)
        progress = engine.get_learning_progress()

        serializer = LearningProgressSerializer(progress)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def recommendations(self, request):
        """Get recommendations for improving AI performance."""
        import logging

        from apps.ai_agent.services.learning_engine import LearningEngine
        from apps.ai_agent.models import AgentConfiguration

        logger = logging.getLogger(__name__)

        try:
            config = AgentConfiguration.get_config()
            engine = LearningEngine(config)
            recommendations = engine.get_recommendations()
            return Response(recommendations)
        except Exception as e:
            logger.exception("Error generating recommendations")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def trends(self, request):
        """Get daily trend data."""
        days = int(request.query_params.get("days", 30))

        from apps.ai_agent.services.learning_engine import LearningEngine
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()
        engine = LearningEngine(config)
        trends = engine.get_trend_data(days=days)

        return Response(trends)


class RunAgentCycleView(APIView):
    """Manually trigger an agent cycle."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        """Run agent cycle immediately."""
        from apps.ai_agent.tasks import run_agent_cycle

        # Run synchronously or async based on parameter
        run_async = request.data.get("async", True)

        if run_async:
            task = run_agent_cycle.delay()
            return Response(
                {
                    "status": "queued",
                    "task_id": str(task.id),
                    "message": "Agent cycle queued for execution",
                }
            )
        else:
            result = run_agent_cycle()
            return Response(
                {
                    "status": "completed",
                    "result": result,
                }
            )


class RunMarketAnalysisView(APIView):
    """Manually trigger market analysis."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        """Run market analysis immediately."""
        from apps.ai_agent.tasks import generate_daily_insights

        run_async = request.data.get("async", True)

        if run_async:
            task = generate_daily_insights.delay()
            return Response(
                {
                    "status": "queued",
                    "task_id": str(task.id),
                    "message": "Market analysis queued for execution",
                }
            )
        else:
            result = generate_daily_insights()
            return Response(
                {
                    "status": "completed",
                    "result": result,
                }
            )
