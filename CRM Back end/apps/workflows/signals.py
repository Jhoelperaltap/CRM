"""
Django signals that fire workflow triggers on model changes.
"""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(pre_save, sender="cases.TaxCase")
def case_pre_save(sender, instance, **kwargs):
    """Capture old status before save for change detection."""
    if instance.pk:
        try:
            instance._old_status = sender.objects.values_list(
                "status", flat=True
            ).get(pk=instance.pk)
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender="cases.TaxCase")
def case_post_save(sender, instance, created, **kwargs):
    """Fire workflow triggers for case creation or status changes."""
    from apps.workflows.workflow_engine import evaluate_signal_trigger

    if created:
        evaluate_signal_trigger("case_created", instance)
    else:
        old_status = getattr(instance, "_old_status", None)
        if old_status and old_status != instance.status:
            evaluate_signal_trigger(
                "case_status_changed",
                instance,
                old_status=old_status,
                new_status=instance.status,
            )


@receiver(post_save, sender="documents.Document")
def document_post_save(sender, instance, created, **kwargs):
    """Fire workflow trigger when a new document is uploaded."""
    if created:
        from apps.workflows.workflow_engine import evaluate_signal_trigger

        evaluate_signal_trigger("document_uploaded", instance)
