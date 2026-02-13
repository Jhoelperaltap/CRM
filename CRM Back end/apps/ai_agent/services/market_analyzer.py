"""
Market Analyzer service for the AI Agent.
Analyzes business metrics and generates insights.
"""

import logging
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncWeek
from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentInsight, AgentLog

logger = logging.getLogger(__name__)


class MarketAnalyzer:
    """
    Analyzes business metrics and generates actionable insights.
    """

    SYSTEM_PROMPT = """You are a business analyst AI for a tax services CRM.
Your job is to analyze business metrics and identify:
1. STRENGTHS - What is working well
2. WEAKNESSES - Areas needing improvement
3. OPPORTUNITIES - Potential growth areas
4. THREATS - Risks or concerning trends
5. KEY METRICS - Important numbers to track

Be specific and actionable. Provide concrete recommendations.
Focus on metrics that matter for a tax preparation business:
- Client retention and acquisition
- Case completion rates and timelines
- Revenue per client
- Staff productivity
- Seasonal patterns (tax season vs off-season)
"""

    def __init__(self, config, ai_service=None):
        """
        Initialize market analyzer.

        Args:
            config: AgentConfiguration instance
            ai_service: Optional AIService instance
        """
        self.config = config
        self.ai_service = ai_service

    def analyze_business_metrics(self) -> list[AgentInsight]:
        """
        Perform comprehensive business analysis and generate insights.

        Returns:
            List of generated AgentInsight objects
        """
        self._log("info", "Starting business metrics analysis")

        try:
            # Gather metrics from various sources
            metrics = {
                "revenue": self._get_revenue_metrics(),
                "cases": self._get_case_metrics(),
                "clients": self._get_client_metrics(),
                "tasks": self._get_task_metrics(),
                "appointments": self._get_appointment_metrics(),
                "email": self._get_email_metrics(),
            }

            self._log(
                "debug",
                "Metrics gathered",
                {"metrics_summary": self._summarize_metrics(metrics)},
            )

            # If AI service available, get AI-generated insights
            if self.ai_service:
                insights = self._generate_ai_insights(metrics)
            else:
                # Generate rule-based insights
                insights = self._generate_rule_based_insights(metrics)

            self._log(
                "info",
                f"Generated {len(insights)} business insights",
                {"insight_count": len(insights)},
            )

            return insights

        except Exception as e:
            self._log("error", f"Failed to analyze business metrics: {e}")
            raise

    def _get_revenue_metrics(self) -> dict[str, Any]:
        """Get revenue-related metrics."""
        from apps.cases.models import TaxCase

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        year_start = now.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )

        # Cases as proxy for revenue (if no direct revenue field)
        this_month_cases = TaxCase.objects.filter(
            created_at__gte=this_month_start,
        ).count()

        last_month_cases = TaxCase.objects.filter(
            created_at__gte=last_month_start,
            created_at__lt=this_month_start,
        ).count()

        ytd_cases = TaxCase.objects.filter(created_at__gte=year_start).count()

        completed_this_month = TaxCase.objects.filter(
            status="completed",
            completed_date__gte=this_month_start.date(),
        ).count()

        return {
            "this_month_new_cases": this_month_cases,
            "last_month_new_cases": last_month_cases,
            "month_over_month_change": (
                round((this_month_cases - last_month_cases) / last_month_cases * 100, 1)
                if last_month_cases > 0
                else 0
            ),
            "ytd_new_cases": ytd_cases,
            "completed_this_month": completed_this_month,
        }

    def _get_case_metrics(self) -> dict[str, Any]:
        """Get case-related metrics."""
        from apps.cases.models import TaxCase

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        total_active = TaxCase.objects.filter(
            status__in=["intake", "document_collection", "in_preparation", "in_review"],
        ).count()

        by_status = dict(
            TaxCase.objects.values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        by_type = dict(
            TaxCase.objects.values("case_type")
            .annotate(count=Count("id"))
            .values_list("case_type", "count")
        )

        # Average time to completion
        completed_cases = TaxCase.objects.filter(
            status="completed",
            completed_date__isnull=False,
            created_at__gte=thirty_days_ago,
        )

        avg_days_to_complete = None
        if completed_cases.exists():
            total_days = sum(
                (c.completed_date - c.created_at.date()).days
                for c in completed_cases
                if c.completed_date
            )
            avg_days_to_complete = round(total_days / completed_cases.count(), 1)

        return {
            "total_active_cases": total_active,
            "by_status": by_status,
            "by_type": by_type,
            "avg_days_to_complete": avg_days_to_complete,
            "completed_last_30_days": completed_cases.count(),
        }

    def _get_client_metrics(self) -> dict[str, Any]:
        """Get client-related metrics."""
        from apps.contacts.models import Contact

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

        total_contacts = Contact.objects.filter(status="active").count()
        new_this_month = Contact.objects.filter(
            created_at__gte=this_month_start
        ).count()
        new_last_month = Contact.objects.filter(
            created_at__gte=last_month_start,
            created_at__lt=this_month_start,
        ).count()

        # Contacts with active cases (engaged clients)
        contacts_with_active_cases = (
            Contact.objects.filter(
                tax_cases__status__in=[
                    "intake",
                    "document_collection",
                    "in_preparation",
                    "in_review",
                ],
            )
            .distinct()
            .count()
        )

        return {
            "total_active_contacts": total_contacts,
            "new_contacts_this_month": new_this_month,
            "new_contacts_last_month": new_last_month,
            "contacts_with_active_cases": contacts_with_active_cases,
            "engagement_rate": (
                round(contacts_with_active_cases / total_contacts * 100, 1)
                if total_contacts > 0
                else 0
            ),
        }

    def _get_task_metrics(self) -> dict[str, Any]:
        """Get task efficiency metrics."""
        from apps.tasks.models import Task

        now = timezone.now()
        today = now.date()
        seven_days_ago = now - timedelta(days=7)

        total_open = Task.objects.filter(status__in=["todo", "in_progress"]).count()
        overdue = Task.objects.filter(
            due_date__lt=today, status__in=["todo", "in_progress"]
        ).count()

        completed_last_week = Task.objects.filter(
            status="completed",
            updated_at__gte=seven_days_ago,
        ).count()

        # SLA breach rate
        breached = Task.objects.filter(sla_breached_at__isnull=False).count()
        total_with_sla = Task.objects.filter(sla_hours__isnull=False).count()

        return {
            "total_open_tasks": total_open,
            "overdue_tasks": overdue,
            "overdue_percentage": (
                round(overdue / total_open * 100, 1) if total_open > 0 else 0
            ),
            "completed_last_week": completed_last_week,
            "sla_breach_rate": (
                round(breached / total_with_sla * 100, 1) if total_with_sla > 0 else 0
            ),
        }

    def _get_appointment_metrics(self) -> dict[str, Any]:
        """Get appointment metrics."""
        from apps.appointments.models import Appointment

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = now - timedelta(days=7)

        this_month_appointments = Appointment.objects.filter(
            start_datetime__gte=this_month_start,
        ).count()

        completed = Appointment.objects.filter(
            status="completed",
            start_datetime__gte=seven_days_ago,
        ).count()

        no_shows = Appointment.objects.filter(
            status="no_show",
            start_datetime__gte=seven_days_ago,
        ).count()

        cancelled = Appointment.objects.filter(
            status="cancelled",
            start_datetime__gte=seven_days_ago,
        ).count()

        upcoming_week = Appointment.objects.filter(
            start_datetime__gte=now,
            start_datetime__lt=now + timedelta(days=7),
            status__in=["scheduled", "confirmed"],
        ).count()

        return {
            "appointments_this_month": this_month_appointments,
            "completed_last_week": completed,
            "no_shows_last_week": no_shows,
            "cancelled_last_week": cancelled,
            "no_show_rate": (
                round(no_shows / (completed + no_shows) * 100, 1)
                if (completed + no_shows) > 0
                else 0
            ),
            "upcoming_next_week": upcoming_week,
        }

    def _get_email_metrics(self) -> dict[str, Any]:
        """Get email communication metrics."""
        from apps.emails.models import EmailMessage

        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)

        received = EmailMessage.objects.filter(
            direction="inbound",
            created_at__gte=seven_days_ago,
        ).count()

        sent = EmailMessage.objects.filter(
            direction="outbound",
            sent_at__gte=seven_days_ago,
        ).count()

        # Unread/pending emails
        unread = EmailMessage.objects.filter(
            direction="inbound",
            is_read=False,
        ).count()

        return {
            "received_last_week": received,
            "sent_last_week": sent,
            "unread_emails": unread,
            "response_ratio": round(sent / received, 2) if received > 0 else 0,
        }

    def _summarize_metrics(self, metrics: dict) -> dict:
        """Create a summary of key metrics for logging."""
        return {
            "active_cases": metrics.get("cases", {}).get("total_active_cases", 0),
            "total_contacts": metrics.get("clients", {}).get(
                "total_active_contacts", 0
            ),
            "overdue_tasks": metrics.get("tasks", {}).get("overdue_tasks", 0),
            "upcoming_appointments": metrics.get("appointments", {}).get(
                "upcoming_next_week", 0
            ),
        }

    def _generate_ai_insights(self, metrics: dict) -> list[AgentInsight]:
        """Generate insights using AI analysis."""
        import json

        focus_areas = self.config.focus_areas or [
            "revenue",
            "efficiency",
            "client_satisfaction",
        ]

        prompt = f"""Analyze these business metrics for a tax services CRM and identify insights.

Metrics:
{json.dumps(metrics, indent=2, default=str)}

Focus Areas: {', '.join(focus_areas)}

For each insight, provide:
1. Type: strength, weakness, opportunity, threat, trend, or metric
2. Title: Brief descriptive title
3. Description: Detailed explanation
4. Priority: 1-10 (10 being most critical)
5. Is Actionable: true/false
6. Recommended Action: What to do about it

Respond with JSON array:
[
    {{
        "type": "strength|weakness|opportunity|threat|trend|metric",
        "title": "Brief title",
        "description": "Detailed description",
        "priority": 7,
        "is_actionable": true,
        "recommended_action": "Specific action to take",
        "supporting_data": {{"key": "value"}}
    }}
]

Generate 3-5 most important insights."""

        try:
            result = self.ai_service.analyze(
                prompt=prompt,
                system_prompt=self.SYSTEM_PROMPT,
                json_response=True,
            )

            content = result.get("content", [])
            if isinstance(content, str):
                import json

                content = json.loads(content)

            self._log(
                "debug",
                f"AI analysis complete, generated {len(content)} raw insights",
                {"tokens_used": result.get("tokens_used", 0)},
            )

            return self._save_insights(content, result)

        except Exception as e:
            self._log("error", f"AI analysis failed: {e}")
            # Fall back to rule-based insights
            return self._generate_rule_based_insights(metrics)

    def _generate_rule_based_insights(self, metrics: dict) -> list[AgentInsight]:
        """Generate insights using rule-based logic when AI is unavailable."""
        insights_data = []

        # Check task overdue rate
        task_metrics = metrics.get("tasks", {})
        overdue_pct = task_metrics.get("overdue_percentage", 0)
        if overdue_pct > 20:
            insights_data.append(
                {
                    "type": "weakness",
                    "title": f"High Task Overdue Rate: {overdue_pct}%",
                    "description": f"{task_metrics.get('overdue_tasks', 0)} tasks are currently overdue. This may indicate resource constraints or workflow issues.",
                    "priority": 8,
                    "is_actionable": True,
                    "recommended_action": "Review overdue tasks and reassign or escalate as needed. Consider adding resources or adjusting deadlines.",
                    "supporting_data": task_metrics,
                }
            )

        # Check appointment no-show rate
        appt_metrics = metrics.get("appointments", {})
        no_show_rate = appt_metrics.get("no_show_rate", 0)
        if no_show_rate > 15:
            insights_data.append(
                {
                    "type": "threat",
                    "title": f"High No-Show Rate: {no_show_rate}%",
                    "description": "Appointment no-show rate is above acceptable threshold. This impacts productivity and revenue.",
                    "priority": 7,
                    "is_actionable": True,
                    "recommended_action": "Implement reminder calls/texts 24h and 2h before appointments. Consider requiring deposits for appointments.",
                    "supporting_data": appt_metrics,
                }
            )

        # Check client growth
        client_metrics = metrics.get("clients", {})
        new_this_month = client_metrics.get("new_contacts_this_month", 0)
        new_last_month = client_metrics.get("new_contacts_last_month", 0)
        if new_this_month > new_last_month * 1.2:
            insights_data.append(
                {
                    "type": "strength",
                    "title": "Strong Client Acquisition",
                    "description": f"New client acquisition is up. {new_this_month} new contacts this month vs {new_last_month} last month.",
                    "priority": 6,
                    "is_actionable": False,
                    "recommended_action": "Continue current marketing efforts. Ensure capacity to handle growth.",
                    "supporting_data": client_metrics,
                }
            )
        elif new_this_month < new_last_month * 0.8 and new_last_month > 0:
            insights_data.append(
                {
                    "type": "weakness",
                    "title": "Declining Client Acquisition",
                    "description": f"New client acquisition is down. {new_this_month} new contacts this month vs {new_last_month} last month.",
                    "priority": 7,
                    "is_actionable": True,
                    "recommended_action": "Review marketing spend and referral programs. Consider promotional offers.",
                    "supporting_data": client_metrics,
                }
            )

        # Check email response ratio
        email_metrics = metrics.get("email", {})
        response_ratio = email_metrics.get("response_ratio", 0)
        if response_ratio < 0.5 and email_metrics.get("received_last_week", 0) > 10:
            insights_data.append(
                {
                    "type": "weakness",
                    "title": "Low Email Response Rate",
                    "description": f"Response ratio is {response_ratio:.2f}. Many incoming emails may not be getting timely responses.",
                    "priority": 6,
                    "is_actionable": True,
                    "recommended_action": "Review email queue and prioritize client communications. Consider email templates for common responses.",
                    "supporting_data": email_metrics,
                }
            )

        # Check case completion rate
        case_metrics = metrics.get("cases", {})
        if case_metrics.get("avg_days_to_complete"):
            avg_days = case_metrics["avg_days_to_complete"]
            if avg_days > 30:
                insights_data.append(
                    {
                        "type": "opportunity",
                        "title": f"Case Completion Time: {avg_days} days average",
                        "description": "Average case completion time could be improved. Faster turnaround may improve client satisfaction.",
                        "priority": 5,
                        "is_actionable": True,
                        "recommended_action": "Identify bottlenecks in case workflow. Consider automation for document collection.",
                        "supporting_data": case_metrics,
                    }
                )

        return self._save_insights(insights_data, None)

    @transaction.atomic
    def _save_insights(
        self, insights_data: list, ai_result: dict | None
    ) -> list[AgentInsight]:
        """Save insights to database."""
        saved_insights = []

        # Create action for tracking
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.INSIGHT_GENERATED,
            status=AgentAction.Status.EXECUTED,
            title=f"Generated {len(insights_data)} business insights",
            description="Automated business metrics analysis",
            reasoning="Scheduled daily business analysis",
            action_data={
                "insight_count": len(insights_data),
                "ai_used": ai_result is not None,
            },
            requires_approval=False,
            executed_at=timezone.now(),
        )

        type_mapping = {
            "strength": AgentInsight.InsightType.STRENGTH,
            "weakness": AgentInsight.InsightType.WEAKNESS,
            "opportunity": AgentInsight.InsightType.OPPORTUNITY,
            "threat": AgentInsight.InsightType.THREAT,
            "trend": AgentInsight.InsightType.TREND,
            "metric": AgentInsight.InsightType.METRIC,
        }

        for data in insights_data:
            insight_type = type_mapping.get(
                data.get("type", "recommendation").lower(),
                AgentInsight.InsightType.RECOMMENDATION,
            )

            insight = AgentInsight.objects.create(
                insight_type=insight_type,
                title=data.get("title", "Untitled Insight"),
                description=data.get("description", ""),
                supporting_data=data.get("supporting_data", {}),
                priority=min(max(data.get("priority", 5), 1), 10),
                is_actionable=data.get("is_actionable", True),
                recommended_action=data.get("recommended_action", ""),
                source_action=action,
            )
            saved_insights.append(insight)

        self._log(
            "decision",
            f"Saved {len(saved_insights)} insights",
            {
                "action_id": str(action.id),
                "insight_ids": [str(i.id) for i in saved_insights],
            },
            action=action,
        )

        return saved_insights

    def get_trend_analysis(self, metric: str, days: int = 30) -> dict[str, Any]:
        """Get trend data for a specific metric over time."""
        from apps.cases.models import TaxCase
        from apps.contacts.models import Contact

        now = timezone.now()
        start_date = now - timedelta(days=days)

        if metric == "cases":
            trend_data = (
                TaxCase.objects.filter(created_at__gte=start_date)
                .annotate(week=TruncWeek("created_at"))
                .values("week")
                .annotate(count=Count("id"))
                .order_by("week")
            )
        elif metric == "contacts":
            trend_data = (
                Contact.objects.filter(created_at__gte=start_date)
                .annotate(week=TruncWeek("created_at"))
                .values("week")
                .annotate(count=Count("id"))
                .order_by("week")
            )
        else:
            return {"error": f"Unknown metric: {metric}"}

        return {
            "metric": metric,
            "period_days": days,
            "data": list(trend_data),
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
            component="market_analyzer",
            message=message,
            context=context or {},
            action=action,
        )
        getattr(logger, level if level != "decision" else "info")(message)
