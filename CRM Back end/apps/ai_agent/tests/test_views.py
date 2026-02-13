"""
Tests for AI Agent API views.
"""

import pytest
from django.utils import timezone
from rest_framework import status

from apps.ai_agent.models import (
    AgentAction,
    AgentConfiguration,
    AgentInsight,
    AgentLog,
)

BASE_URL = "/api/v1/ai-agent/"


@pytest.fixture
def agent_config():
    """Create a test configuration."""
    return AgentConfiguration.objects.create(
        is_active=True,
        email_analysis_enabled=True,
        appointment_reminders_enabled=True,
        task_enforcement_enabled=True,
        market_analysis_enabled=True,
    )


@pytest.fixture
def sample_actions(agent_config):
    """Create sample actions."""
    actions = []
    for i in range(5):
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
            status=AgentAction.Status.PENDING if i < 3 else AgentAction.Status.EXECUTED,
            title=f"Test Action {i}",
            description=f"Description {i}",
            reasoning="AI reasoning",
        )
        actions.append(action)
    return actions


@pytest.fixture
def sample_insights(agent_config):
    """Create sample insights."""
    insights = []
    for i in range(3):
        insight = AgentInsight.objects.create(
            insight_type=AgentInsight.InsightType.STRENGTH,
            title=f"Test Insight {i}",
            description=f"Description {i}",
            priority=5 + i,
        )
        insights.append(insight)
    return insights


@pytest.mark.django_db
class TestAgentConfigurationAPI:
    """Tests for configuration endpoints."""

    def test_get_config(self, admin_client, agent_config):
        """Test getting configuration."""
        resp = admin_client.get(f"{BASE_URL}config/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_active"] is True

    def test_get_config_unauthenticated(self, api_client):
        """Test that unauthenticated access is denied."""
        resp = api_client.get(f"{BASE_URL}config/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_config_non_admin(self, authenticated_client, agent_config):
        """Test that non-admin users cannot access config."""
        resp = authenticated_client.get(f"{BASE_URL}config/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_update_config(self, admin_client, agent_config):
        """Test updating configuration."""
        resp = admin_client.patch(
            f"{BASE_URL}config/",
            {"is_active": False, "email_analysis_enabled": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_active"] is False
        assert resp.data["email_analysis_enabled"] is False

    def test_toggle_agent(self, admin_client, agent_config):
        """Test toggling agent on/off."""
        assert agent_config.is_active is True

        resp = admin_client.post(f"{BASE_URL}config/toggle/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_active"] is False

        resp = admin_client.post(f"{BASE_URL}config/toggle/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_active"] is True


@pytest.mark.django_db
class TestAgentStatusAPI:
    """Tests for status endpoint."""

    def test_get_status(self, authenticated_client, agent_config):
        """Test getting agent status."""
        resp = authenticated_client.get(f"{BASE_URL}status/")
        assert resp.status_code == status.HTTP_200_OK
        assert "is_active" in resp.data
        assert "capabilities" in resp.data
        assert "health" in resp.data


@pytest.mark.django_db
class TestAgentActionAPI:
    """Tests for action endpoints."""

    def test_list_actions(self, authenticated_client, sample_actions):
        """Test listing actions."""
        resp = authenticated_client.get(f"{BASE_URL}actions/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 5

    def test_get_action_detail(self, authenticated_client, sample_actions):
        """Test getting action detail."""
        action = sample_actions[0]
        resp = authenticated_client.get(f"{BASE_URL}actions/{action.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == action.title

    def test_list_pending_actions(self, authenticated_client, sample_actions):
        """Test listing pending actions."""
        resp = authenticated_client.get(f"{BASE_URL}actions/pending/")
        assert resp.status_code == status.HTTP_200_OK
        # 3 pending actions in fixture
        assert resp.data["count"] == 3

    def test_filter_actions_by_status(self, authenticated_client, sample_actions):
        """Test filtering actions by status."""
        resp = authenticated_client.get(f"{BASE_URL}actions/?status=executed")
        assert resp.status_code == status.HTTP_200_OK
        # 2 executed actions in fixture
        assert resp.data["count"] == 2

    def test_approve_action(self, admin_client, sample_actions):
        """Test approving an action."""
        action = sample_actions[0]  # Pending action
        resp = admin_client.post(
            f"{BASE_URL}actions/{action.id}/approve/",
            {"execute_immediately": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "approved"

    def test_reject_action(self, admin_client, sample_actions):
        """Test rejecting an action."""
        action = sample_actions[0]
        resp = admin_client.post(
            f"{BASE_URL}actions/{action.id}/reject/",
            {"reason": "Not needed"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "rejected"
        assert resp.data["rejection_reason"] == "Not needed"

    def test_cannot_approve_non_pending(self, admin_client, sample_actions):
        """Test that non-pending actions cannot be approved."""
        action = sample_actions[3]  # Executed action
        resp = admin_client.post(f"{BASE_URL}actions/{action.id}/approve/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_record_outcome(self, authenticated_client, sample_actions):
        """Test recording action outcome."""
        action = sample_actions[3]  # Executed action
        resp = authenticated_client.post(
            f"{BASE_URL}actions/{action.id}/outcome/",
            {"outcome": "Client responded positively", "score": 0.8},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["outcome_score"] == 0.8


@pytest.mark.django_db
class TestAgentLogAPI:
    """Tests for log endpoints."""

    def test_list_logs(self, admin_client, agent_config):
        """Test listing logs."""
        # Create some logs
        AgentLog.objects.create(
            level=AgentLog.LogLevel.INFO,
            component="test",
            message="Test message",
        )

        resp = admin_client.get(f"{BASE_URL}logs/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1

    def test_filter_logs_by_level(self, admin_client, agent_config):
        """Test filtering logs by level."""
        AgentLog.objects.create(
            level=AgentLog.LogLevel.ERROR,
            component="test",
            message="Error message",
        )
        AgentLog.objects.create(
            level=AgentLog.LogLevel.INFO,
            component="test",
            message="Info message",
        )

        resp = admin_client.get(f"{BASE_URL}logs/?level=error")
        assert resp.status_code == status.HTTP_200_OK
        for log in resp.data["results"]:
            assert log["level"] == "error"


@pytest.mark.django_db
class TestAgentInsightAPI:
    """Tests for insight endpoints."""

    def test_list_insights(self, authenticated_client, sample_insights):
        """Test listing insights."""
        resp = authenticated_client.get(f"{BASE_URL}insights/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 3

    def test_list_unacknowledged(self, authenticated_client, sample_insights):
        """Test listing unacknowledged insights."""
        resp = authenticated_client.get(f"{BASE_URL}insights/unacknowledged/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 3

    def test_acknowledge_insight(self, authenticated_client, sample_insights):
        """Test acknowledging an insight."""
        insight = sample_insights[0]
        resp = authenticated_client.post(
            f"{BASE_URL}insights/{insight.id}/acknowledge/",
            {"outcome": "Took action on this insight"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_acknowledged"] is True


@pytest.mark.django_db
class TestAgentMetricsAPI:
    """Tests for metrics endpoints."""

    def test_get_summary(self, authenticated_client, agent_config, sample_actions):
        """Test getting performance summary."""
        resp = authenticated_client.get(f"{BASE_URL}metrics/summary/")
        assert resp.status_code == status.HTTP_200_OK
        assert "total_actions" in resp.data
        assert "rates" in resp.data

    def test_get_learning_progress(self, authenticated_client, agent_config):
        """Test getting learning progress."""
        resp = authenticated_client.get(f"{BASE_URL}metrics/learning/")
        assert resp.status_code == status.HTTP_200_OK
        assert "recent_period" in resp.data

    def test_get_recommendations(self, authenticated_client, agent_config):
        """Test getting recommendations."""
        resp = authenticated_client.get(f"{BASE_URL}metrics/recommendations/")
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)


@pytest.mark.django_db
class TestRunAgentCycleAPI:
    """Tests for manual agent triggers."""

    def test_run_cycle_async(self, admin_client, agent_config):
        """Test running agent cycle asynchronously."""
        resp = admin_client.post(
            f"{BASE_URL}run-cycle/",
            {"async": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "queued"

    def test_run_analysis_async(self, admin_client, agent_config):
        """Test running market analysis asynchronously."""
        resp = admin_client.post(
            f"{BASE_URL}run-analysis/",
            {"async": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "queued"
