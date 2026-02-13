import logging

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_notification_email(self, notification_id):
    """Send an email for a notification."""
    from apps.notifications.models import Notification

    try:
        notification = Notification.objects.select_related("recipient").get(
            id=notification_id
        )
    except Notification.DoesNotExist:
        logger.warning("Notification %s not found, skipping email.", notification_id)
        return

    recipient = notification.recipient
    if not recipient.email:
        logger.warning("User %s has no email, skipping.", recipient.id)
        return

    subject = f"[Ebenezer CRM] {notification.title}"
    body = notification.message or notification.title

    if notification.action_url:
        body += f"\n\nView details: {notification.action_url}"

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
        notification.email_sent = True
        notification.save(update_fields=["email_sent"])
        logger.info("Notification email sent to %s", recipient.email)
    except Exception as exc:
        logger.error("Failed to send notification email: %s", exc)
        raise self.retry(exc=exc, countdown=60)
