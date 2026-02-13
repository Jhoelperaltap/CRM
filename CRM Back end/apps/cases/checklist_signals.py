"""
Signals for automatic checklist population and document auto-checking.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


@receiver(post_save, sender="cases.TaxCase")
def auto_populate_checklist(sender, instance, created, **kwargs):
    """
    When a new TaxCase is created, find a matching ChecklistTemplate and
    auto-populate a CaseChecklist with items.
    """
    if not created:
        return

    from apps.cases.checklist_models import (
        CaseChecklist,
        CaseChecklistItem,
        ChecklistTemplate,
    )

    # Try exact match: case_type + fiscal_year
    template = ChecklistTemplate.objects.filter(
        case_type=instance.case_type,
        tax_year=instance.fiscal_year,
        is_active=True,
    ).first()

    # Fallback: case_type with tax_year=null (all years)
    if not template:
        template = ChecklistTemplate.objects.filter(
            case_type=instance.case_type,
            tax_year__isnull=True,
            is_active=True,
        ).first()

    if not template:
        return

    items = template.items.all()
    checklist = CaseChecklist.objects.create(
        case=instance,
        template=template,
        total_count=items.count(),
    )

    CaseChecklistItem.objects.bulk_create(
        [
            CaseChecklistItem(
                checklist=checklist,
                template_item=item,
                title=item.title,
                description=item.description,
                doc_type=item.doc_type,
                sort_order=item.sort_order,
                is_required=item.is_required,
            )
            for item in items
        ]
    )
    logger.info(
        "Auto-populated checklist for case %s from template %s (%d items)",
        instance.case_number,
        template.name,
        items.count(),
    )


@receiver(post_save, sender="documents.Document")
def auto_check_checklist_items(sender, instance, created, **kwargs):
    """
    When a Document is uploaded and linked to a case, auto-check matching
    checklist items based on doc_type.
    """
    if not created or not instance.case_id:
        return

    from apps.cases.checklist_models import CaseChecklist, CaseChecklistItem

    try:
        checklist = CaseChecklist.objects.get(case=instance.case)
    except CaseChecklist.DoesNotExist:
        return

    if not instance.doc_type:
        return

    updated = CaseChecklistItem.objects.filter(
        checklist=checklist,
        doc_type=instance.doc_type,
        is_completed=False,
    ).update(
        is_completed=True,
        linked_document=instance,
        completed_at=timezone.now(),
    )

    if updated:
        checklist.completed_count = checklist.items.filter(
            is_completed=True
        ).count()
        checklist.save(update_fields=["completed_count", "updated_at"])
        logger.info(
            "Auto-checked %d checklist item(s) for case %s (doc_type=%s)",
            updated,
            instance.case,
            instance.doc_type,
        )
