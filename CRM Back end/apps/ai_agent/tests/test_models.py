"""
Tests for AI Agent models.
"""

import pytest
from django.utils import timezone

from apps.ai_agent.models import (
    AgentAction,
    AgentConfiguration,
    AgentInsight,
    AgentLog,
    AgentMetrics,
)


@pytest.mark.django_db
class TestAgentConfiguration:
    """Tests for AgentConfiguration model."""

    def test_singleton_pattern(self):
        """Test that only one configuration can exist."""
        config1 = AgentConfiguration.objects.create(is_active=True)
        config2 = AgentConfiguration(is_active=False)
        config2.save()

        # Should update the existing config, not create a new one
        assert AgentConfiguration.objects.count() == 1
        config1.refresh_from_db()
        assert config1.is_active is False

    def test_get_config_creates_if_missing(self):
        """Test that get_config creates a configuration if none exists."""
        assert AgentConfiguration.objects.count() == 0
        config = AgentConfiguration.get_config()
        assert config is not None
        assert AgentConfiguration.objects.count() == 1

    def test_default_values(self):
        """Test default configuration values."""
        config = AgentConfiguration.get_config()

        assert config.is_active is False
        assert config.email_analysis_enabled is False
        assert config.appointment_reminders_enabled is True
        assert config.ai_provider == "openai"
        assert config.ai_model == "gpt-4o"
        assert config.ai_temperature == 0.3
        assert config.appointment_reminder_hours == [24, 2]

    def test_str_representation(self):
        """Test string representation."""
        config = AgentConfiguration.objects.create(is_active=True)
        assert "Active" in str(config)

        config.is_active = False
        config.save()
        assert "Inactive" in str(config)


@pytest.mark.django_db
class TestAgentAction:
    """Tests for AgentAction model."""

    def test_create_action(self):
        """Test creating an agent action."""
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
            status=AgentAction.Status.PENDING,
            title="Test Action",
            description="Test description",
            reasoning="AI determined this was important",
        )

        assert action.id is not None
        assert action.action_type == "email_note"
        assert action.status == "pending"
        assert action.requires_approval is True

    def test_action_type_choices(self):
        """Test action type choices."""
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.APPOINTMENT_REMINDER,
            title="Appointment Reminder",
            description="Test",
        )

        assert action.get_action_type_display() == "Sent appointment reminder"

    def test_outcome_tracking(self):
        """Test outcome tracking fields."""
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.TASK_REMINDER,
            status=AgentAction.Status.EXECUTED,
            title="Task Reminder",
            description="Test",
            executed_at=timezone.now(),
        )

        action.outcome = "Task was completed after reminder"
        action.outcome_score = 0.8
        action.outcome_recorded_at = timezone.now()
        action.save()

        action.refresh_from_db()
        assert action.outcome_score == 0.8


@pytest.mark.django_db
class TestAgentLog:
    """Tests for AgentLog model."""

    def test_create_log(self):
        """Test creating an agent log."""
        log = AgentLog.objects.create(
            level=AgentLog.LogLevel.INFO,
            component="test_component",
            message="Test log message",
            context={"key": "value"},
        )

        assert log.id is not None
        assert log.level == "info"
        assert log.component == "test_component"
        assert log.context == {"key": "value"}

    def test_log_with_action(self):
        """Test log linked to action."""
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.INSIGHT_GENERATED,
            title="Test Insight",
            description="Test",
        )

        log = AgentLog.objects.create(
            level=AgentLog.LogLevel.DECISION,
            component="market_analyzer",
            message="Generated insight",
            action=action,
        )

        assert log.action == action
        assert action.logs.count() == 1

    def test_log_with_ai_usage(self):
        """Test log with AI usage tracking."""
        log = AgentLog.objects.create(
            level=AgentLog.LogLevel.DEBUG,
            component="email_analyzer",
            message="AI call completed",
            tokens_used=150,
            ai_model="gpt-4o",
            ai_latency_ms=450,
        )

        assert log.tokens_used == 150
        assert log.ai_model == "gpt-4o"
        assert log.ai_latency_ms == 450


@pytest.mark.django_db
class TestAgentInsight:
    """Tests for AgentInsight model."""

    def test_create_insight(self):
        """Test creating an insight."""
        insight = AgentInsight.objects.create(
            insight_type=AgentInsight.InsightType.STRENGTH,
            title="Strong Client Retention",
            description="Client retention rate is above industry average",
            priority=7,
            is_actionable=False,
        )

        assert insight.id is not None
        assert insight.insight_type == "strength"
        assert insight.priority == 7
        assert insight.is_acknowledged is False

    def test_insight_acknowledgment(self, admin_user):
        """Test insight acknowledgment."""
        insight = AgentInsight.objects.create(
            insight_type=AgentInsight.InsightType.WEAKNESS,
            title="High Task Overdue Rate",
            description="20% of tasks are overdue",
            priority=8,
            recommended_action="Review task assignments",
        )

        insight.is_acknowledged = True
        insight.acknowledged_by = admin_user
        insight.acknowledged_at = timezone.now()
        insight.outcome = "Reassigned overdue tasks"
        insight.save()

        insight.refresh_from_db()
        assert insight.is_acknowledged is True
        assert insight.acknowledged_by == admin_user


@pytest.mark.django_db
class TestAgentMetrics:
    """Tests for AgentMetrics model."""

    def test_create_daily_metrics(self):
        """Test creating daily metrics."""
        today = timezone.now().date()

        metrics = AgentMetrics.objects.create(
            date=today,
            total_actions=50,
            actions_executed=40,
            actions_rejected=5,
            actions_failed=5,
            total_tokens_used=10000,
        )

        assert metrics.id is not None
        assert metrics.date == today
        assert metrics.total_actions == 50

    def test_unique_date_constraint(self):
        """Test that only one metrics record per date."""
        today = timezone.now().date()

        AgentMetrics.objects.create(date=today, total_actions=10)

        # Creating another for the same date should fail
        with pytest.raises(Exception):  # IntegrityError
            AgentMetrics.objects.create(date=today, total_actions=20)
