"""
Agent Brain - Main AI orchestrator for the AI Agent system.
Coordinates all AI capabilities and manages the agent lifecycle.
"""

import logging
from datetime import timedelta
from typing import Any

from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentConfiguration, AgentLog

logger = logging.getLogger(__name__)


class AgentBrain:
    """
    Central orchestrator that coordinates all AI agent capabilities.
    Manages the main execution cycle and coordinates services.
    """

    def __init__(self, config: AgentConfiguration | None = None):
        """
        Initialize the agent brain.

        Args:
            config: Optional AgentConfiguration instance
        """
        self.config = config or AgentConfiguration.get_config()
        self._ai_service = None
        self._email_analyzer = None
        self._appointment_monitor = None
        self._task_enforcer = None
        self._market_analyzer = None
        self._learning_engine = None

    @property
    def ai_service(self):
        """Lazy-load AI service."""
        if self._ai_service is None and self.config.is_active:
            from apps.ai_agent.services.ai_service import get_ai_service

            try:
                self._ai_service = get_ai_service(self.config)
            except Exception as e:
                self._log("error", f"Failed to initialize AI service: {e}")
                self._ai_service = None
        return self._ai_service

    @property
    def email_analyzer(self):
        """Lazy-load email analyzer."""
        if self._email_analyzer is None:
            from apps.ai_agent.services.email_analyzer import EmailAnalyzer

            self._email_analyzer = EmailAnalyzer(self.config, self.ai_service)
        return self._email_analyzer

    @property
    def appointment_monitor(self):
        """Lazy-load appointment monitor."""
        if self._appointment_monitor is None:
            from apps.ai_agent.services.appointment_monitor import AppointmentMonitor

            self._appointment_monitor = AppointmentMonitor(self.config)
        return self._appointment_monitor

    @property
    def task_enforcer(self):
        """Lazy-load task enforcer."""
        if self._task_enforcer is None:
            from apps.ai_agent.services.task_enforcer import TaskEnforcer

            self._task_enforcer = TaskEnforcer(self.config)
        return self._task_enforcer

    @property
    def market_analyzer(self):
        """Lazy-load market analyzer."""
        if self._market_analyzer is None:
            from apps.ai_agent.services.market_analyzer import MarketAnalyzer

            self._market_analyzer = MarketAnalyzer(self.config, self.ai_service)
        return self._market_analyzer

    @property
    def learning_engine(self):
        """Lazy-load learning engine."""
        if self._learning_engine is None:
            from apps.ai_agent.services.learning_engine import LearningEngine

            self._learning_engine = LearningEngine(self.config)
        return self._learning_engine

    def run_cycle(self) -> dict[str, Any]:
        """
        Main execution cycle - runs all enabled capabilities.
        Called periodically by Celery beat.

        Returns:
            Summary of actions taken during this cycle
        """
        if not self.config.is_active:
            self._log("info", "Agent is inactive, skipping cycle")
            return {"status": "inactive", "actions": []}

        # Check rate limiting
        if not self._check_rate_limits():
            self._log("warning", "Rate limit reached, skipping cycle")
            return {"status": "rate_limited", "actions": []}

        self._log("info", "Starting agent cycle")
        cycle_start = timezone.now()
        results = {
            "status": "completed",
            "started_at": cycle_start.isoformat(),
            "actions": [],
            "errors": [],
        }

        # Run email analysis
        if self.config.email_analysis_enabled:
            try:
                email_actions = self._run_email_analysis()
                results["actions"].extend([str(a.id) for a in email_actions])
            except Exception as e:
                self._log("error", f"Email analysis failed: {e}")
                results["errors"].append({"component": "email_analyzer", "error": str(e)})

        # Run appointment reminders
        if self.config.appointment_reminders_enabled:
            try:
                appt_actions = self._run_appointment_reminders()
                results["actions"].extend([str(a.id) for a in appt_actions])
            except Exception as e:
                self._log("error", f"Appointment reminders failed: {e}")
                results["errors"].append({"component": "appointment_monitor", "error": str(e)})

        # Run task enforcement
        if self.config.task_enforcement_enabled:
            try:
                task_actions = self._run_task_enforcement()
                results["actions"].extend([str(a.id) for a in task_actions])
            except Exception as e:
                self._log("error", f"Task enforcement failed: {e}")
                results["errors"].append({"component": "task_enforcer", "error": str(e)})

        # Update daily metrics
        try:
            self.learning_engine.update_daily_metrics()
        except Exception as e:
            self._log("error", f"Failed to update metrics: {e}")

        cycle_end = timezone.now()
        results["ended_at"] = cycle_end.isoformat()
        results["duration_ms"] = int((cycle_end - cycle_start).total_seconds() * 1000)
        results["action_count"] = len(results["actions"])

        self._log(
            "info",
            f"Agent cycle completed: {len(results['actions'])} actions, {len(results['errors'])} errors",
            results,
        )

        return results

    def _run_email_analysis(self) -> list[AgentAction]:
        """Run email analysis and return created actions."""
        actions = []
        emails = self.email_analyzer.get_unanalyzed_emails()

        self._log("debug", f"Analyzing {emails.count()} new emails")

        for email in emails:
            try:
                action = self.email_analyzer.analyze_email(email)
                if action:
                    actions.append(action)
            except Exception as e:
                self._log("error", f"Failed to analyze email {email.id}: {e}")

        return actions

    def _run_appointment_reminders(self) -> list[AgentAction]:
        """Run appointment reminders and return created actions."""
        return self.appointment_monitor.check_upcoming_appointments()

    def _run_task_enforcement(self) -> list[AgentAction]:
        """Run task enforcement and return created actions."""
        actions = []

        # Check overdue tasks
        overdue_actions = self.task_enforcer.check_overdue_tasks()
        actions.extend(overdue_actions)

        # Check upcoming deadlines
        upcoming_actions = self.task_enforcer.check_upcoming_deadlines()
        actions.extend(upcoming_actions)

        return actions

    def run_market_analysis(self) -> list:
        """
        Run market analysis and generate insights.
        Called by daily scheduled task.

        Returns:
            List of generated AgentInsight objects
        """
        if not self.config.is_active:
            self._log("info", "Agent is inactive, skipping market analysis")
            return []

        if not self.config.market_analysis_enabled:
            self._log("info", "Market analysis is disabled")
            return []

        self._log("info", "Starting market analysis")

        try:
            insights = self.market_analyzer.analyze_business_metrics()
            self._log("info", f"Market analysis complete: {len(insights)} insights generated")
            return insights
        except Exception as e:
            self._log("error", f"Market analysis failed: {e}")
            raise

    def execute_action(self, action: AgentAction, approved_by=None) -> AgentAction:
        """
        Execute a pending or approved action.

        Args:
            action: AgentAction to execute
            approved_by: User who approved the action

        Returns:
            Updated AgentAction
        """
        if action.status not in ["pending", "approved"]:
            raise ValueError(f"Cannot execute action with status: {action.status}")

        # Mark as approved if pending
        if action.status == "pending":
            action.status = AgentAction.Status.APPROVED
            action.approved_by = approved_by
            action.approved_at = timezone.now()
            action.save()

        try:
            # Execute based on action type
            if action.action_type == AgentAction.ActionType.EMAIL_NOTE_CREATED:
                self._execute_email_note(action)
            elif action.action_type == AgentAction.ActionType.APPOINTMENT_REMINDER:
                self.appointment_monitor._execute_reminder(action)
            elif action.action_type == AgentAction.ActionType.TASK_REMINDER:
                self.task_enforcer._execute_reminder(action)
            elif action.action_type == AgentAction.ActionType.TASK_ESCALATED:
                self.task_enforcer._execute_escalation(action)
            else:
                # Generic execution for other types
                action.status = AgentAction.Status.EXECUTED
                action.executed_at = timezone.now()
                action.execution_result = "Action executed"
                action.save()

            self._log(
                "info",
                f"Executed action: {action.title}",
                {"action_id": str(action.id), "action_type": action.action_type},
                action=action,
            )

        except Exception as e:
            action.status = AgentAction.Status.FAILED
            action.error_message = str(e)
            action.save()
            self._log("error", f"Action execution failed: {e}", {"action_id": str(action.id)})
            raise

        return action

    def reject_action(
        self,
        action: AgentAction,
        rejected_by,
        reason: str = "",
    ) -> AgentAction:
        """
        Reject a pending action.

        Args:
            action: AgentAction to reject
            rejected_by: User who rejected the action
            reason: Reason for rejection

        Returns:
            Updated AgentAction
        """
        if action.status != "pending":
            raise ValueError(f"Cannot reject action with status: {action.status}")

        action.status = AgentAction.Status.REJECTED
        action.rejected_by = rejected_by
        action.rejected_at = timezone.now()
        action.rejection_reason = reason
        action.save()

        self._log(
            "decision",
            f"Action rejected: {action.title}",
            {
                "action_id": str(action.id),
                "rejected_by": str(rejected_by.id) if rejected_by else None,
                "reason": reason,
            },
            action=action,
        )

        return action

    def _execute_email_note(self, action: AgentAction):
        """Execute email note creation action."""
        self.email_analyzer._execute_note_creation(action)

    def _check_rate_limits(self) -> bool:
        """Check if rate limits allow running a cycle."""
        one_hour_ago = timezone.now() - timedelta(hours=1)

        # Check actions per hour
        recent_actions = AgentAction.objects.filter(created_at__gte=one_hour_ago).count()
        if recent_actions >= self.config.max_actions_per_hour:
            return False

        # Check AI calls per hour
        recent_ai_calls = AgentLog.objects.filter(
            created_at__gte=one_hour_ago,
            tokens_used__isnull=False,
        ).count()
        if recent_ai_calls >= self.config.max_ai_calls_per_hour:
            return False

        return True

    def get_status(self) -> dict[str, Any]:
        """
        Get current agent status and health.

        Returns:
            Dictionary with status information
        """
        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)
        today = now.date()

        # Get recent activity
        recent_actions = AgentAction.objects.filter(created_at__gte=one_hour_ago)
        pending_actions = AgentAction.objects.filter(status="pending")

        # Get today's metrics
        from apps.ai_agent.models import AgentMetrics

        today_metrics = AgentMetrics.objects.filter(date=today).first()

        # Check for errors
        recent_errors = AgentLog.objects.filter(
            created_at__gte=one_hour_ago,
            level="error",
        ).count()

        return {
            "is_active": self.config.is_active,
            "capabilities": {
                "email_analysis": self.config.email_analysis_enabled,
                "appointment_reminders": self.config.appointment_reminders_enabled,
                "task_enforcement": self.config.task_enforcement_enabled,
                "market_analysis": self.config.market_analysis_enabled,
                "autonomous_actions": self.config.autonomous_actions_enabled,
            },
            "ai_config": {
                "provider": self.config.ai_provider,
                "model": self.config.ai_model,
            },
            "activity": {
                "actions_last_hour": recent_actions.count(),
                "pending_actions": pending_actions.count(),
                "errors_last_hour": recent_errors,
            },
            "rate_limits": {
                "actions_per_hour": self.config.max_actions_per_hour,
                "ai_calls_per_hour": self.config.max_ai_calls_per_hour,
                "actions_remaining": max(
                    0, self.config.max_actions_per_hour - recent_actions.count()
                ),
            },
            "today_metrics": {
                "total_actions": today_metrics.total_actions if today_metrics else 0,
                "executed": today_metrics.actions_executed if today_metrics else 0,
                "tokens_used": today_metrics.total_tokens_used if today_metrics else 0,
            } if today_metrics else None,
            "health": "healthy" if recent_errors == 0 else "degraded",
        }

    def get_pending_actions(self, limit: int = 50) -> list[AgentAction]:
        """
        Get actions pending approval.

        Args:
            limit: Maximum number of actions to return

        Returns:
            List of pending AgentAction objects
        """
        return list(
            AgentAction.objects.filter(status="pending")
            .select_related(
                "related_email",
                "related_task",
                "related_appointment",
                "related_contact",
                "related_case",
            )
            .order_by("-created_at")[:limit]
        )

    def _log(
        self,
        level: str,
        message: str,
        context: dict[str, Any] | None = None,
        action: AgentAction | None = None,
    ):
        """Create an agent log entry."""
        AgentLog.objects.create(
            level=level,
            component="agent_brain",
            message=message,
            context=context or {},
            action=action,
        )
        getattr(logger, level if level != "decision" else "info")(message)
