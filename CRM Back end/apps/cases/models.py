from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Tax Case
# ---------------------------------------------------------------------------
class TaxCase(TimeStampedModel):
    """
    Central model representing a single tax engagement / case.
    Tracks case type, workflow status, dates, fees, and assigned staff.
    """

    # --- Case type choices ---
    class CaseType(models.TextChoices):
        INDIVIDUAL_1040 = "individual_1040", _("Individual (1040)")
        CORPORATE_1120 = "corporate_1120", _("Corporate (1120)")
        S_CORP_1120S = "s_corp_1120s", _("S-Corp (1120-S)")
        PARTNERSHIP_1065 = "partnership_1065", _("Partnership (1065)")
        NONPROFIT_990 = "nonprofit_990", _("Nonprofit (990)")
        TRUST_1041 = "trust_1041", _("Trust (1041)")
        PAYROLL = "payroll", _("Payroll")
        SALES_TAX = "sales_tax", _("Sales Tax")
        AMENDMENT = "amendment", _("Amendment")
        OTHER = "other", _("Other")

    # --- Status choices ---
    class Status(models.TextChoices):
        NEW = "new", _("New")
        WAITING_FOR_DOCUMENTS = "waiting_for_documents", _("Waiting for Documents")
        IN_PROGRESS = "in_progress", _("In Progress")
        UNDER_REVIEW = "under_review", _("Under Review")
        READY_TO_FILE = "ready_to_file", _("Ready to File")
        FILED = "filed", _("Filed")
        COMPLETED = "completed", _("Completed")
        CLOSED = "closed", _("Closed")

    # --- Priority choices ---
    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        URGENT = "urgent", _("Urgent")

    # --- Workflow transition map ---
    VALID_TRANSITIONS = {
        Status.NEW: [Status.IN_PROGRESS, Status.WAITING_FOR_DOCUMENTS],
        Status.WAITING_FOR_DOCUMENTS: [Status.IN_PROGRESS, Status.NEW],
        Status.IN_PROGRESS: [
            Status.UNDER_REVIEW,
            Status.WAITING_FOR_DOCUMENTS,
            Status.NEW,
        ],
        Status.UNDER_REVIEW: [Status.READY_TO_FILE, Status.IN_PROGRESS],
        Status.READY_TO_FILE: [Status.FILED, Status.UNDER_REVIEW],
        Status.FILED: [Status.COMPLETED, Status.UNDER_REVIEW],
        Status.COMPLETED: [Status.CLOSED],
        Status.CLOSED: [],  # terminal state
    }

    # Statuses that lock the record from field edits (only transitions allowed)
    LOCKED_STATUSES = {Status.FILED, Status.COMPLETED, Status.CLOSED}

    # --- Fields ---
    case_number = models.CharField(
        _("case number"),
        max_length=30,
        unique=True,
        db_index=True,
    )
    title = models.CharField(_("title"), max_length=255)
    case_type = models.CharField(
        _("case type"),
        max_length=30,
        choices=CaseType.choices,
        db_index=True,
    )
    fiscal_year = models.PositiveIntegerField(
        _("fiscal year"),
        db_index=True,
    )
    status = models.CharField(
        _("status"),
        max_length=25,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    priority = models.CharField(
        _("priority"),
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True,
    )

    # --- Relationships ---
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.PROTECT,
        related_name="tax_cases",
        verbose_name=_("contact"),
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tax_cases",
        verbose_name=_("corporation"),
    )
    assigned_preparer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prepared_cases",
        verbose_name=_("assigned preparer"),
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_cases",
        verbose_name=_("reviewer"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cases",
        verbose_name=_("created by"),
    )

    # --- Fees ---
    estimated_fee = models.DecimalField(
        _("estimated fee"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    actual_fee = models.DecimalField(
        _("actual fee"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    # --- Dates ---
    due_date = models.DateField(_("due date"), null=True, blank=True, db_index=True)
    extension_date = models.DateField(_("extension date"), null=True, blank=True)
    filed_date = models.DateField(_("filed date"), null=True, blank=True)
    completed_date = models.DateField(_("completed date"), null=True, blank=True)
    closed_date = models.DateField(_("closed date"), null=True, blank=True)

    # --- Custom fields ---
    custom_fields = models.JSONField(
        _("custom fields"),
        default=dict,
        blank=True,
    )

    # --- Notes ---
    description = models.TextField(_("description"), blank=True, default="")

    class Meta:
        db_table = "crm_tax_cases"
        ordering = ["-created_at"]
        verbose_name = _("tax case")
        verbose_name_plural = _("tax cases")
        indexes = [
            # Common filter: cases by status and preparer
            models.Index(
                fields=["status", "assigned_preparer"],
                name="idx_case_status_preparer",
            ),
            # Common filter: cases by status and due date
            models.Index(
                fields=["status", "due_date"],
                name="idx_case_status_due",
            ),
            # Common filter: cases by fiscal year and status
            models.Index(
                fields=["fiscal_year", "status"],
                name="idx_case_year_status",
            ),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.title}"

    @property
    def is_locked(self):
        """Return True if the case is in a locked status (no field edits allowed)."""
        return self.status in self.LOCKED_STATUSES


# ---------------------------------------------------------------------------
# Tax Case Note
# ---------------------------------------------------------------------------
class TaxCaseNote(TimeStampedModel):
    """
    Internal or client-visible note attached to a tax case.
    """

    case = models.ForeignKey(
        TaxCase,
        on_delete=models.CASCADE,
        related_name="notes",
        verbose_name=_("case"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="case_notes",
        verbose_name=_("author"),
    )
    content = models.TextField(_("content"))
    is_internal = models.BooleanField(
        _("internal note"),
        default=True,
        help_text=_("Internal notes are only visible to staff."),
    )

    class Meta:
        db_table = "crm_tax_case_notes"
        ordering = ["-created_at"]
        verbose_name = _("tax case note")
        verbose_name_plural = _("tax case notes")

    def __str__(self):
        label = "Internal" if self.is_internal else "Client"
        return f"[{label}] {self.case.case_number} - {self.pk}"


# Import checklist models so they are discovered by Django
from apps.cases.checklist_models import (  # noqa: E402, F401
    CaseChecklist,
    CaseChecklistItem,
    ChecklistTemplate,
    ChecklistTemplateItem,
)
