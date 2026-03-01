"""
Celery tasks for the client portal.
"""

import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_portal_password_reset_email(
    self, email: str, reset_token: str, portal_url: str = None
):
    """
    Send password reset email to portal user.

    Args:
        email: User's email address
        reset_token: The unhashed reset token to include in the link
        portal_url: Base URL for the portal (optional, uses settings if not provided)
    """
    try:
        base_url = portal_url or getattr(settings, "PORTAL_BASE_URL", "")
        if not base_url:
            logger.warning("PORTAL_BASE_URL not configured, using placeholder")
            base_url = "https://portal.example.com"

        reset_link = f"{base_url}/reset-password?token={reset_token}"

        subject = "Password Reset Request"
        message = f"""
Hello,

You requested to reset your password for the client portal.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Support Team
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {email}")
        return {"status": "sent", "email": email}

    except Exception as exc:
        logger.error(f"Failed to send password reset email to {email}: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))


@shared_task(bind=True, max_retries=3)
def send_impersonation_notification_email(
    self, contact_id: str, admin_name: str, admin_email: str = None
):
    """
    Send notification email to client when an admin impersonates their account.

    Args:
        contact_id: UUID of the contact being impersonated
        admin_name: Name of the admin performing impersonation
        admin_email: Email of the admin (optional, for reference)
    """
    from django.utils import timezone

    from apps.contacts.models import Contact

    try:
        contact = Contact.objects.get(pk=contact_id)

        # Get portal access email
        if not hasattr(contact, "portal_access") or not contact.portal_access:
            logger.warning(f"Contact {contact_id} has no portal access, skipping notification")
            return {"status": "skipped", "reason": "no_portal_access"}

        email = contact.portal_access.email
        client_name = f"{contact.first_name} {contact.last_name}".strip() or "Customer"
        timestamp = timezone.now().strftime("%B %d, %Y at %I:%M %p %Z")

        subject = "[EJFLOW] Administrative access to your account"
        message = f"""
Dear {client_name},

We want to inform you that an EJFLOW administrator has accessed your
customer portal account to provide assistance.

Access Details:
- Date and Time: {timestamp}
- Administrator: {admin_name}
- Reason: Technical support / Data correction

This access was performed in accordance with our support procedures
to help resolve issues or correct information in your account.

If you did not request assistance or have any questions about this access,
please contact us immediately.

Best regards,
The EJFLOW Team
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"Impersonation notification email sent to {email}")
        return {"status": "sent", "email": email}

    except Contact.DoesNotExist:
        logger.error(f"Contact {contact_id} not found for impersonation notification")
        return {"status": "error", "reason": "contact_not_found"}

    except Exception as exc:
        logger.error(f"Failed to send impersonation notification: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))
