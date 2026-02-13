"""
Task Enforcer service for the AI Agent.
Monitors task completion and sends reminders/escalations.
"""

import logging
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentLog

logger = logging.getLogger(__name__)


class TaskEnforcer:
    """
    Monitors tasks and enforces completion through reminders and escalations.
    """

    def __init__(self, config):
        """
        Initialize task enforcer.

        Args:
            config: AgentConfiguration instance
        """
        self.config = config

    def check_overdue_tasks(self) -> list[AgentAction]:
        """
        Find and handle overdue tasks.

        Returns:
            List of created AgentAction objects
        """
        from apps.tasks.models import Task

        now = timezone.now()
        created_actions = []

        # Find overdue tasks (due date has passed, not completed or cancelled)
        overdue_tasks = Task.objects.filter(
            due_date__lt=now.date(),
            status__in=["TODO", "IN_PROGRESS", "todo", "in_progress"],
        ).select_related("assigned_to", "contact", "case")

        for task in overdue_tasks:
            days_overdue = (now.date() - task.due_date).days

            # Escalate if 3+ days overdue and not already escalated
            if days_overdue >= 3:
                if not self._has_escalation(task):
                    action = self._create_escalation_action(task, days_overdue)
                    if action:
                        created_actions.append(action)
            # Send reminder if 1+ days overdue and no recent reminder
            elif days_overdue >= 1:
                if not self._has_recent_reminder(task, hours=24):
                    action = self._create_reminder_action(task, days_overdue, is_overdue=True)
                    if action:
                        created_actions.append(action)

        self._log(
            "info",
            f"Checked {overdue_tasks.count()} overdue tasks, created {len(created_actions)} actions",
            {"overdue_count": overdue_tasks.count(), "actions_created": len(created_actions)},
        )

        return created_actions

    def check_upcoming_deadlines(self) -> list[AgentAction]:
        """
        Check for tasks with upcoming deadlines and send reminders.

        Returns:
            List of created AgentAction objects
        """
        from apps.tasks.models import Task

        now = timezone.now()
        hours = self.config.task_reminder_hours_before
        cutoff = now + timedelta(hours=hours)
        created_actions = []

        # Find tasks due soon that haven't been reminded
        upcoming_tasks = Task.objects.filter(
            due_date__lte=cutoff.date(),
            due_date__gt=now.date(),
            status__in=["TODO", "todo"],  # Only pending tasks
        ).select_related("assigned_to", "contact", "case")

        for task in upcoming_tasks:
            if not self._has_upcoming_reminder(task):
                hours_until = ((task.due_date - now.date()).days * 24) + (24 - now.hour)
                action = self._create_reminder_action(task, hours_until, is_overdue=False)
                if action:
                    created_actions.append(action)

        self._log(
            "info",
            f"Checked {upcoming_tasks.count()} upcoming tasks, created {len(created_actions)} reminders",
            {"upcoming_count": upcoming_tasks.count(), "actions_created": len(created_actions)},
        )

        return created_actions

    def _has_escalation(self, task) -> bool:
        """Check if task has been escalated."""
        return AgentAction.objects.filter(
            related_task=task,
            action_type=AgentAction.ActionType.TASK_ESCALATED,
        ).exists()

    def _has_recent_reminder(self, task, hours: int = 24) -> bool:
        """Check if task has a recent reminder."""
        cutoff = timezone.now() - timedelta(hours=hours)
        return AgentAction.objects.filter(
            related_task=task,
            action_type=AgentAction.ActionType.TASK_REMINDER,
            created_at__gte=cutoff,
        ).exists()

    def _has_upcoming_reminder(self, task) -> bool:
        """Check if task has an upcoming deadline reminder."""
        return AgentAction.objects.filter(
            related_task=task,
            action_type=AgentAction.ActionType.TASK_REMINDER,
            action_data__reminder_type="upcoming",
        ).exists()

    @transaction.atomic
    def _create_reminder_action(
        self,
        task,
        time_value: int,
        is_overdue: bool,
    ) -> AgentAction | None:
        """Create a reminder action for a task."""
        try:
            reminder_type = "overdue" if is_overdue else "upcoming"
            time_unit = "days" if is_overdue else "hours"

            if is_overdue:
                title = f"OVERDUE: {task.title} ({time_value} days overdue)"
                urgency = "high" if time_value >= 2 else "medium"
            else:
                title = f"Due Soon: {task.title}"
                urgency = "medium"

            message = self._build_reminder_message(task, time_value, is_overdue)

            action = AgentAction.objects.create(
                action_type=AgentAction.ActionType.TASK_REMINDER,
                status=AgentAction.Status.PENDING,
                title=title,
                description=message,
                reasoning=f"Automated {reminder_type} task reminder",
                action_data={
                    "task_id": str(task.id),
                    "task_title": task.title,
                    "reminder_type": reminder_type,
                    "time_value": time_value,
                    "time_unit": time_unit,
                    "urgency": urgency,
                    "due_date": task.due_date.isoformat(),
                    "assigned_to_id": str(task.assigned_to.id) if task.assigned_to else None,
                    "assigned_to_email": task.assigned_to.email if task.assigned_to else None,
                    "message": message,
                },
                related_task=task,
                related_contact=task.contact,
                related_case=task.case,
                requires_approval=not self.config.autonomous_actions_enabled,
            )

            if self.config.autonomous_actions_enabled:
                self._execute_reminder(action)

            self._log(
                "decision",
                f"Created {reminder_type} reminder for task: {task.title}",
                {
                    "action_id": str(action.id),
                    "task_id": str(task.id),
                    "reminder_type": reminder_type,
                },
                action=action,
            )

            return action

        except Exception as e:
            self._log("error", f"Failed to create task reminder: {e}", {"task_id": str(task.id)})
            return None

    @transaction.atomic
    def _create_escalation_action(self, task, days_overdue: int) -> AgentAction | None:
        """Create an escalation action for a severely overdue task."""
        try:
            title = f"ESCALATION: {task.title} ({days_overdue} days overdue)"
            message = self._build_escalation_message(task, days_overdue)

            # Determine who to escalate to
            escalate_to = self._get_escalation_target(task)

            action = AgentAction.objects.create(
                action_type=AgentAction.ActionType.TASK_ESCALATED,
                status=AgentAction.Status.PENDING,
                title=title,
                description=message,
                reasoning=f"Task is {days_overdue} days overdue, escalating to management",
                action_data={
                    "task_id": str(task.id),
                    "task_title": task.title,
                    "days_overdue": days_overdue,
                    "due_date": task.due_date.isoformat(),
                    "assigned_to_id": str(task.assigned_to.id) if task.assigned_to else None,
                    "assigned_to_name": task.assigned_to.get_full_name() if task.assigned_to else None,
                    "escalate_to_id": str(escalate_to.id) if escalate_to else None,
                    "escalate_to_email": escalate_to.email if escalate_to else None,
                    "message": message,
                    "priority": task.priority,
                },
                related_task=task,
                related_contact=task.contact,
                related_case=task.case,
                requires_approval=not self.config.autonomous_actions_enabled,
            )

            if self.config.autonomous_actions_enabled:
                self._execute_escalation(action)

            self._log(
                "decision",
                f"Created escalation for task: {task.title}",
                {
                    "action_id": str(action.id),
                    "task_id": str(task.id),
                    "days_overdue": days_overdue,
                },
                action=action,
            )

            return action

        except Exception as e:
            self._log("error", f"Failed to create task escalation: {e}", {"task_id": str(task.id)})
            return None

    def _build_reminder_message(self, task, time_value: int, is_overdue: bool) -> str:
        """Build reminder message content."""
        if is_overdue:
            status_line = f"This task is {time_value} day{'s' if time_value != 1 else ''} overdue!"
        else:
            status_line = f"This task is due within the next {time_value} hours."

        message = f"""Task Reminder: {task.title}

{status_line}

Details:
- Priority: {task.get_priority_display() if hasattr(task, 'get_priority_display') else task.priority}
- Due Date: {task.due_date.strftime('%B %d, %Y')}
- Status: {task.get_status_display() if hasattr(task, 'get_status_display') else task.status}
"""

        if task.assigned_to:
            message += f"- Assigned To: {task.assigned_to.get_full_name()}\n"

        if task.description:
            message += f"\nDescription:\n{task.description[:500]}\n"

        if task.contact:
            message += (
                f"\nRelated Contact: {task.contact.first_name} {task.contact.last_name}\n"
            )

        if task.case:
            message += f"Related Case: {task.case.case_number}\n"

        return message

    def _build_escalation_message(self, task, days_overdue: int) -> str:
        """Build escalation message content."""
        message = f"""TASK ESCALATION

Task "{task.title}" has been overdue for {days_overdue} days and requires immediate attention.

Task Details:
- Due Date: {task.due_date.strftime('%B %d, %Y')}
- Days Overdue: {days_overdue}
- Priority: {task.get_priority_display() if hasattr(task, 'get_priority_display') else task.priority}
- Status: {task.get_status_display() if hasattr(task, 'get_status_display') else task.status}
"""

        if task.assigned_to:
            message += f"- Currently Assigned To: {task.assigned_to.get_full_name()} ({task.assigned_to.email})\n"

        if task.description:
            message += f"\nDescription:\n{task.description[:500]}\n"

        message += "\nRecommended Actions:\n"
        message += "1. Contact the assigned team member to determine blockers\n"
        message += "2. Consider reassigning if original assignee is unavailable\n"
        message += "3. Update stakeholders on the delay if client-impacting\n"

        return message

    def _get_escalation_target(self, task):
        """Determine who should receive the escalation."""
        from apps.users.models import User

        # Try to find a manager or admin
        # First, try the assigned user's manager if we have that relationship
        # Otherwise, find any admin user

        admin_users = User.objects.filter(
            Q(is_superuser=True) | Q(role__slug="admin"),
            is_active=True,
        ).exclude(
            id=task.assigned_to.id if task.assigned_to else None
        ).first()

        return admin_users

    def _execute_reminder(self, action: AgentAction):
        """Execute the reminder action."""
        try:
            from apps.notifications.services import create_notification

            reminder_data = action.action_data

            if action.related_task and action.related_task.assigned_to:
                create_notification(
                    recipient=action.related_task.assigned_to,
                    notification_type="task_reminder",
                    title=action.title,
                    message=reminder_data.get("message", "")[:500],
                    severity="warning" if reminder_data.get("urgency") == "high" else "info",
                    related_object=action.related_task,
                )

            action.status = AgentAction.Status.EXECUTED
            action.executed_at = timezone.now()
            action.execution_result = "Sent task reminder notification"
            action.save()

            self._log("info", f"Executed task reminder: {action.title}", {"action_id": str(action.id)}, action=action)

        except Exception as e:
            action.status = AgentAction.Status.FAILED
            action.error_message = str(e)
            action.save()
            self._log("error", f"Failed to execute task reminder: {e}", {"action_id": str(action.id)})

    def _execute_escalation(self, action: AgentAction):
        """Execute the escalation action."""
        try:
            from apps.notifications.services import create_notification

            escalation_data = action.action_data

            # Notify escalation target
            if escalation_data.get("escalate_to_id"):
                from apps.users.models import User

                escalate_to = User.objects.get(id=escalation_data["escalate_to_id"])
                create_notification(
                    recipient=escalate_to,
                    notification_type="task_escalation",
                    title=action.title,
                    message=escalation_data.get("message", "")[:500],
                    severity="error",
                    related_object=action.related_task,
                )

            # Also notify the original assignee
            if action.related_task and action.related_task.assigned_to:
                create_notification(
                    recipient=action.related_task.assigned_to,
                    notification_type="task_escalation",
                    title=f"Your task has been escalated: {action.related_task.title}",
                    message="This task has been escalated due to being significantly overdue.",
                    severity="error",
                    related_object=action.related_task,
                )

            action.status = AgentAction.Status.EXECUTED
            action.executed_at = timezone.now()
            action.execution_result = "Sent escalation notifications"
            action.save()

            self._log("info", f"Executed task escalation: {action.title}", {"action_id": str(action.id)}, action=action)

        except Exception as e:
            action.status = AgentAction.Status.FAILED
            action.error_message = str(e)
            action.save()
            self._log("error", f"Failed to execute escalation: {e}", {"action_id": str(action.id)})

    def get_task_status_summary(self) -> dict[str, Any]:
        """Get summary of task statuses for monitoring."""
        from apps.tasks.models import Task

        now = timezone.now()
        today = now.date()

        total = Task.objects.filter(status__in=["todo", "in_progress"]).count()
        overdue = Task.objects.filter(due_date__lt=today, status__in=["todo", "in_progress"]).count()
        due_today = Task.objects.filter(due_date=today, status__in=["todo", "in_progress"]).count()
        due_this_week = Task.objects.filter(
            due_date__gt=today,
            due_date__lte=today + timedelta(days=7),
            status__in=["todo", "in_progress"],
        ).count()

        return {
            "total_open": total,
            "overdue": overdue,
            "due_today": due_today,
            "due_this_week": due_this_week,
            "overdue_percentage": round((overdue / total * 100) if total > 0 else 0, 1),
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
            component="task_enforcer",
            message=message,
            context=context or {},
            action=action,
        )
        getattr(logger, level if level != "decision" else "info")(message)
