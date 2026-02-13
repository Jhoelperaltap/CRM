from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class ChecklistTemplate(TimeStampedModel):
    """Admin-configurable checklist template for a case type + tax year."""

    name = models.CharField(max_length=200)
    case_type = models.CharField(max_length=30, db_index=True)
    tax_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Leave blank for a default template that applies to all years.",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["case_type", "-tax_year"]
        constraints = [
            models.UniqueConstraint(
                fields=["case_type", "tax_year"],
                name="unique_checklist_template_type_year",
            ),
        ]

    def __str__(self):
        year = self.tax_year or "All Years"
        return f"{self.name} ({self.case_type} / {year})"


class ChecklistTemplateItem(TimeStampedModel):
    """A single item in a checklist template."""

    template = models.ForeignKey(
        ChecklistTemplate, on_delete=models.CASCADE, related_name="items"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    doc_type = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="If set, auto-checks when a document of this type is uploaded.",
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.title


class CaseChecklist(TimeStampedModel):
    """An instantiated checklist attached to a specific case."""

    case = models.OneToOneField(
        "cases.TaxCase", on_delete=models.CASCADE, related_name="checklist"
    )
    template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    completed_count = models.PositiveIntegerField(default=0)
    total_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Checklist for {self.case}"

    @property
    def progress_percent(self):
        if self.total_count == 0:
            return 0
        return round(self.completed_count / self.total_count * 100)


class CaseChecklistItem(TimeStampedModel):
    """A single item in a case's checklist."""

    checklist = models.ForeignKey(
        CaseChecklist, on_delete=models.CASCADE, related_name="items"
    )
    template_item = models.ForeignKey(
        ChecklistTemplateItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    doc_type = models.CharField(max_length=20, blank=True, default="")
    linked_document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        status = "done" if self.is_completed else "pending"
        return f"{self.title} [{status}]"
