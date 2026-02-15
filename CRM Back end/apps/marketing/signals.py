from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.contacts.models import Contact

from .models import AutomationEnrollment, AutomationSequence


@receiver(post_save, sender=Contact)
def trigger_signup_automation(sender, instance, created, **kwargs):
    """
    Trigger automation sequences when a new contact is created.
    """
    if created:
        # Find active automation sequences with signup trigger
        sequences = AutomationSequence.objects.filter(
            is_active=True, trigger_type="signup"
        )

        for sequence in sequences:
            # Check if contact matches target lists (if any)
            if sequence.email_lists.exists():
                # Check if contact is in any of the target lists
                from .models import EmailListSubscriber

                is_subscribed = EmailListSubscriber.objects.filter(
                    email_list__in=sequence.email_lists.all(),
                    contact=instance,
                    is_subscribed=True,
                ).exists()
                if not is_subscribed:
                    continue

            # Enroll contact in sequence
            enrollment, created = AutomationEnrollment.objects.get_or_create(
                sequence=sequence, contact=instance, defaults={"status": "active"}
            )

            if created:
                # Set first step
                first_step = sequence.steps.order_by("order").first()
                if first_step:
                    enrollment.current_step = first_step
                    enrollment.save()

                # Update sequence stats
                sequence.total_enrolled += 1
                sequence.save()

                # Trigger automation processing
                from .tasks import process_automation_enrollment

                process_automation_enrollment.delay(str(enrollment.id))
