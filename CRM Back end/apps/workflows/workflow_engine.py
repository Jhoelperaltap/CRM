"""
Core workflow engine — evaluates triggers, conditions, and executes actions.
"""

import logging
import re

from django.utils import timezone

from apps.workflows.models import WorkflowExecutionLog, WorkflowRule

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def evaluate_signal_trigger(trigger_type, instance, **context):
    """
    Called from Django signals.  Finds active rules matching *trigger_type*,
    evaluates conditions against *instance*, and executes the action for each
    matching rule.

    Returns a list of WorkflowExecutionLog entries.
    """
    rules = WorkflowRule.objects.filter(is_active=True, trigger_type=trigger_type)

    logs = []
    for rule in rules:
        if not _matches_trigger_config(rule, instance, context):
            continue
        if not evaluate_conditions(rule, instance, context):
            continue
        log = execute_action(rule, instance, context)
        logs.append(log)
    return logs


def evaluate_conditions(rule, instance, context):
    """
    Evaluate ``rule.conditions`` (a dict of field→value) against *instance*.
    An empty conditions dict means "always match".
    """
    conditions = rule.conditions or {}
    for field, expected in conditions.items():
        actual = getattr(instance, field, None)
        if actual is None:
            return False
        if isinstance(expected, list):
            if actual not in expected:
                return False
        elif actual != expected:
            return False
    return True


def execute_action(rule, instance, context):
    """
    Dispatch to the correct action handler and create a WorkflowExecutionLog.
    """
    now = timezone.now()
    handler = _ACTION_HANDLERS.get(rule.action_type)

    if handler is None:
        return _create_log(
            rule,
            instance,
            now,
            action_taken=f"Unknown action_type: {rule.action_type}",
            result="error",
            error_message=f"No handler for action_type={rule.action_type}",
        )

    try:
        description = handler(rule, instance, context)
        log = _create_log(
            rule,
            instance,
            now,
            action_taken=description,
            result="success",
        )
        # Update execution stats
        rule.execution_count += 1
        rule.last_executed_at = now
        rule.save(update_fields=["execution_count", "last_executed_at"])
        return log
    except Exception as exc:
        logger.exception("Workflow action failed for rule %s", rule.id)
        return _create_log(
            rule,
            instance,
            now,
            action_taken=f"{rule.action_type} attempted",
            result="error",
            error_message=str(exc),
        )


# ---------------------------------------------------------------------------
# Trigger config matching
# ---------------------------------------------------------------------------


def _matches_trigger_config(rule, instance, context):
    """Check trigger_config against the specific trigger context."""
    config = rule.trigger_config or {}

    if rule.trigger_type == "case_status_changed":
        from_status = config.get("from_status")
        to_status = config.get("to_status")
        if from_status and context.get("old_status") != from_status:
            return False
        if to_status and context.get("new_status") != to_status:
            return False

    # Other trigger types don't need trigger_config matching at signal time
    # (scheduled triggers handle their own config in the task layer)
    return True


# ---------------------------------------------------------------------------
# Action handlers
# ---------------------------------------------------------------------------


def _render_template_string(template_str, instance, context):
    """Replace ``{{field_name}}`` placeholders with instance attribute values."""

    def replacer(match):
        field = match.group(1).strip()
        val = context.get(field) or getattr(instance, field, None)
        return str(val) if val is not None else match.group(0)

    return re.sub(r"\{\{(\w+)\}\}", replacer, template_str)


def _resolve_recipient(rule, instance, context):
    """
    Determine the notification/email recipient from action_config.

    Supports: "preparer", "reviewer", "assigned_to", "created_by", or a
    specific user UUID.
    """
    from apps.users.models import User

    recipient_key = rule.action_config.get("recipient", "preparer")

    # Check instance attributes first
    user = getattr(instance, "assigned_preparer", None)
    if recipient_key == "reviewer":
        user = getattr(instance, "reviewer", None)
    elif recipient_key == "assigned_to":
        user = getattr(instance, "assigned_to", None)
    elif recipient_key == "created_by":
        user = getattr(instance, "created_by", None)
    elif recipient_key not in ("preparer",):
        # Try as UUID
        try:
            user = User.objects.get(id=recipient_key)
        except (User.DoesNotExist, ValueError):
            user = None

    return user


def _action_create_task(rule, instance, context):
    """Create a CRM Task based on action_config."""
    from apps.tasks.models import Task

    config = rule.action_config
    title = _render_template_string(
        config.get("title", f"Action for {instance}"), instance, context
    )
    assignee = _resolve_recipient(rule, instance, context)

    case = getattr(instance, "case", None) or (
        instance if instance.__class__.__name__ == "TaxCase" else None
    )
    contact = getattr(instance, "contact", None)

    Task.objects.create(
        title=title,
        description=config.get("description", f"Auto-created by workflow: {rule.name}"),
        assigned_to=assignee,
        created_by=None,
        case=case,
        contact=contact,
        priority=config.get("priority", "medium"),
        status="todo",
        due_date=config.get("due_date"),
    )
    return f"Created task: {title}"


def _action_send_notification(rule, instance, context):
    """Send an in-app notification via the notifications service."""
    from apps.notifications.services import create_notification

    config = rule.action_config
    recipient = _resolve_recipient(rule, instance, context)
    if not recipient:
        raise ValueError("Could not resolve notification recipient")

    title = _render_template_string(
        config.get("title", f"Workflow: {rule.name}"), instance, context
    )
    message = _render_template_string(config.get("message", ""), instance, context)
    severity = config.get("severity", "info")
    action_url = _render_template_string(
        config.get("action_url", ""), instance, context
    )

    create_notification(
        recipient=recipient,
        notification_type="workflow_triggered",
        title=title,
        message=message,
        severity=severity,
        related_object=instance,
        action_url=action_url,
    )
    return f"Sent notification to {recipient}: {title}"


def _action_send_email(rule, instance, context):
    """Send an email using an EmailTemplate."""
    from apps.emails.models import EmailTemplate
    from apps.emails.tasks import send_email_task
    from apps.emails.models import EmailAccount, EmailMessage
    import uuid

    config = rule.action_config
    template_id = config.get("template_id")
    if not template_id:
        raise ValueError("template_id is required for send_email action")

    template = EmailTemplate.objects.get(id=template_id, is_active=True)
    recipient = _resolve_recipient(rule, instance, context)
    if not recipient or not recipient.email:
        raise ValueError("Could not resolve email recipient")

    # Build template context from instance fields
    tmpl_context = {}
    for attr in ("case_number", "title", "first_name", "last_name", "email"):
        val = getattr(instance, attr, None)
        if val:
            tmpl_context[attr] = str(val)

    subject, body = template.render(tmpl_context)

    account = EmailAccount.objects.filter(is_active=True).first()
    if not account:
        raise ValueError("No active email account configured")

    msg = EmailMessage.objects.create(
        account=account,
        message_id=f"workflow-{uuid.uuid4()}",
        direction="outbound",
        from_address=account.email_address,
        to_addresses=[recipient.email],
        subject=subject,
        body_text=body,
        folder="sent",
    )
    send_email_task.delay(str(msg.id))
    return f"Sent email to {recipient.email}: {subject}"


def _action_update_field(rule, instance, context):
    """Update a field on the trigger instance."""
    config = rule.action_config
    field = config.get("field")
    value = config.get("value")

    if not field:
        raise ValueError("field is required for update_field action")

    if not hasattr(instance, field):
        raise ValueError(f"Instance has no field: {field}")

    setattr(instance, field, value)
    instance.save(update_fields=[field, "updated_at"])
    return f"Updated {instance.__class__.__name__}.{field} = {value}"


_ACTION_HANDLERS = {
    "create_task": _action_create_task,
    "send_notification": _action_send_notification,
    "send_email": _action_send_email,
    "update_field": _action_update_field,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_log(rule, instance, triggered_at, action_taken, result, error_message=""):
    return WorkflowExecutionLog.objects.create(
        rule=rule,
        triggered_at=triggered_at,
        trigger_object_type=instance.__class__.__name__.lower(),
        trigger_object_id=getattr(instance, "pk", None),
        action_taken=action_taken,
        result=result,
        error_message=error_message,
    )
