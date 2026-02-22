import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def notify_closed_corporation_access(
    self,
    corporation_id: str,
    corporation_name: str,
    accessed_by_user_id: str,
    accessed_by_name: str,
    client_status: str,
    reason: str,
):
    """
    Notify managers/admins when someone accesses a closed or paused corporation.
    Creates in-app notifications for all users with is_admin=True or is_manager=True.
    """
    from apps.notifications.models import Notification
    from apps.users.models import User

    try:
        from django.db.models import Q

        # Get all managers and admins (excluding the user who accessed)
        managers_admins = User.objects.filter(
            Q(is_admin=True) | Q(is_manager=True),
            is_active=True,
        ).exclude(id=accessed_by_user_id)

        if not managers_admins.exists():
            logger.info("No managers/admins to notify for corporation access.")
            return

        # Determine notification type and severity
        if client_status == "business_closed":
            notification_type = Notification.Type.CLOSED_CORP_ACCESSED
            severity = Notification.Severity.WARNING
            status_label = "CLOSED"
        else:
            notification_type = Notification.Type.PAUSED_CORP_ACCESSED
            severity = Notification.Severity.INFO
            status_label = "PAUSED"

        title = f"{status_label} Corporation Accessed: {corporation_name}"
        message = (
            f"{accessed_by_name} viewed the {status_label.lower()} corporation '{corporation_name}'.\n\n"
            f"Reason for {status_label.lower()}: {reason or 'No reason provided'}"
        )
        action_url = f"/corporations/{corporation_id}"

        # Create notifications for each manager/admin
        notifications_created = 0
        for user in managers_admins:
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=title,
                message=message,
                severity=severity,
                related_object_type="corporation",
                related_object_id=corporation_id,
                action_url=action_url,
            )
            notifications_created += 1

        logger.info(
            "Created %d notifications for access to %s corporation %s by %s",
            notifications_created,
            status_label.lower(),
            corporation_name,
            accessed_by_name,
        )

    except Exception as exc:
        logger.error("Failed to create notifications: %s", exc)
        raise self.retry(exc=exc, countdown=60)
