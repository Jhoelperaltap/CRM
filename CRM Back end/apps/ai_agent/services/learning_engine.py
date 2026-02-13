"""
Learning Engine service for the AI Agent.
Tracks outcomes and improves AI decisions over time.
"""

import logging
from datetime import timedelta
from typing import Any

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentLog, AgentMetrics

logger = logging.getLogger(__name__)


class LearningEngine:
    """
    Tracks action outcomes and provides performance analytics.
    Enables continuous improvement of AI agent decisions.
    """

    def __init__(self, config):
        """
        Initialize learning engine.

        Args:
            config: AgentConfiguration instance
        """
        self.config = config

    def record_outcome(
        self,
        action: AgentAction,
        outcome: str,
        score: float,
        recorded_by=None,
    ) -> AgentAction:
        """
        Record the outcome of an AI action.

        Args:
            action: AgentAction instance
            outcome: Description of the outcome
            score: Outcome score from -1 (bad) to 1 (good)
            recorded_by: User who recorded the outcome

        Returns:
            Updated AgentAction
        """
        # Validate score
        score = max(-1.0, min(1.0, score))

        action.outcome = outcome
        action.outcome_score = score
        action.outcome_recorded_by = recorded_by
        action.outcome_recorded_at = timezone.now()
        action.save()

        self._log(
            "decision",
            f"Outcome recorded for action: {action.action_type}",
            {
                "action_id": str(action.id),
                "score": score,
                "outcome_preview": outcome[:100] if outcome else "",
            },
            action=action,
        )

        return action

    def get_performance_summary(self, days: int = 30) -> dict[str, Any]:
        """
        Get comprehensive AI performance metrics.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with performance metrics
        """
        cutoff = timezone.now() - timedelta(days=days)
        actions = AgentAction.objects.filter(created_at__gte=cutoff)

        total = actions.count()
        if total == 0:
            return {
                "period_days": days,
                "total_actions": 0,
                "message": "No actions in the specified period",
            }

        # Status breakdown
        status_counts = dict(
            actions.values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        # Calculate rates
        executed = status_counts.get("executed", 0)
        rejected = status_counts.get("rejected", 0)
        failed = status_counts.get("failed", 0)

        # Outcome scores
        scored_actions = actions.filter(outcome_score__isnull=False)
        avg_score = scored_actions.aggregate(avg=Avg("outcome_score"))["avg"]

        # Score distribution
        positive_outcomes = scored_actions.filter(outcome_score__gt=0).count()
        negative_outcomes = scored_actions.filter(outcome_score__lt=0).count()
        neutral_outcomes = scored_actions.filter(outcome_score=0).count()

        # By action type
        by_type = {}
        for action_type in AgentAction.ActionType.choices:
            type_code = action_type[0]
            type_actions = actions.filter(action_type=type_code)
            type_scored = type_actions.filter(outcome_score__isnull=False)

            by_type[type_code] = {
                "total": type_actions.count(),
                "executed": type_actions.filter(status="executed").count(),
                "avg_score": type_scored.aggregate(avg=Avg("outcome_score"))["avg"],
                "outcomes_recorded": type_scored.count(),
            }

        # AI usage stats
        logs_with_tokens = AgentLog.objects.filter(
            created_at__gte=cutoff,
            tokens_used__isnull=False,
        )
        total_tokens = (
            logs_with_tokens.aggregate(total=Sum("tokens_used"))["total"] or 0
        )
        avg_latency = logs_with_tokens.aggregate(avg=Avg("ai_latency_ms"))["avg"]

        return {
            "period_days": days,
            "total_actions": total,
            "status_breakdown": {
                "pending": status_counts.get("pending", 0),
                "approved": status_counts.get("approved", 0),
                "executed": executed,
                "rejected": rejected,
                "failed": failed,
            },
            "rates": {
                "execution_rate": round(executed / total * 100, 1) if total > 0 else 0,
                "rejection_rate": round(rejected / total * 100, 1) if total > 0 else 0,
                "failure_rate": round(failed / total * 100, 1) if total > 0 else 0,
                "approval_rate": (
                    round(
                        (executed + status_counts.get("approved", 0)) / total * 100, 1
                    )
                    if total > 0
                    else 0
                ),
            },
            "outcomes": {
                "total_recorded": scored_actions.count(),
                "avg_score": round(avg_score, 3) if avg_score else None,
                "positive": positive_outcomes,
                "negative": negative_outcomes,
                "neutral": neutral_outcomes,
            },
            "by_action_type": by_type,
            "ai_usage": {
                "total_tokens_used": total_tokens,
                "avg_latency_ms": round(avg_latency, 1) if avg_latency else None,
            },
        }

    def get_trend_data(self, days: int = 30) -> list[dict]:
        """
        Get daily trend data for actions.

        Args:
            days: Number of days to analyze

        Returns:
            List of daily metrics
        """
        cutoff = timezone.now() - timedelta(days=days)

        daily_data = (
            AgentAction.objects.filter(created_at__gte=cutoff)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                total=Count("id"),
                executed=Count("id", filter=Q(status="executed")),
                rejected=Count("id", filter=Q(status="rejected")),
                failed=Count("id", filter=Q(status="failed")),
            )
            .order_by("date")
        )

        return list(daily_data)

    def get_action_type_effectiveness(self) -> dict[str, Any]:
        """
        Analyze effectiveness of each action type.

        Returns:
            Dictionary with effectiveness metrics per action type
        """
        results = {}

        for action_type, display_name in AgentAction.ActionType.choices:
            actions = AgentAction.objects.filter(action_type=action_type)
            total = actions.count()

            if total == 0:
                results[action_type] = {
                    "display_name": display_name,
                    "total": 0,
                    "executed": 0,
                    "execution_rate": 0,
                    "avg_outcome_score": None,
                    "outcomes_recorded": 0,
                    "effectiveness": None,
                }
                continue

            executed = actions.filter(status="executed").count()
            scored = actions.filter(outcome_score__isnull=False)
            avg_score = scored.aggregate(avg=Avg("outcome_score"))["avg"]

            # Calculate effectiveness score (combination of execution rate and outcome)
            execution_rate = executed / total
            outcome_rate = (
                (avg_score + 1) / 2 if avg_score else 0.5
            )  # Normalize -1,1 to 0,1

            # Weighted effectiveness (60% execution, 40% outcome)
            effectiveness = (execution_rate * 0.6 + outcome_rate * 0.4) * 100

            results[action_type] = {
                "display_name": display_name,
                "total": total,
                "executed": executed,
                "execution_rate": round(execution_rate * 100, 1),
                "avg_outcome_score": round(avg_score, 2) if avg_score else None,
                "outcomes_recorded": scored.count(),
                "effectiveness": round(effectiveness, 1),
            }

        return results

    def get_recommendations(self) -> list[dict]:
        """
        Generate recommendations for improving AI agent performance.

        Returns:
            List of recommendation dictionaries
        """
        recommendations = []
        effectiveness = self.get_action_type_effectiveness()
        summary = self.get_performance_summary(days=30)

        # Check overall rejection rate
        if summary.get("rates", {}).get("rejection_rate", 0) > 30:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "approval_workflow",
                    "title": "High Action Rejection Rate",
                    "description": f"Rejection rate is {summary['rates']['rejection_rate']}%. Consider reviewing AI prompts or adjusting thresholds.",
                    "action": "Review rejected actions to identify patterns and refine AI decision criteria.",
                }
            )

        # Check failure rate
        if summary.get("rates", {}).get("failure_rate", 0) > 10:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "reliability",
                    "title": "Elevated Action Failure Rate",
                    "description": f"Failure rate is {summary['rates']['failure_rate']}%. This may indicate integration issues.",
                    "action": "Review error logs for failed actions and fix underlying issues.",
                }
            )

        # Check for underperforming action types
        for action_type, data in effectiveness.items():
            eff = data.get("effectiveness")
            if data["total"] >= 10 and eff is not None and eff < 40:
                recommendations.append(
                    {
                        "priority": "medium",
                        "category": "effectiveness",
                        "title": f"Low Effectiveness: {data['display_name']}",
                        "description": f"{data['display_name']} has only {eff}% effectiveness.",
                        "action": f"Consider disabling or refining the {data['display_name']} capability.",
                    }
                )

        # Check outcome recording
        outcomes = summary.get("outcomes", {})
        if outcomes.get("total_recorded", 0) < summary.get("total_actions", 0) * 0.2:
            recommendations.append(
                {
                    "priority": "low",
                    "category": "learning",
                    "title": "Low Outcome Recording",
                    "description": "Less than 20% of actions have recorded outcomes. This limits learning.",
                    "action": "Encourage users to record outcomes for executed actions.",
                }
            )

        # Check for negative outcome trends
        if outcomes.get("negative", 0) > outcomes.get("positive", 0):
            recommendations.append(
                {
                    "priority": "high",
                    "category": "performance",
                    "title": "More Negative Than Positive Outcomes",
                    "description": "The majority of recorded outcomes are negative.",
                    "action": "Review AI decision criteria and consider more conservative thresholds.",
                }
            )

        return recommendations

    def update_daily_metrics(self, date=None):
        """
        Update or create daily metrics record.

        Args:
            date: Date to update (defaults to today)
        """
        if date is None:
            date = timezone.now().date()

        # Get actions for the date
        actions = AgentAction.objects.filter(
            created_at__date=date,
        )

        # Get logs for token usage
        logs = AgentLog.objects.filter(
            created_at__date=date,
            tokens_used__isnull=False,
        )

        metrics, _ = AgentMetrics.objects.update_or_create(
            date=date,
            defaults={
                "total_actions": actions.count(),
                "actions_executed": actions.filter(status="executed").count(),
                "actions_approved": actions.filter(status="approved").count(),
                "actions_rejected": actions.filter(status="rejected").count(),
                "actions_failed": actions.filter(status="failed").count(),
                "email_notes_created": actions.filter(
                    action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED
                ).count(),
                "appointment_reminders_sent": actions.filter(
                    action_type=AgentAction.ActionType.APPOINTMENT_REMINDER
                ).count(),
                "task_reminders_sent": actions.filter(
                    action_type=AgentAction.ActionType.TASK_REMINDER
                ).count(),
                "tasks_escalated": actions.filter(
                    action_type=AgentAction.ActionType.TASK_ESCALATED
                ).count(),
                "insights_generated": actions.filter(
                    action_type=AgentAction.ActionType.INSIGHT_GENERATED
                ).count(),
                "total_ai_calls": logs.count(),
                "total_tokens_used": logs.aggregate(total=Sum("tokens_used"))["total"]
                or 0,
                "avg_ai_latency_ms": logs.aggregate(avg=Avg("ai_latency_ms"))["avg"],
                "avg_outcome_score": actions.filter(
                    outcome_score__isnull=False
                ).aggregate(avg=Avg("outcome_score"))["avg"],
                "outcomes_recorded": actions.filter(
                    outcome_score__isnull=False
                ).count(),
            },
        )

        self._log("info", f"Updated metrics for {date}", {"date": str(date)})
        return metrics

    def backfill_metrics(self, days: int = 30):
        """
        Backfill metrics for the past N days.

        Args:
            days: Number of days to backfill
        """
        today = timezone.now().date()
        for i in range(days):
            date = today - timedelta(days=i)
            self.update_daily_metrics(date)

    def get_learning_progress(self) -> dict[str, Any]:
        """
        Get metrics showing how the AI is improving over time.

        Returns:
            Dictionary with learning progress indicators
        """
        now = timezone.now()

        # Compare last 30 days to previous 30 days
        recent_cutoff = now - timedelta(days=30)
        older_cutoff = now - timedelta(days=60)

        recent_actions = AgentAction.objects.filter(
            created_at__gte=recent_cutoff,
            outcome_score__isnull=False,
        )
        older_actions = AgentAction.objects.filter(
            created_at__gte=older_cutoff,
            created_at__lt=recent_cutoff,
            outcome_score__isnull=False,
        )

        recent_avg = recent_actions.aggregate(avg=Avg("outcome_score"))["avg"]
        older_avg = older_actions.aggregate(avg=Avg("outcome_score"))["avg"]

        recent_rejection = AgentAction.objects.filter(
            created_at__gte=recent_cutoff,
            status="rejected",
        ).count()
        recent_total = AgentAction.objects.filter(created_at__gte=recent_cutoff).count()

        older_rejection = AgentAction.objects.filter(
            created_at__gte=older_cutoff,
            created_at__lt=recent_cutoff,
            status="rejected",
        ).count()
        older_total = AgentAction.objects.filter(
            created_at__gte=older_cutoff,
            created_at__lt=recent_cutoff,
        ).count()

        return {
            "recent_period": "Last 30 days",
            "comparison_period": "30-60 days ago",
            "outcome_score": {
                "recent": round(recent_avg, 3) if recent_avg else None,
                "previous": round(older_avg, 3) if older_avg else None,
                "improvement": (
                    round(recent_avg - older_avg, 3)
                    if recent_avg and older_avg
                    else None
                ),
            },
            "rejection_rate": {
                "recent": (
                    round(recent_rejection / recent_total * 100, 1)
                    if recent_total > 0
                    else 0
                ),
                "previous": (
                    round(older_rejection / older_total * 100, 1)
                    if older_total > 0
                    else 0
                ),
            },
            "sample_sizes": {
                "recent_with_outcomes": recent_actions.count(),
                "previous_with_outcomes": older_actions.count(),
            },
        }

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
            component="learning_engine",
            message=message,
            context=context or {},
            action=action,
        )
        getattr(logger, level if level != "decision" else "info")(message)
