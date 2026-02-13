"""
Django signals for the AI Agent system.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender="emails.EmailMessage")
def on_email_received(sender, instance, created, **kwargs):
    """
    Trigger email analysis when new inbound email is received.
    """
    if not created:
        return

    # Only analyze inbound emails
    if instance.direction != "inbound":
        return

    try:
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()

        if not config.is_active or not config.email_analysis_enabled:
            return

        from apps.ai_agent.tasks import analyze_email

        analyze_email.delay(str(instance.id))
        logger.debug(f"Queued email analysis for {instance.id}")

    except Exception as e:
        logger.error(f"Failed to queue email analysis: {e}")


@receiver(post_save, sender="ai_agent.AgentAction")
def on_action_status_change(sender, instance, created, **kwargs):
    """
    Handle action status changes for notifications.
    """
    if created:
        # Notify admins of new pending actions if approval required
        if instance.requires_approval and instance.status == "pending":
            try:
                from apps.notifications.services import create_notification
                from apps.users.models import User

                # Get admin users to notify
                admins = User.objects.filter(
                    is_active=True,
                    role__slug="admin",
                ).exclude(id=None)[:5]  # Limit notifications

                for admin in admins:
                    create_notification(
                        recipient=admin,
                        notification_type="ai_action_pending",
                        title=f"AI Action: {instance.title}",
                        message=f"New AI action requires approval: {instance.get_action_type_display()}",
                        severity="info",
                    )

            except Exception as e:
                logger.error(f"Failed to send action notification: {e}")


@receiver(post_save, sender="ai_agent.AgentInsight")
def on_insight_created(sender, instance, created, **kwargs):
    """
    Notify relevant users of high-priority insights.
    """
    if not created:
        return

    # Only notify for high priority insights
    if instance.priority < 7:
        return

    try:
        from apps.notifications.services import create_notification
        from apps.users.models import User

        # Notify admins and managers
        recipients = User.objects.filter(
            is_active=True,
            role__slug__in=["admin", "manager"],
        )[:10]

        severity = "warning" if instance.priority >= 9 else "info"

        for user in recipients:
            create_notification(
                recipient=user,
                notification_type="ai_insight",
                title=f"AI Insight: {instance.title}",
                message=instance.description[:200],
                severity=severity,
            )

    except Exception as e:
        logger.error(f"Failed to send insight notification: {e}")
