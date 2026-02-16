import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


# ---------------------------------------------------------------------------
# Dashboard Widget
# ---------------------------------------------------------------------------
class DashboardWidget(models.Model):
    """
    System-defined widgets that can appear on the user dashboard.
    Each widget_type maps to a specific data aggregation / chart.
    """

    class WidgetType(models.TextChoices):
        CASES_BY_STATUS = "cases_by_status", _("Cases by Status")
        REVENUE_PIPELINE = "revenue_pipeline", _("Revenue Pipeline")
        UPCOMING_DEADLINES = "upcoming_deadlines", _("Upcoming Deadlines")
        RECENT_CASES = "recent_cases", _("Recent Cases")
        CASES_BY_PREPARER = "cases_by_preparer", _("Cases by Preparer")
        CASES_BY_TYPE = "cases_by_type", _("Cases by Type")
        MONTHLY_FILINGS = "monthly_filings", _("Monthly Filings")
        CONTACT_STATS = "contact_stats", _("Contact Stats")
        APPOINTMENTS_TODAY = "appointments_today", _("Appointments Today")
        MISSING_DOCS = "missing_docs", _("Missing Documents")
        TASKS_BY_USER = "tasks_by_user", _("Tasks by User")

    class ChartType(models.TextChoices):
        BAR = "bar", _("Bar Chart")
        PIE = "pie", _("Pie Chart")
        LINE = "line", _("Line Chart")
        AREA = "area", _("Area Chart")
        TABLE = "table", _("Table")
        STAT_CARD = "stat_card", _("Stat Card")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(_("name"), max_length=100)
    widget_type = models.CharField(
        _("widget type"),
        max_length=30,
        choices=WidgetType.choices,
        unique=True,
    )
    chart_type = models.CharField(
        _("chart type"),
        max_length=20,
        choices=ChartType.choices,
    )
    description = models.TextField(_("description"), blank=True, default="")
    default_enabled = models.BooleanField(_("enabled by default"), default=True)
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)

    class Meta:
        db_table = "crm_dashboard_widgets"
        ordering = ["sort_order"]
        verbose_name = _("dashboard widget")
        verbose_name_plural = _("dashboard widgets")

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# User Dashboard Config
# ---------------------------------------------------------------------------
class UserDashboardConfig(models.Model):
    """
    Per-user layout configuration for dashboard widgets.
    Stores visibility, position, and width for each widget a user has.
    """

    class Width(models.TextChoices):
        FULL = "full", _("Full Width")
        HALF = "half", _("Half Width")
        THIRD = "third", _("One Third Width")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="dashboard_configs",
        verbose_name=_("user"),
    )
    widget = models.ForeignKey(
        DashboardWidget,
        on_delete=models.CASCADE,
        related_name="user_configs",
        verbose_name=_("widget"),
    )
    is_visible = models.BooleanField(_("visible"), default=True)
    position = models.PositiveIntegerField(_("position"), default=0)
    width = models.CharField(
        _("width"),
        max_length=10,
        choices=Width.choices,
        default=Width.HALF,
    )

    class Meta:
        db_table = "crm_user_dashboard_configs"
        unique_together = ("user", "widget")
        ordering = ["position"]
        verbose_name = _("user dashboard config")
        verbose_name_plural = _("user dashboard configs")

    def __str__(self):
        return f"{self.user} | {self.widget.name} (pos {self.position})"


# ---------------------------------------------------------------------------
# User Preference
# ---------------------------------------------------------------------------
class UserPreference(models.Model):
    """
    Global UI / display preferences per user.
    """

    class Theme(models.TextChoices):
        LIGHT = "light", _("Light")
        DARK = "dark", _("Dark")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="preferences",
        verbose_name=_("user"),
    )
    theme = models.CharField(
        _("theme"),
        max_length=10,
        choices=Theme.choices,
        default=Theme.LIGHT,
    )
    sidebar_collapsed = models.BooleanField(_("sidebar collapsed"), default=False)
    items_per_page = models.PositiveIntegerField(_("items per page"), default=25)
    date_format = models.CharField(
        _("date format"),
        max_length=20,
        default="MM/DD/YYYY",
    )
    timezone = models.CharField(
        _("timezone"),
        max_length=50,
        default="America/New_York",
    )

    class Meta:
        db_table = "crm_user_preferences"
        verbose_name = _("user preference")
        verbose_name_plural = _("user preferences")

    def __str__(self):
        return f"Preferences for {self.user}"


# ---------------------------------------------------------------------------
# Sticky Note
# ---------------------------------------------------------------------------
class StickyNote(models.Model):
    """
    Personal sticky notes / reminders for users.
    Displayed on the dashboard as colorful note cards.
    """

    class Color(models.TextChoices):
        YELLOW = "yellow", _("Yellow")
        BLUE = "blue", _("Blue")
        GREEN = "green", _("Green")
        PINK = "pink", _("Pink")
        PURPLE = "purple", _("Purple")
        ORANGE = "orange", _("Orange")

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="sticky_notes",
        verbose_name=_("user"),
    )
    title = models.CharField(_("title"), max_length=100, blank=True, default="")
    content = models.TextField(
        _("content"),
        help_text=_("The note content/reminder text"),
    )
    color = models.CharField(
        _("color"),
        max_length=10,
        choices=Color.choices,
        default=Color.YELLOW,
    )
    priority = models.CharField(
        _("priority"),
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    is_pinned = models.BooleanField(
        _("pinned"),
        default=False,
        help_text=_("Pinned notes appear at the top"),
    )
    reminder_date = models.DateTimeField(
        _("reminder date"),
        null=True,
        blank=True,
        help_text=_("Optional date/time for reminder"),
    )
    is_completed = models.BooleanField(_("completed"), default=False)
    position = models.PositiveIntegerField(
        _("position"),
        default=0,
        help_text=_("Order in which notes appear"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "crm_sticky_notes"
        ordering = ["-is_pinned", "position", "-created_at"]
        verbose_name = _("sticky note")
        verbose_name_plural = _("sticky notes")

    def __str__(self):
        return self.title or f"Note {self.id}"
