"""
URL configuration for the AI Agent system.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.ai_agent.views import (
    AgentActionViewSet,
    AgentConfigurationView,
    AgentInsightViewSet,
    AgentLogViewSet,
    AgentMetricsViewSet,
    AgentStatusView,
    AgentToggleView,
    RunAgentCycleView,
    RunMarketAnalysisView,
)

router = DefaultRouter()
router.register(r"actions", AgentActionViewSet, basename="agent-action")
router.register(r"logs", AgentLogViewSet, basename="agent-log")
router.register(r"insights", AgentInsightViewSet, basename="agent-insight")
router.register(r"metrics", AgentMetricsViewSet, basename="agent-metrics")

urlpatterns = [
    # Configuration endpoints
    path("config/", AgentConfigurationView.as_view(), name="agent-config"),
    path("config/toggle/", AgentToggleView.as_view(), name="agent-toggle"),
    # Status endpoint
    path("status/", AgentStatusView.as_view(), name="agent-status"),
    # Manual triggers
    path("run-cycle/", RunAgentCycleView.as_view(), name="agent-run-cycle"),
    path("run-analysis/", RunMarketAnalysisView.as_view(), name="agent-run-analysis"),
    # ViewSet routes
    path("", include(router.urls)),
]
