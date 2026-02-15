"""
Celery tasks for SLA management.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def check_sla_statuses():
    """
    Periodically check all active case SLA statuses.
    Updates status and triggers escalations as needed.
    Runs every 5 minutes.
    """
    from .sla_models import CaseSLAStatus
    from .sla_services import record_sla_breach

    # Get all active (non-resolved) case SLA statuses
    active_statuses = (
        CaseSLAStatus.objects.filter(
            is_paused=False,
        )
        .filter(Q(response_met_at__isnull=True) | Q(resolution_met_at__isnull=True))
        .select_related("case", "sla")
    )

    now = timezone.now()
    breaches_found = 0
    at_risk_count = 0

    for sla_status in active_statuses:
        # Check response SLA
        if not sla_status.response_met_at and sla_status.response_target:
            if now > sla_status.response_target and not sla_status.response_breached:
                # Breach detected
                sla_status.response_status = "breached"
                sla_status.response_breached = True
                sla_status.save()
                record_sla_breach(sla_status.case, "response", sla_status)
                breaches_found += 1
            elif now > sla_status.response_target - timedelta(hours=1):
                # At risk
                if sla_status.response_status != "at_risk":
                    sla_status.response_status = "at_risk"
                    sla_status.save()
                    at_risk_count += 1
                    # Trigger at-risk escalation
                    check_at_risk_escalation(sla_status, "response")

        # Check resolution SLA
        if not sla_status.resolution_met_at and sla_status.resolution_target:
            if (
                now > sla_status.resolution_target
                and not sla_status.resolution_breached
            ):
                # Breach detected
                sla_status.resolution_status = "breached"
                sla_status.resolution_breached = True
                sla_status.save()
                record_sla_breach(sla_status.case, "resolution", sla_status)
                breaches_found += 1
            elif now > sla_status.resolution_target - timedelta(hours=2):
                # At risk
                if sla_status.resolution_status != "at_risk":
                    sla_status.resolution_status = "at_risk"
                    sla_status.save()
                    at_risk_count += 1
                    check_at_risk_escalation(sla_status, "resolution")

    if breaches_found > 0 or at_risk_count > 0:
        logger.info(f"SLA check: {breaches_found} breaches, {at_risk_count} at risk")

    return {
        "checked": active_statuses.count(),
        "breaches_found": breaches_found,
        "at_risk": at_risk_count,
    }


def check_at_risk_escalation(sla_status, sla_type):
    """
    Check and trigger at-risk escalation rules.
    """
    from .sla_models import EscalationRule
    from .sla_services import execute_escalation_rule

    if not sla_status.sla:
        return

    # Find applicable at-risk rules
    rules = EscalationRule.objects.filter(
        sla=sla_status.sla,
        is_active=True,
        trigger_type__in=["percentage", "hours_before"],
        applies_to__in=[sla_type, "both"],
    ).order_by("order")

    now = timezone.now()

    for rule in rules:
        should_trigger = False

        if sla_type == "response":
            target = sla_status.response_target
            start = sla_status.case.created_at
        else:
            target = sla_status.resolution_target
            start = sla_status.case.created_at

        if not target:
            continue

        total_time = (target - start).total_seconds()
        elapsed_time = (now - start).total_seconds()
        remaining_time = (target - now).total_seconds()

        if rule.trigger_type == "percentage":
            # Trigger when X% of time has elapsed
            percentage_elapsed = (
                (elapsed_time / total_time) * 100 if total_time > 0 else 100
            )
            if percentage_elapsed >= rule.trigger_value:
                should_trigger = True

        elif rule.trigger_type == "hours_before":
            # Trigger X hours before breach
            hours_remaining = remaining_time / 3600
            if hours_remaining <= rule.trigger_value:
                should_trigger = True

        if should_trigger:
            execute_escalation_rule(sla_status.case, None, rule)


@shared_task
def send_sla_summary_report():
    """
    Send daily SLA summary report to managers.
    Runs daily at 8 AM.
    """
    from datetime import date, timedelta

    from django.conf import settings
    from django.core.mail import send_mail

    from .sla_models import SLABreach
    from .sla_services import get_sla_metrics

    yesterday = date.today() - timedelta(days=1)

    # Get metrics for yesterday
    metrics = get_sla_metrics(start_date=yesterday, end_date=date.today())

    # Get unresolved breaches
    unresolved = SLABreach.objects.filter(is_resolved=False).count()

    # Build report
    subject = f"SLA Summary Report - {yesterday}"
    body = f"""
SLA Summary Report for {yesterday}
{'=' * 40}

Total Cases: {metrics['total_cases']}

Response SLA:
  - Met: {metrics['response_met']} ({metrics['response_rate']}%)
  - Breached: {metrics['response_breached']}

Resolution SLA:
  - Met: {metrics['resolution_met']} ({metrics['resolution_rate']}%)
  - Breached: {metrics['resolution_breached']}

Average Response Time: {metrics['avg_response_time'] or 'N/A'}
Average Resolution Time: {metrics['avg_resolution_time'] or 'N/A'}

Unresolved Breaches: {unresolved}

---
Ebenezer Tax Services CRM
"""

    # Get admin users
    from django.contrib.auth import get_user_model

    User = get_user_model()
    admins = User.objects.filter(role__slug="admin", is_active=True).values_list(
        "email", flat=True
    )

    if admins:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=list(admins),
            fail_silently=True,
        )
        logger.info(f"Sent SLA summary report to {len(admins)} admins")

    return {"sent_to": len(admins)}


@shared_task
def cleanup_old_sla_data(days: int = 365):
    """
    Archive or delete old SLA data.
    Runs weekly.
    """
    from datetime import timedelta

    from .sla_models import SLABreach

    cutoff = timezone.now() - timedelta(days=days)

    # Delete old resolved breaches
    deleted = SLABreach.objects.filter(
        is_resolved=True, resolved_at__lt=cutoff
    ).delete()

    logger.info(f"Cleaned up {deleted[0]} old SLA breach records")

    return {"deleted": deleted[0]}
