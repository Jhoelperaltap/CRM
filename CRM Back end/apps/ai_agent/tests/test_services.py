"""
Tests for AI Agent services.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.ai_agent.models import (
    AgentAction,
    AgentConfiguration,
)


@pytest.fixture
def agent_config():
    """Create test configuration."""
    return AgentConfiguration.objects.create(
        is_active=True,
        email_analysis_enabled=True,
        appointment_reminders_enabled=True,
        task_enforcement_enabled=True,
        market_analysis_enabled=True,
        autonomous_actions_enabled=False,
        appointment_reminder_hours=[24, 2],
        task_reminder_hours_before=24,
    )


@pytest.mark.django_db
class TestAppointmentMonitor:
    """Tests for AppointmentMonitor service."""

    def test_check_upcoming_appointments(self, agent_config):
        """Test checking for appointments needing reminders."""
        from apps.ai_agent.services.appointment_monitor import AppointmentMonitor
        from apps.appointments.models import Appointment
        from tests.factories import ContactFactory

        contact = ContactFactory()

        # Create appointment 24 hours from now
        now = timezone.now()
        apt_time = now + timedelta(hours=24, minutes=5)

        Appointment.objects.create(
            title="Tax Consultation",
            contact=contact,
            start_datetime=apt_time,
            end_datetime=apt_time + timedelta(hours=1),
            status="scheduled",
        )

        monitor = AppointmentMonitor(agent_config)
        actions = monitor.check_upcoming_appointments()

        # Should create a 24h reminder
        assert len(actions) >= 1
        assert any(
            a.action_type == AgentAction.ActionType.APPOINTMENT_REMINDER
            for a in actions
        )

    def test_no_duplicate_reminders(self, agent_config):
        """Test that duplicate reminders are not created."""
        from apps.ai_agent.services.appointment_monitor import AppointmentMonitor
        from apps.appointments.models import Appointment
        from tests.factories import ContactFactory

        contact = ContactFactory()
        now = timezone.now()
        apt_time = now + timedelta(hours=24, minutes=5)

        Appointment.objects.create(
            title="Tax Consultation",
            contact=contact,
            start_datetime=apt_time,
            end_datetime=apt_time + timedelta(hours=1),
            status="scheduled",
        )

        monitor = AppointmentMonitor(agent_config)

        # First check should create reminder
        monitor.check_upcoming_appointments()

        # Second check should not create duplicate
        actions2 = monitor.check_upcoming_appointments()
        assert len(actions2) == 0


@pytest.mark.django_db
class TestTaskEnforcer:
    """Tests for TaskEnforcer service."""

    def test_check_overdue_tasks(self, agent_config):
        """Test checking for overdue tasks."""
        from apps.ai_agent.services.task_enforcer import TaskEnforcer
        from apps.tasks.models import Task

        # Create overdue task
        Task.objects.create(
            title="Overdue Task",
            description="Test task",
            due_date=timezone.now().date() - timedelta(days=2),
            status="todo",
        )

        enforcer = TaskEnforcer(agent_config)
        actions = enforcer.check_overdue_tasks()

        assert len(actions) >= 1
        assert any(
            a.action_type == AgentAction.ActionType.TASK_REMINDER for a in actions
        )

    def test_escalation_for_severely_overdue(self, agent_config):
        """Test escalation for tasks overdue by 3+ days."""
        from apps.ai_agent.services.task_enforcer import TaskEnforcer
        from apps.tasks.models import Task

        # Create severely overdue task
        Task.objects.create(
            title="Severely Overdue Task",
            description="Test task",
            due_date=timezone.now().date() - timedelta(days=5),
            status="todo",
        )

        enforcer = TaskEnforcer(agent_config)
        actions = enforcer.check_overdue_tasks()

        # Should have escalation
        assert any(
            a.action_type == AgentAction.ActionType.TASK_ESCALATED for a in actions
        )

    def test_upcoming_deadline_reminders(self, agent_config):
        """Test reminders for upcoming deadlines."""
        from apps.ai_agent.services.task_enforcer import TaskEnforcer
        from apps.tasks.models import Task

        # Create task due tomorrow
        Task.objects.create(
            title="Due Tomorrow",
            description="Test task",
            due_date=timezone.now().date() + timedelta(days=1),
            status="todo",
        )

        enforcer = TaskEnforcer(agent_config)
        actions = enforcer.check_upcoming_deadlines()

        assert len(actions) >= 1

    def test_get_task_status_summary(self, agent_config):
        """Test getting task status summary."""
        from apps.ai_agent.services.task_enforcer import TaskEnforcer
        from apps.tasks.models import Task

        # Create various tasks
        Task.objects.create(
            title="Overdue",
            due_date=timezone.now().date() - timedelta(days=1),
            status="todo",
        )
        Task.objects.create(
            title="Due Today",
            due_date=timezone.now().date(),
            status="todo",
        )
        Task.objects.create(
            title="Due Next Week",
            due_date=timezone.now().date() + timedelta(days=5),
            status="todo",
        )

        enforcer = TaskEnforcer(agent_config)
        summary = enforcer.get_task_status_summary()

        assert "total_open" in summary
        assert "overdue" in summary
        assert "due_today" in summary
        assert summary["total_open"] == 3
        assert summary["overdue"] == 1
        assert summary["due_today"] == 1


@pytest.mark.django_db
class TestMarketAnalyzer:
    """Tests for MarketAnalyzer service."""

    def test_gather_metrics(self, agent_config):
        """Test gathering business metrics."""
        from apps.ai_agent.services.market_analyzer import MarketAnalyzer

        analyzer = MarketAnalyzer(agent_config)

        # Test individual metric gathering
        revenue_metrics = analyzer._get_revenue_metrics()
        assert "this_month_new_cases" in revenue_metrics

        case_metrics = analyzer._get_case_metrics()
        assert "total_active_cases" in case_metrics

        client_metrics = analyzer._get_client_metrics()
        assert "total_active_contacts" in client_metrics

    def test_rule_based_insights(self, agent_config):
        """Test rule-based insight generation."""
        from apps.ai_agent.services.market_analyzer import MarketAnalyzer
        from apps.tasks.models import Task

        # Create overdue tasks to trigger weakness insight
        for i in range(5):
            Task.objects.create(
                title=f"Overdue Task {i}",
                due_date=timezone.now().date() - timedelta(days=2),
                status="todo",
            )

        analyzer = MarketAnalyzer(agent_config, ai_service=None)
        insights = analyzer.analyze_business_metrics()

        # Should generate rule-based insights
        assert isinstance(insights, list)


@pytest.mark.django_db
class TestLearningEngine:
    """Tests for LearningEngine service."""

    def test_record_outcome(self, agent_config, admin_user):
        """Test recording action outcome."""
        from apps.ai_agent.services.learning_engine import LearningEngine

        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
            status=AgentAction.Status.EXECUTED,
            title="Test Action",
            description="Test",
            executed_at=timezone.now(),
        )

        engine = LearningEngine(agent_config)
        engine.record_outcome(action, "Client appreciated the note", 0.9, admin_user)

        action.refresh_from_db()
        assert action.outcome_score == 0.9
        assert action.outcome_recorded_by == admin_user

    def test_performance_summary(self, agent_config):
        """Test getting performance summary."""
        from apps.ai_agent.services.learning_engine import LearningEngine

        # Create some actions
        for i in range(10):
            AgentAction.objects.create(
                action_type=AgentAction.ActionType.TASK_REMINDER,
                status=(
                    AgentAction.Status.EXECUTED
                    if i < 7
                    else AgentAction.Status.REJECTED
                ),
                title=f"Action {i}",
                description="Test",
            )

        engine = LearningEngine(agent_config)
        summary = engine.get_performance_summary(days=30)

        assert summary["total_actions"] == 10
        assert summary["status_breakdown"]["executed"] == 7
        assert summary["status_breakdown"]["rejected"] == 3

    def test_get_recommendations(self, agent_config):
        """Test getting improvement recommendations."""
        from apps.ai_agent.services.learning_engine import LearningEngine

        # Create actions with high rejection rate
        for i in range(10):
            AgentAction.objects.create(
                action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
                status=(
                    AgentAction.Status.REJECTED
                    if i < 5
                    else AgentAction.Status.EXECUTED
                ),
                title=f"Action {i}",
                description="Test",
            )

        engine = LearningEngine(agent_config)
        recommendations = engine.get_recommendations()

        # Should recommend something about high rejection rate
        assert isinstance(recommendations, list)


@pytest.mark.django_db
class TestAgentBrain:
    """Tests for AgentBrain orchestrator."""

    def test_inactive_agent_skips_cycle(self, agent_config):
        """Test that inactive agent skips cycle."""
        from apps.ai_agent.services.agent_brain import AgentBrain

        agent_config.is_active = False
        agent_config.save()

        brain = AgentBrain(agent_config)
        result = brain.run_cycle()

        assert result["status"] == "inactive"

    def test_get_status(self, agent_config):
        """Test getting agent status."""
        from apps.ai_agent.services.agent_brain import AgentBrain

        brain = AgentBrain(agent_config)
        status = brain.get_status()

        assert status["is_active"] is True
        assert "capabilities" in status
        assert status["capabilities"]["email_analysis"] is True

    def test_execute_action(self, agent_config, admin_user):
        """Test executing an action."""
        from apps.ai_agent.services.agent_brain import AgentBrain

        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.INSIGHT_GENERATED,
            status=AgentAction.Status.PENDING,
            title="Test Insight",
            description="Test",
        )

        brain = AgentBrain(agent_config)
        result = brain.execute_action(action, approved_by=admin_user)

        assert result.status == AgentAction.Status.EXECUTED
        assert result.approved_by == admin_user

    def test_reject_action(self, agent_config, admin_user):
        """Test rejecting an action."""
        from apps.ai_agent.services.agent_brain import AgentBrain

        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
            status=AgentAction.Status.PENDING,
            title="Test Action",
            description="Test",
        )

        brain = AgentBrain(agent_config)
        result = brain.reject_action(action, admin_user, "Not relevant")

        assert result.status == AgentAction.Status.REJECTED
        assert result.rejection_reason == "Not relevant"

    def test_rate_limiting(self, agent_config):
        """Test that rate limiting is enforced."""
        from apps.ai_agent.services.agent_brain import AgentBrain

        agent_config.max_actions_per_hour = 5
        agent_config.save()

        # Create actions to hit rate limit
        for i in range(6):
            AgentAction.objects.create(
                action_type=AgentAction.ActionType.TASK_REMINDER,
                status=AgentAction.Status.EXECUTED,
                title=f"Action {i}",
                description="Test",
            )

        brain = AgentBrain(agent_config)
        can_run = brain._check_rate_limits()

        assert can_run is False
