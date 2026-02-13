from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class SalesQuota(TimeStampedModel):
    """Quota target for a user in a specific fiscal quarter."""

    class Meta:
        db_table = "crm_sales_quotas"
        ordering = ["fiscal_year", "quarter"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "fiscal_year", "quarter"],
                name="unique_user_quarter_quota",
            ),
        ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sales_quotas",
    )
    fiscal_year = models.PositiveIntegerField(db_index=True)
    quarter = models.PositiveSmallIntegerField(
        choices=[(1, "Q1"), (2, "Q2"), (3, "Q3"), (4, "Q4")],
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Quota target amount for this quarter"),
    )
    notify_by_email = models.BooleanField(default=False)
    set_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotas_set",
    )

    def __str__(self):
        return f"Q{self.quarter} FY {self.fiscal_year} – {self.user} – {self.amount}"

    @property
    def period_label(self):
        return f"Q{self.quarter} FY {self.fiscal_year}"


class ForecastEntry(TimeStampedModel):
    """User-submitted forecast for a fiscal quarter (pipeline, best case, commit)."""

    class Meta:
        db_table = "crm_forecast_entries"
        ordering = ["fiscal_year", "quarter"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "fiscal_year", "quarter"],
                name="unique_user_quarter_forecast",
            ),
        ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forecast_entries",
    )
    fiscal_year = models.PositiveIntegerField(db_index=True)
    quarter = models.PositiveSmallIntegerField(
        choices=[(1, "Q1"), (2, "Q2"), (3, "Q3"), (4, "Q4")],
    )
    pipeline = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text=_("Total pipeline value"),
    )
    best_case = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text=_("Best-case forecast"),
    )
    commit = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text=_("Committed forecast"),
    )

    def __str__(self):
        return f"Q{self.quarter} FY {self.fiscal_year} – {self.user}"

    @property
    def period_label(self):
        return f"Q{self.quarter} FY {self.fiscal_year}"
