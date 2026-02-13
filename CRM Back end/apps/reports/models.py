from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class ReportFolder(TimeStampedModel):
    """Folder to organise saved reports."""

    class Meta:
        db_table = "crm_report_folders"
        ordering = ["name"]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_folders",
    )

    def __str__(self):
        return self.name


class Report(TimeStampedModel):
    """User-defined report definition."""

    class ReportType(models.TextChoices):
        DETAIL = "detail", _("Detail")
        SUMMARY = "summary", _("Summary")
        TABULAR = "tabular", _("Tabular")

    class PrimaryModule(models.TextChoices):
        CONTACTS = "contacts", _("Contacts")
        CORPORATIONS = "corporations", _("Corporations")
        CASES = "cases", _("Cases")
        QUOTES = "quotes", _("Quotes")
        APPOINTMENTS = "appointments", _("Appointments")
        TASKS = "tasks", _("Tasks")
        DOCUMENTS = "documents", _("Documents")
        INVOICES = "invoices", _("Invoices")
        USERS = "users", _("Users")

    class Frequency(models.TextChoices):
        NONE = "none", _("None")
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")

    class Meta:
        db_table = "crm_reports"
        ordering = ["-created_at"]

    name = models.CharField(max_length=255)
    report_type = models.CharField(
        max_length=20,
        choices=ReportType.choices,
        default=ReportType.DETAIL,
    )
    primary_module = models.CharField(
        max_length=50,
        choices=PrimaryModule.choices,
    )
    related_modules = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Up to 2 related module names"),
    )
    folder = models.ForeignKey(
        ReportFolder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="owned_reports",
    )
    description = models.TextField(blank=True, default="")
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.NONE,
    )
    shared_with = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="shared_reports",
    )

    # Report configuration stored as JSON
    columns = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Column field names to display"),
    )
    filters = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Filter conditions [{field, operator, value}]"),
    )
    sort_field = models.CharField(max_length=100, blank=True, default="")
    sort_order = models.CharField(
        max_length=4,
        choices=[("asc", "Ascending"), ("desc", "Descending")],
        default="asc",
    )
    chart_type = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text=_("none, bar, line, pie, funnel, etc."),
    )
    chart_config = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Chart configuration {group_by, measure, ...}"),
    )

    # Tracking
    last_run = models.DateTimeField(null=True, blank=True)
    last_accessed = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name
