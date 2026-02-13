"""
Celery tasks for scheduled workflow checks.

Signal-driven workflows (case_status_changed, case_created, document_uploaded)
are handled synchronously in signals.py.  The tasks below handle time-based
triggers that need periodic polling.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.workflows.models import WorkflowRule
from apps.workflows.workflow_engine import evaluate_conditions, execute_action

logger = logging.getLogger(__name__)


@shared_task
def run_scheduled_workflows():
    """Master dispatcher — kicks off all scheduled workflow checks."""
    check_appointment_reminders.delay()
    check_document_missing.delay()
    check_due_dates.delay()
    check_overdue_tasks.delay()


@shared_task
def check_appointment_reminders():
    """Find appointments needing a reminder per active workflow rules."""
    from apps.appointments.models import Appointment

    now = timezone.now()
    rules = WorkflowRule.objects.filter(
        is_active=True, trigger_type="appointment_reminder"
    )

    for rule in rules:
        minutes_before = rule.trigger_config.get("minutes_before", 30)
        window_center = now + timedelta(minutes=minutes_before)
        # Check a 5-minute window to avoid missing any
        window_start = window_center - timedelta(minutes=2.5)
        window_end = window_center + timedelta(minutes=2.5)

        appointments = Appointment.objects.filter(
            start_datetime__gte=window_start,
            start_datetime__lte=window_end,
            status__in=["scheduled", "confirmed"],
        ).select_related("contact", "assigned_to", "case")

        for apt in appointments:
            if evaluate_conditions(rule, apt, {}):
                execute_action(
                    rule, apt, {"minutes_before": minutes_before}
                )


@shared_task
def check_document_missing():
    """Find cases missing required documents per active workflow rules."""
    from apps.cases.models import TaxCase
    from apps.documents.models import Document

    rules = WorkflowRule.objects.filter(
        is_active=True, trigger_type="document_missing_check"
    )

    for rule in rules:
        required_types = rule.trigger_config.get(
            "required_doc_types", ["w2", "1099"]
        )
        active_cases = TaxCase.objects.filter(
            status__in=["new", "in_progress"]
        ).select_related("assigned_preparer", "contact")

        for case in active_cases:
            existing = set(
                Document.objects.filter(case=case).values_list(
                    "doc_type", flat=True
                )
            )
            missing = [dt for dt in required_types if dt not in existing]
            if missing and evaluate_conditions(rule, case, {}):
                execute_action(
                    rule, case, {"missing_doc_types": missing}
                )


@shared_task
def check_due_dates():
    """Find cases with approaching due dates per active workflow rules."""
    from apps.cases.models import TaxCase

    today = timezone.now().date()
    rules = WorkflowRule.objects.filter(
        is_active=True, trigger_type="case_due_date_approaching"
    )

    for rule in rules:
        days_before = rule.trigger_config.get("days_before", 7)
        target_date = today + timedelta(days=days_before)

        cases = TaxCase.objects.filter(
            due_date=target_date,
            status__in=["new", "in_progress", "under_review"],
        ).select_related("assigned_preparer", "contact")

        for case in cases:
            if evaluate_conditions(rule, case, {}):
                execute_action(
                    rule, case, {"days_until_due": days_before}
                )


@shared_task
def check_overdue_tasks():
    """Find overdue tasks per active workflow rules."""
    from apps.tasks.models import Task

    today = timezone.now().date()
    rules = WorkflowRule.objects.filter(
        is_active=True, trigger_type="task_overdue"
    )

    if not rules.exists():
        return

    overdue_tasks = Task.objects.filter(
        status__in=["todo", "in_progress"],
        due_date__lt=today,
    ).select_related("assigned_to", "case", "contact")

    for task in overdue_tasks:
        for rule in rules:
            if evaluate_conditions(rule, task, {}):
                execute_action(
                    rule, task, {"days_overdue": (today - task.due_date).days}
                )
