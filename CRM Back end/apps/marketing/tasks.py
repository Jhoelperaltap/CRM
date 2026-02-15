import logging
import re
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def send_campaign(campaign_id: str):
    """
    Send a campaign to all recipients.
    """
    from .models import Campaign, CampaignRecipient, EmailListSubscriber

    try:
        campaign = Campaign.objects.get(id=campaign_id)

        if campaign.status not in ["draft", "scheduled"]:
            logger.warning(
                f"Campaign {campaign_id} is not ready to send (status: {campaign.status})"
            )
            return

        # Update status to sending
        campaign.status = "sending"
        campaign.save()

        # Get all subscribers from the email lists
        subscribers = (
            EmailListSubscriber.objects.filter(
                email_list__in=campaign.email_lists.all(),
                is_subscribed=True,
                contact__email_opt_in_status__in=["single_opt_in", "double_opt_in"],
            )
            .select_related("contact")
            .distinct("contact")
        )

        # Create recipients
        recipients_created = 0
        for subscriber in subscribers:
            recipient, created = CampaignRecipient.objects.get_or_create(
                campaign=campaign,
                contact=subscriber.contact,
                defaults={"email": subscriber.contact.email, "status": "pending"},
            )
            if created:
                recipients_created += 1

                # Assign A/B variant if needed
                if campaign.is_ab_test:
                    import random

                    recipient.ab_variant = (
                        "A" if random.randint(1, 100) <= campaign.ab_test_split else "B"
                    )
                    recipient.save()

        campaign.total_recipients = recipients_created
        campaign.save()

        # Send to each recipient
        for recipient in campaign.recipients.filter(status="pending"):
            send_campaign_email.delay(str(recipient.id))

        campaign.sent_at = timezone.now()
        campaign.save()

        logger.info(
            f"Campaign {campaign.name} started sending to {recipients_created} recipients"
        )

    except Campaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found")
    except Exception as e:
        logger.error(f"Error sending campaign {campaign_id}: {str(e)}")


@shared_task
def send_campaign_email(recipient_id: str):
    """
    Send a single campaign email to a recipient.
    """
    from .models import CampaignRecipient

    try:
        recipient = CampaignRecipient.objects.select_related("campaign", "contact").get(
            id=recipient_id
        )

        campaign = recipient.campaign
        contact = recipient.contact

        # Determine content based on A/B variant
        if campaign.is_ab_test and recipient.ab_variant == "B":
            subject = campaign.ab_test_subject_b or campaign.subject
            html_content = campaign.ab_test_content_b or campaign.html_content
        else:
            subject = campaign.subject
            html_content = campaign.html_content

        # Personalize content
        context = {
            "contact": {
                "first_name": contact.first_name or "",
                "last_name": contact.last_name or "",
                "full_name": contact.full_name or "",
                "email": contact.email,
            },
            "company_name": "Ebenezer Tax Services",
            "unsubscribe_url": f"{settings.FRONTEND_URL}/unsubscribe/{recipient.tracking_token}",
            "tracking_pixel": f"{settings.API_URL}/api/v1/marketing/track/open/{recipient.tracking_token}/",
        }

        # Render template variables
        subject = render_template_string(subject, context)
        html_content = render_template_string(html_content, context)
        text_content = (
            render_template_string(campaign.text_content, context)
            if campaign.text_content
            else ""
        )

        # Add tracking pixel if enabled
        if campaign.track_opens:
            tracking_pixel = f'<img src="{context["tracking_pixel"]}" width="1" height="1" alt="" style="display:none;" />'
            html_content = html_content.replace("</body>", f"{tracking_pixel}</body>")
            if "</body>" not in html_content:
                html_content += tracking_pixel

        # Replace links with tracking links if enabled
        if campaign.track_clicks:
            html_content = add_link_tracking(html_content, campaign, recipient)

        # Send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content or strip_html_tags(html_content),
            from_email=f"{campaign.from_name} <{campaign.from_email}>",
            to=[recipient.email],
            reply_to=[campaign.reply_to] if campaign.reply_to else None,
        )
        email.attach_alternative(html_content, "text/html")

        # Add headers
        email.extra_headers = {
            "X-Campaign-ID": str(campaign.id),
            "X-Recipient-ID": str(recipient.id),
            "List-Unsubscribe": f"<{context['unsubscribe_url']}>",
        }

        email.send(fail_silently=False)

        # Update recipient status
        recipient.mark_sent()

        # Update campaign stats
        campaign.total_sent += 1
        campaign.save()

        logger.info(f"Sent campaign email to {recipient.email}")

    except CampaignRecipient.DoesNotExist:
        logger.error(f"Recipient {recipient_id} not found")
    except Exception as e:
        logger.error(f"Error sending email to recipient {recipient_id}: {str(e)}")
        try:
            recipient = CampaignRecipient.objects.get(id=recipient_id)
            recipient.status = "failed"
            recipient.error_message = str(e)
            recipient.save()
        except Exception:
            pass


@shared_task
def process_scheduled_campaigns():
    """
    Process campaigns scheduled for sending.
    Runs every minute via Celery Beat.
    """
    from .models import Campaign

    now = timezone.now()
    campaigns = Campaign.objects.filter(status="scheduled", scheduled_at__lte=now)

    for campaign in campaigns:
        send_campaign.delay(str(campaign.id))
        logger.info(f"Triggered scheduled campaign: {campaign.name}")


@shared_task
def process_automation_enrollment(enrollment_id: str):
    """
    Process the next step for an automation enrollment.
    """
    from .models import AutomationEnrollment, AutomationStepLog

    try:
        enrollment = AutomationEnrollment.objects.select_related(
            "sequence", "contact", "current_step"
        ).get(id=enrollment_id)

        if enrollment.status != "active":
            return

        step = enrollment.current_step
        if not step:
            # Complete the enrollment
            enrollment.status = "completed"
            enrollment.completed_at = timezone.now()
            enrollment.save()

            enrollment.sequence.total_completed += 1
            enrollment.sequence.save()
            return

        # Process based on step type
        success = True
        error_message = ""

        if step.step_type == "email":
            success, error_message = send_automation_email(enrollment, step)

        elif step.step_type == "wait":
            # Calculate wait time
            wait_time = timedelta(
                days=step.wait_days, hours=step.wait_hours, minutes=step.wait_minutes
            )
            enrollment.next_step_at = timezone.now() + wait_time
            enrollment.save()
            # Schedule next processing
            process_automation_enrollment.apply_async(
                args=[str(enrollment.id)], eta=enrollment.next_step_at
            )
            return

        elif step.step_type == "tag":
            success, error_message = process_tag_step(enrollment, step)

        elif step.step_type == "list":
            success, error_message = process_list_step(enrollment, step)

        elif step.step_type == "condition":
            # Evaluate condition and skip to appropriate step
            condition_met = evaluate_condition(enrollment, step)
            if not condition_met:
                # Skip to next step
                pass

        # Log step execution
        AutomationStepLog.objects.create(
            enrollment=enrollment,
            step=step,
            status="success" if success else "failed",
            email_sent=step.step_type == "email" and success,
            error_message=error_message,
        )

        # Update step stats
        step.total_processed += 1
        if step.step_type == "email" and success:
            step.total_sent += 1
        step.save()

        # Move to next step
        next_step = (
            enrollment.sequence.steps.filter(order__gt=step.order)
            .order_by("order")
            .first()
        )

        enrollment.current_step = next_step
        enrollment.save()

        # Continue processing if there's a next step and no wait
        if next_step and step.step_type != "wait":
            process_automation_enrollment.delay(str(enrollment.id))

    except AutomationEnrollment.DoesNotExist:
        logger.error(f"Enrollment {enrollment_id} not found")
    except Exception as e:
        logger.error(f"Error processing enrollment {enrollment_id}: {str(e)}")


@shared_task
def process_pending_automation_steps():
    """
    Process automation enrollments that are due for the next step.
    Runs every 5 minutes via Celery Beat.
    """
    from .models import AutomationEnrollment

    now = timezone.now()
    enrollments = AutomationEnrollment.objects.filter(
        status="active", next_step_at__lte=now
    )

    for enrollment in enrollments:
        process_automation_enrollment.delay(str(enrollment.id))


@shared_task
def update_campaign_stats(campaign_id: str):
    """
    Update denormalized campaign statistics.
    """
    from django.db.models import Count, Q

    from .models import Campaign

    try:
        campaign = Campaign.objects.get(id=campaign_id)

        stats = campaign.recipients.aggregate(
            total_sent=Count(
                "id", filter=Q(status__in=["sent", "delivered", "opened", "clicked"])
            ),
            total_delivered=Count(
                "id", filter=Q(status__in=["delivered", "opened", "clicked"])
            ),
            total_opened=Count("id", filter=Q(status__in=["opened", "clicked"])),
            total_clicked=Count("id", filter=Q(status="clicked")),
            total_bounced=Count("id", filter=Q(status="bounced")),
            total_unsubscribed=Count("id", filter=Q(status="unsubscribed")),
            total_complained=Count("id", filter=Q(status="complained")),
        )

        campaign.total_sent = stats["total_sent"] or 0
        campaign.total_delivered = stats["total_delivered"] or 0
        campaign.total_opened = stats["total_opened"] or 0
        campaign.total_clicked = stats["total_clicked"] or 0
        campaign.total_bounced = stats["total_bounced"] or 0
        campaign.total_unsubscribed = stats["total_unsubscribed"] or 0
        campaign.total_complained = stats["total_complained"] or 0
        campaign.save()

        # Check if campaign is complete
        pending = campaign.recipients.filter(status="pending").count()
        if pending == 0 and campaign.status == "sending":
            campaign.status = "sent"
            campaign.completed_at = timezone.now()
            campaign.save()

    except Campaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found")


# Helper functions


def render_template_string(template_string, context):
    """Render a template string with the given context."""
    if not template_string:
        return ""

    # Simple variable replacement for {{variable.path}}
    pattern = r"\{\{\s*([\w.]+)\s*\}\}"

    def replace_var(match):
        var_path = match.group(1)
        parts = var_path.split(".")
        value = context
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part, "")
            else:
                value = getattr(value, part, "")
        return str(value) if value else ""

    return re.sub(pattern, replace_var, template_string)


def strip_html_tags(html):
    """Remove HTML tags from a string."""
    clean = re.compile("<.*?>")
    return re.sub(clean, "", html)


def add_link_tracking(html_content, campaign, recipient):
    """Replace links with tracking URLs."""
    from .models import CampaignLink

    # Find all links
    link_pattern = r'href=["\']([^"\']+)["\']'

    def replace_link(match):
        original_url = match.group(1)

        # Skip unsubscribe and tracking URLs
        if "unsubscribe" in original_url or "track" in original_url:
            return match.group(0)

        # Get or create link tracking
        link, created = CampaignLink.objects.get_or_create(
            campaign=campaign, original_url=original_url
        )

        tracking_url = f"{settings.API_URL}/api/v1/marketing/track/click/{recipient.tracking_token}/{link.id}/"

        return f'href="{tracking_url}"'

    return re.sub(link_pattern, replace_link, html_content)


def send_automation_email(enrollment, step):
    """Send an automation step email."""
    try:
        contact = enrollment.contact
        sequence = enrollment.sequence

        subject = step.subject
        html_content = step.html_content
        text_content = step.text_content

        # If using template
        if step.template:
            subject = step.template.subject
            html_content = step.template.html_content
            text_content = step.template.text_content

        # Personalize content
        context = {
            "contact": {
                "first_name": contact.first_name or "",
                "last_name": contact.last_name or "",
                "full_name": contact.full_name or "",
                "email": contact.email,
            },
            "company_name": "Ebenezer Tax Services",
        }

        subject = render_template_string(subject, context)
        html_content = render_template_string(html_content, context)
        text_content = (
            render_template_string(text_content, context) if text_content else ""
        )

        # Send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content or strip_html_tags(html_content),
            from_email=f"{sequence.from_name} <{sequence.from_email}>",
            to=[contact.email],
            reply_to=[sequence.reply_to] if sequence.reply_to else None,
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        return True, ""

    except Exception as e:
        return False, str(e)


def process_tag_step(enrollment, step):
    """Process a tag automation step."""
    try:
        from apps.contacts.models import ContactTag, ContactTagAssignment

        contact = enrollment.contact

        if step.tag_action == "add":
            tag, _ = ContactTag.objects.get_or_create(name=step.tag_name)
            ContactTagAssignment.objects.get_or_create(contact=contact, tag=tag)
        elif step.tag_action == "remove":
            ContactTagAssignment.objects.filter(
                contact=contact, tag__name=step.tag_name
            ).delete()

        return True, ""

    except Exception as e:
        return False, str(e)


def process_list_step(enrollment, step):
    """Process a list automation step."""
    try:
        from .models import EmailListSubscriber

        contact = enrollment.contact
        target_list = step.target_list

        if not target_list:
            return False, "No target list specified"

        if step.tag_action == "add":
            EmailListSubscriber.objects.get_or_create(
                email_list=target_list,
                contact=contact,
                defaults={"source": "automation"},
            )
        elif step.tag_action == "remove":
            EmailListSubscriber.objects.filter(
                email_list=target_list, contact=contact
            ).update(is_subscribed=False, unsubscribed_at=timezone.now())

        return True, ""

    except Exception as e:
        return False, str(e)


def evaluate_condition(enrollment, step):
    """Evaluate a condition step."""
    contact = enrollment.contact

    field_value = getattr(contact, step.condition_field, None)
    condition_value = step.condition_value

    if step.condition_operator == "equals":
        return str(field_value) == str(condition_value)
    elif step.condition_operator == "not_equals":
        return str(field_value) != str(condition_value)
    elif step.condition_operator == "contains":
        return str(condition_value) in str(field_value)
    elif step.condition_operator == "opened":
        # Check if previous email was opened
        from .models import AutomationStepLog

        return AutomationStepLog.objects.filter(
            enrollment=enrollment, step__order__lt=step.order, email_opened=True
        ).exists()
    elif step.condition_operator == "clicked":
        # Check if previous email was clicked
        from .models import AutomationStepLog

        return AutomationStepLog.objects.filter(
            enrollment=enrollment, step__order__lt=step.order, email_clicked=True
        ).exists()

    return False
