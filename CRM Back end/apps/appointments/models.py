from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Appointment(TimeStampedModel):
    """
    Represents a scheduled appointment with a contact.
    """

    class Location(models.TextChoices):
        OFFICE = "office", _("Office")
        VIRTUAL = "virtual", _("Virtual")
        CLIENT_SITE = "client_site", _("Client Site")
        PHONE = "phone", _("Phone")

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", _("Scheduled")
        CONFIRMED = "confirmed", _("Confirmed")
        CHECKED_IN = "checked_in", _("Checked In")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")
        NO_SHOW = "no_show", _("No Show")

    class RecurrencePattern(models.TextChoices):
        NONE = "none", _("None")
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")

    title = models.CharField(_("title"), max_length=255)
    description = models.TextField(_("description"), blank=True, default="")
    start_datetime = models.DateTimeField(_("start date/time"), db_index=True)
    end_datetime = models.DateTimeField(_("end date/time"))
    location = models.CharField(
        _("location"),
        max_length=20,
        choices=Location.choices,
        default=Location.OFFICE,
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True,
    )

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("contact"),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_appointments",
        verbose_name=_("assigned to"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_appointments",
        verbose_name=_("created by"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
        verbose_name=_("case"),
    )

    reminder_at = models.DateTimeField(_("reminder at"), null=True, blank=True)
    notes = models.TextField(_("notes"), blank=True, default="")

    # Calendar display color (hex format, e.g., "#2563eb")
    color = models.CharField(
        _("calendar color"),
        max_length=7,
        default="#2563eb",
        blank=True,
        help_text=_("Hex color code for calendar display"),
    )

    # Recurrence fields
    recurrence_pattern = models.CharField(
        _("recurrence pattern"),
        max_length=20,
        choices=RecurrencePattern.choices,
        default=RecurrencePattern.NONE,
    )
    recurrence_end_date = models.DateField(
        _("recurrence end date"), null=True, blank=True
    )
    parent_appointment = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recurring_instances",
        verbose_name=_("parent appointment"),
    )
    recurrence_config = models.JSONField(
        _("recurrence config"), default=dict, blank=True
    )

    class Meta:
        db_table = "crm_appointments"
        ordering = ["-start_datetime"]
        verbose_name = _("appointment")
        verbose_name_plural = _("appointments")

    def __str__(self):
        return f"{self.title} ({self.start_datetime:%Y-%m-%d %H:%M})"

    @property
    def is_recurring(self):
        return self.recurrence_pattern != self.RecurrencePattern.NONE

    @property
    def is_recurring_instance(self):
        return self.parent_appointment_id is not None


class AppointmentPage(TimeStampedModel):
    """
    A public booking page that allows clients to schedule appointments.
    Three types: Meet Me, Auto Assigned, Group Event.
    """

    class PageType(models.TextChoices):
        MEET_ME = "meet_me", _("Meet Me")
        AUTO_ASSIGNED = "auto_assigned", _("Auto Assigned")
        GROUP_EVENT = "group_event", _("Group Event")

    class EventActivityType(models.TextChoices):
        CALL = "call", _("Call")
        MEETING = "meeting", _("Meeting")
        DEMO = "demo", _("Demo")
        CONSULTATION = "consultation", _("Consultation")
        FOLLOW_UP = "follow_up", _("Follow Up")
        OTHER = "other", _("Other")

    name = models.CharField(_("name"), max_length=255)
    page_type = models.CharField(
        _("page type"),
        max_length=20,
        choices=PageType.choices,
    )
    introduction = models.TextField(_("introduction"), blank=True, default="")
    slug = models.SlugField(
        _("page link slug"),
        max_length=255,
        unique=True,
        help_text=_("URL-safe identifier appended to the appointment page link"),
    )
    css_url = models.URLField(_("CSS file URL"), max_length=2048, blank=True, default="")
    event_duration = models.PositiveIntegerField(
        _("event duration (minutes)"),
        default=30,
    )
    event_activity_type = models.CharField(
        _("event activity type"),
        max_length=20,
        choices=EventActivityType.choices,
        default=EventActivityType.MEETING,
    )
    meet_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meet_me_pages",
        verbose_name=_("meet with"),
        help_text=_("Specific user for Meet Me pages"),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_appointment_pages",
        verbose_name=_("assigned to"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_appointment_pages",
        verbose_name=_("created by"),
    )
    allow_known_records = models.BooleanField(
        _("allow known records"),
        default=False,
    )
    email_otp_validation = models.BooleanField(
        _("email OTP validation"),
        default=False,
    )
    is_active = models.BooleanField(_("status"), default=True)
    track_utm = models.BooleanField(_("track UTM parameters"), default=False)

    # JSON config blocks for wizard steps
    notification_config = models.JSONField(
        _("notification config"),
        default=dict,
        blank=True,
        help_text=_("Email/notification settings"),
    )
    schedule_config = models.JSONField(
        _("schedule config"),
        default=dict,
        blank=True,
        help_text=_("Availability schedule and buffer times"),
    )
    invitee_questions = models.JSONField(
        _("invitee questions"),
        default=list,
        blank=True,
        help_text=_("Custom questions asked to invitees [{label, type, required}]"),
    )

    # Group event specific
    event = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointment_pages",
        verbose_name=_("linked event"),
        help_text=_("For Group Event pages, the actual event"),
    )

    class Meta:
        db_table = "crm_appointment_pages"
        ordering = ["-created_at"]
        verbose_name = _("appointment page")
        verbose_name_plural = _("appointment pages")

    def __str__(self):
        return f"{self.name} ({self.get_page_type_display()})"
