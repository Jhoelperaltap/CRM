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
