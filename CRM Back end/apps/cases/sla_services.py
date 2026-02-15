"""
SLA Management Services
"""

from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_sla_for_case(case):
    """
    Determine which SLA applies to a case.
    """
    from .sla_models import SLA

    # First, try to find an SLA that matches the case type
    matching_slas = SLA.objects.filter(
        is_active=True, applicable_case_types__contains=[case.case_type]
    )

    if matching_slas.exists():
        return matching_slas.first()

    # Fall back to SLAs with no specific case type restriction
    general_slas = SLA.objects.filter(is_active=True, applicable_case_types=[])

    if general_slas.exists():
        # Prefer default SLA
        default = general_slas.filter(is_default=True).first()
        return default or general_slas.first()

    # Finally, try the default SLA
    return SLA.objects.filter(is_active=True, is_default=True).first()


def initialize_case_sla(case):
    """
    Initialize SLA tracking for a new case.
    """
    from .sla_models import SLA, CaseSLAStatus

    sla = get_sla_for_case(case)
    if not sla:
        logger.warning(f"No SLA found for case {case.id}")
        return None

    # Calculate targets
    now = timezone.now()
    response_hours = sla.get_response_time(case.priority)
    resolution_hours = sla.get_resolution_time(case.priority)

    # TODO: If using business hours, calculate actual target considering non-working hours
    response_target = now + timedelta(hours=response_hours)
    resolution_target = now + timedelta(hours=resolution_hours)

    sla_status, created = CaseSLAStatus.objects.update_or_create(
        case=case,
        defaults={
            "sla": sla,
            "response_target": response_target,
            "resolution_target": resolution_target,
            "response_status": "on_track",
            "resolution_status": "on_track",
        },
    )

    logger.info(
        f"Initialized SLA for case {case.id}: response by {response_target}, resolution by {resolution_target}"
    )
    return sla_status


def update_case_sla_on_response(case):
    """
    Update SLA when case receives first response.
    """
    from .sla_models import CaseSLAStatus

    try:
        sla_status = case.sla_status
    except CaseSLAStatus.DoesNotExist:
        return

    if sla_status.response_met_at:
        return  # Already responded

    now = timezone.now()
    sla_status.response_met_at = now
    sla_status.time_to_response = now - case.created_at

    # Check if response was within SLA
    if sla_status.response_target and now <= sla_status.response_target:
        sla_status.response_status = "met"
    else:
        sla_status.response_status = "breached"
        sla_status.response_breached = True
        # Create breach record if not exists
        record_sla_breach(case, "response", sla_status)

    sla_status.save()
    logger.info(f"Case {case.id} response SLA: {sla_status.response_status}")


def update_case_sla_on_resolution(case):
    """
    Update SLA when case is resolved/completed.
    """
    from .sla_models import CaseSLAStatus

    try:
        sla_status = case.sla_status
    except CaseSLAStatus.DoesNotExist:
        return

    if sla_status.resolution_met_at:
        return  # Already resolved

    now = timezone.now()
    sla_status.resolution_met_at = now
    sla_status.time_to_resolution = now - case.created_at - sla_status.total_paused_time

    # Check if resolution was within SLA
    if sla_status.resolution_target and now <= sla_status.resolution_target:
        sla_status.resolution_status = "met"
    else:
        sla_status.resolution_status = "breached"
        sla_status.resolution_breached = True
        record_sla_breach(case, "resolution", sla_status)

    sla_status.save()
    logger.info(f"Case {case.id} resolution SLA: {sla_status.resolution_status}")


def record_sla_breach(case, breach_type, sla_status):
    """
    Record an SLA breach and trigger escalation.
    """
    from .sla_models import SLABreach

    now = timezone.now()

    if breach_type == "response":
        target_time = sla_status.response_target
    else:
        target_time = sla_status.resolution_target

    if not target_time:
        return

    breach_duration = now - target_time

    breach, created = SLABreach.objects.get_or_create(
        case=case,
        breach_type=breach_type,
        defaults={
            "sla": sla_status.sla,
            "target_time": target_time,
            "breach_time": now,
            "breach_duration": breach_duration,
            "case_priority": case.priority,
            "case_status": case.status,
            "assigned_to": case.assigned_to,
        },
    )

    if created:
        # Trigger escalation
        trigger_escalation(case, breach)

    return breach


def trigger_escalation(case, breach):
    """
    Send escalation notifications for SLA breach.
    """
    from .sla_models import EscalationRule

    if not breach.sla:
        return

    rules = EscalationRule.objects.filter(
        sla=breach.sla,
        is_active=True,
        trigger_type="on_breach",
        applies_to__in=[breach.breach_type, "both"],
    ).order_by("order")

    for rule in rules:
        execute_escalation_rule(case, breach, rule)


def execute_escalation_rule(case, breach, rule):
    """
    Execute a single escalation rule.
    """
    recipients = []

    # Collect recipients
    if rule.notify_assignee and case.assigned_to:
        recipients.append(case.assigned_to.email)

    if (
        rule.notify_manager
        and case.assigned_to
        and hasattr(case.assigned_to, "manager")
    ):
        if case.assigned_to.manager:
            recipients.append(case.assigned_to.manager.email)

    for user in rule.notify_users.all():
        recipients.append(user.email)

    if rule.notify_emails:
        recipients.extend(
            [e.strip() for e in rule.notify_emails.split(",") if e.strip()]
        )

    # Remove duplicates
    recipients = list(set(recipients))

    if recipients:
        # Render email content
        subject = rule.email_subject.replace(
            "{{case.case_number}}", case.case_number or str(case.id)[:8]
        )
        body = rule.email_body
        body = body.replace(
            "{{case.case_number}}", case.case_number or str(case.id)[:8]
        )
        body = body.replace("{{case.title}}", case.title or "")
        body = body.replace("{{case.priority}}", case.priority)
        body = body.replace(
            "{{case.assigned_to}}",
            str(case.assigned_to) if case.assigned_to else "Unassigned",
        )
        body = body.replace("{{status}}", "breached" if breach else "at risk")
        body = body.replace("{{sla_type}}", breach.breach_type if breach else "SLA")

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=True,
            )
            logger.info(f"Sent escalation email for case {case.id} to {recipients}")

            if breach:
                breach.escalation_sent = True
                breach.escalation_sent_at = timezone.now()
                breach.save()

        except Exception as e:
            logger.error(f"Failed to send escalation email: {e}")

    # Handle reassignment
    if rule.reassign_to and case.assigned_to != rule.reassign_to:
        case.assigned_to = rule.reassign_to
        case.save(update_fields=["assigned_to"])
        logger.info(f"Reassigned case {case.id} to {rule.reassign_to}")

    # Handle priority change
    if rule.change_priority and case.priority not in ["urgent", "high"]:
        case.priority = rule.change_priority
        case.save(update_fields=["priority"])
        # Recalculate SLA targets
        recalculate_sla_targets(case)
        logger.info(f"Changed case {case.id} priority to {rule.change_priority}")


def recalculate_sla_targets(case):
    """
    Recalculate SLA targets when priority changes.
    """
    from .sla_models import CaseSLAStatus

    try:
        sla_status = case.sla_status
    except CaseSLAStatus.DoesNotExist:
        return

    if not sla_status.sla:
        return

    # Only recalculate if not yet met
    now = timezone.now()

    if not sla_status.response_met_at:
        response_hours = sla_status.sla.get_response_time(case.priority)
        sla_status.response_target = (
            case.created_at
            + timedelta(hours=response_hours)
            + sla_status.total_paused_time
        )

    if not sla_status.resolution_met_at:
        resolution_hours = sla_status.sla.get_resolution_time(case.priority)
        sla_status.resolution_target = (
            case.created_at
            + timedelta(hours=resolution_hours)
            + sla_status.total_paused_time
        )

    sla_status.save()


def check_sla_status(case):
    """
    Check and update SLA status for a case.
    Returns the current status summary.
    """
    from .sla_models import CaseSLAStatus

    try:
        sla_status = case.sla_status
    except CaseSLAStatus.DoesNotExist:
        return None

    # Update statuses
    sla_status.response_status = sla_status.calculate_response_status()
    sla_status.resolution_status = sla_status.calculate_resolution_status()
    sla_status.save()

    return {
        "response": {
            "status": sla_status.response_status,
            "target": sla_status.response_target,
            "met_at": sla_status.response_met_at,
            "breached": sla_status.response_breached,
        },
        "resolution": {
            "status": sla_status.resolution_status,
            "target": sla_status.resolution_target,
            "met_at": sla_status.resolution_met_at,
            "breached": sla_status.resolution_breached,
        },
        "is_paused": sla_status.is_paused,
        "pause_reason": sla_status.pause_reason,
    }


def get_sla_metrics(start_date=None, end_date=None, assigned_to=None):
    """
    Get SLA performance metrics for reporting.
    """
    from .sla_models import CaseSLAStatus, SLABreach
    from django.db.models import Count, Avg, Q

    filters = {}
    if start_date:
        filters["created_at__gte"] = start_date
    if end_date:
        filters["created_at__lte"] = end_date
    if assigned_to:
        filters["case__assigned_to"] = assigned_to

    statuses = CaseSLAStatus.objects.filter(**filters)

    total = statuses.count()
    if total == 0:
        return {
            "total_cases": 0,
            "response_met": 0,
            "response_breached": 0,
            "response_rate": 0,
            "resolution_met": 0,
            "resolution_breached": 0,
            "resolution_rate": 0,
            "avg_response_time": None,
            "avg_resolution_time": None,
        }

    response_met = statuses.filter(response_status="met").count()
    response_breached = statuses.filter(response_breached=True).count()
    resolution_met = statuses.filter(resolution_status="met").count()
    resolution_breached = statuses.filter(resolution_breached=True).count()

    # Calculate averages
    avg_response = statuses.filter(time_to_response__isnull=False).aggregate(
        avg=Avg("time_to_response")
    )["avg"]
    avg_resolution = statuses.filter(time_to_resolution__isnull=False).aggregate(
        avg=Avg("time_to_resolution")
    )["avg"]

    return {
        "total_cases": total,
        "response_met": response_met,
        "response_breached": response_breached,
        "response_rate": round((response_met / total) * 100, 1) if total > 0 else 0,
        "resolution_met": resolution_met,
        "resolution_breached": resolution_breached,
        "resolution_rate": round((resolution_met / total) * 100, 1) if total > 0 else 0,
        "avg_response_time": str(avg_response) if avg_response else None,
        "avg_resolution_time": str(avg_resolution) if avg_resolution else None,
    }
