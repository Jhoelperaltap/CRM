"""
Celery tasks for the users app.
"""

import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_password_reset_email(self, user_id: str, email: str, uid: str, token: str):
    """
    Send password reset email to user.

    Args:
        user_id: User's ID for logging
        email: User's email address
        uid: URL-safe base64 encoded user ID
        token: Password reset token
    """
    try:
        base_url = getattr(settings, "CRM_BASE_URL", "")
        if not base_url:
            logger.warning("CRM_BASE_URL not configured, using placeholder")
            base_url = "https://crm.example.com"

        reset_link = f"{base_url}/reset-password?uid={uid}&token={token}"

        subject = "Password Reset Request - EJFLOW"
        message = f"""
Hello,

You requested to reset your password for EJFLOW CRM.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
EJFLOW Support Team
        """.strip()

        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .button:hover {{ background: #1d4ed8; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>EJFLOW</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You requested to reset your password for EJFLOW CRM.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="{reset_link}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">{reset_link}</p>
            <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 24 hours. If you did not request a password reset, please ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2026 EJFLOW. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {email} (user_id={user_id})")
        return {"status": "sent", "email": email}

    except Exception as exc:
        logger.error(f"Failed to send password reset email to {email}: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))
