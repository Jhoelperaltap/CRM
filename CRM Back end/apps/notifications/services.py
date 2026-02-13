"""
Notification creation service.

All other apps should call ``create_notification()`` instead of importing the
model directly — this function handles preference checks and optional email
dispatch.
"""

import logging

from apps.notifications.models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


def create_notification(
    recipient,
    notification_type,
    title,
    message="",
    severity="info",
    related_object=None,
    action_url="",
):
    """
    Create an in-app notification for *recipient* and optionally queue an email.

    Parameters
    ----------
    recipient : User
        The user who will receive the notification.
    notification_type : str
        One of ``Notification.Type`` values.
    title : str
        Short headline displayed in the bell dropdown.
    message : str, optional
        Longer body text shown in the notification detail.
    severity : str, optional
        ``info`` | ``warning`` | ``error`` | ``success``.
    related_object : Model instance, optional
        Any Django model with ``id`` — stored as generic reference.
    action_url : str, optional
        Frontend route the user is navigated to when clicking the notification.

    Returns
    -------
    Notification or None
        The created notification, or ``None`` if the user has disabled in-app
        delivery for this type.
    """
    # Check user preferences
    pref = NotificationPreference.objects.filter(
        user=recipient,
        notification_type=notification_type,
    ).first()

    # Default: in-app enabled, email disabled
    in_app_enabled = pref.in_app_enabled if pref else True
    email_enabled = pref.email_enabled if pref else False

    if not in_app_enabled and not email_enabled:
        return None

    related_object_type = ""
    related_object_id = None
    if related_object is not None:
        related_object_type = related_object.__class__.__name__.lower()
        related_object_id = related_object.pk

    notification = None
    if in_app_enabled:
        notification = Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            severity=severity,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            action_url=action_url,
        )

    if email_enabled:
        from apps.notifications.tasks import send_notification_email

        if notification:
            send_notification_email.delay(str(notification.id))
        else:
            # Create a notification just for email tracking
            notification = Notification.objects.create(
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                message=message,
                severity=severity,
                related_object_type=related_object_type,
                related_object_id=related_object_id,
                action_url=action_url,
                is_read=True,  # don't show in-app
            )
            send_notification_email.delay(str(notification.id))

    return notification
