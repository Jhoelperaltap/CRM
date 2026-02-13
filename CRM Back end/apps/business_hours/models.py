from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class BusinessHours(TimeStampedModel):
    """
    Business hours configuration defining operational time zones,
    working days, working hours, and holidays.
    """

    name = models.CharField(
        _("name"),
        max_length=255,
    )
    timezone = models.CharField(
        _("operational time zone"),
        max_length=100,
        default="America/New_York",
    )
    is_default = models.BooleanField(
        _("default business hours"),
        default=False,
        help_text=_("If checked, this will be the default business hours."),
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
    )

    class Meta:
        db_table = "crm_business_hours"
        ordering = ["-is_default", "name"]
        verbose_name = _("business hours")
        verbose_name_plural = _("business hours")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # If this is set as default, unset any other default
        if self.is_default:
            BusinessHours.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)


class WorkingDay(TimeStampedModel):
    """A working day entry with multiple time intervals."""

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, _("Monday")
        TUESDAY = 1, _("Tuesday")
        WEDNESDAY = 2, _("Wednesday")
        THURSDAY = 3, _("Thursday")
        FRIDAY = 4, _("Friday")
        SATURDAY = 5, _("Saturday")
        SUNDAY = 6, _("Sunday")

    business_hours = models.ForeignKey(
        BusinessHours,
        on_delete=models.CASCADE,
        related_name="working_days",
        verbose_name=_("business hours"),
    )
    day_of_week = models.IntegerField(
        _("day of week"),
        choices=DayOfWeek.choices,
    )
    is_working = models.BooleanField(
        _("is working day"),
        default=True,
    )

    class Meta:
        db_table = "crm_business_hours_working_days"
        ordering = ["day_of_week"]
        unique_together = [("business_hours", "day_of_week")]
        verbose_name = _("working day")
        verbose_name_plural = _("working days")

    def __str__(self):
        return f"{self.business_hours.name} - {self.get_day_of_week_display()}"


class WorkingInterval(TimeStampedModel):
    """A time interval within a working day (e.g., 9:00 AM - 12:00 PM)."""

    working_day = models.ForeignKey(
        WorkingDay,
        on_delete=models.CASCADE,
        related_name="intervals",
        verbose_name=_("working day"),
    )
    start_time = models.TimeField(
        _("start time"),
    )
    end_time = models.TimeField(
        _("end time"),
    )
    sort_order = models.IntegerField(
        _("sort order"),
        default=0,
    )

    class Meta:
        db_table = "crm_business_hours_working_intervals"
        ordering = ["sort_order", "start_time"]
        verbose_name = _("working interval")
        verbose_name_plural = _("working intervals")

    def __str__(self):
        return f"{self.working_day} ({self.start_time} - {self.end_time})"


class Holiday(TimeStampedModel):
    """A holiday entry for business hours."""

    business_hours = models.ForeignKey(
        BusinessHours,
        on_delete=models.CASCADE,
        related_name="holidays",
        verbose_name=_("business hours"),
    )
    date = models.DateField(
        _("date"),
    )
    name = models.CharField(
        _("holiday name"),
        max_length=255,
    )

    class Meta:
        db_table = "crm_business_hours_holidays"
        ordering = ["date"]
        unique_together = [("business_hours", "date")]
        verbose_name = _("holiday")
        verbose_name_plural = _("holidays")

    def __str__(self):
        return f"{self.name} ({self.date})"
