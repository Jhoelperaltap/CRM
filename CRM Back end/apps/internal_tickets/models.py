from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class InternalTicket(TimeStampedModel):
    """
    Internal support / help-desk ticket for team use (Vtiger-style).
    """

    # --- Status ---
    class Status(models.TextChoices):
        NEW = "new", _("New")
        OPEN = "open", _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        WAIT_FOR_RESPONSE = "wait_for_response", _("Wait For Response")
        CLOSED = "closed", _("Closed")

    # --- Priority ---
    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        NORMAL = "normal", _("Normal")
        HIGH = "high", _("High")
        URGENT = "urgent", _("Urgent")

    # --- Channel ---
    class Channel(models.TextChoices):
        EMAIL = "email", _("Email")
        PHONE = "phone", _("Phone")
        WEB = "web", _("Web")
        CHAT = "chat", _("Chat")
        PORTAL = "portal", _("Portal")
        OTHER = "other", _("Other")

    # --- Category ---
    class Category(models.TextChoices):
        GENERAL = "general", _("General")
        TECHNICAL = "technical", _("Technical")
        BILLING = "billing", _("Billing")
        HR = "hr", _("HR")
        IT = "it", _("IT")
        OTHER = "other", _("Other")

    # --- Resolution Type ---
    class ResolutionType(models.TextChoices):
        FIXED = "fixed", _("Fixed")
        WONT_FIX = "wont_fix", _("Won't Fix")
        DUPLICATE = "duplicate", _("Duplicate")
        DEFERRED = "deferred", _("Deferred")
        OTHER = "other", _("Other")

    # --- Rating ---
    class Rating(models.TextChoices):
        ONE = "1", _("1 Star")
        TWO = "2", _("2 Stars")
        THREE = "3", _("3 Stars")
        FOUR = "4", _("4 Stars")
        FIVE = "5", _("5 Stars")

    # === Ticket Summary Information ===
    ticket_number = models.CharField(
        _("ticket number"),
        max_length=20,
        unique=True,
        editable=False,
    )
    title = models.CharField(_("title"), max_length=255)
    description = models.TextField(_("description"), blank=True, default="")

    # === Basic Information ===
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    priority = models.CharField(
        _("priority"),
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    group = models.ForeignKey(
        "users.UserGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="internal_tickets",
        verbose_name=_("group"),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_internal_tickets",
        verbose_name=_("assigned to"),
    )
    channel = models.CharField(
        _("channel"),
        max_length=10,
        choices=Channel.choices,
        blank=True,
        default="",
    )
    resolution = models.TextField(_("resolution"), blank=True, default="")

    # === Additional fields ===
    email = models.EmailField(_("email"), blank=True, default="")
    category = models.CharField(
        _("category"),
        max_length=20,
        choices=Category.choices,
        blank=True,
        default="",
    )
    deferred_date = models.DateField(
        _("deferred date"), null=True, blank=True
    )
    resolution_type = models.CharField(
        _("resolution type"),
        max_length=20,
        choices=ResolutionType.choices,
        blank=True,
        default="",
    )
    rating = models.CharField(
        _("rating"),
        max_length=1,
        choices=Rating.choices,
        blank=True,
        default="",
    )
    reopen_count = models.PositiveIntegerField(
        _("reopen count"), default=0
    )
    satisfaction_survey_feedback = models.TextField(
        _("satisfaction survey feedback"), blank=True, default=""
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_internal_tickets",
        verbose_name=_("employee"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_internal_tickets",
        verbose_name=_("created by"),
    )

    # === SLA Information ===
    sla_name = models.CharField(
        _("SLA name"), max_length=100, blank=True, default=""
    )
    sla_hours = models.PositiveIntegerField(
        _("SLA hours"),
        null=True,
        blank=True,
        help_text=_("Expected resolution time in hours."),
    )
    sla_breached_at = models.DateTimeField(
        _("SLA breached at"), null=True, blank=True
    )

    class Meta:
        db_table = "crm_internal_tickets"
        ordering = ["-created_at"]
        verbose_name = _("internal ticket")
        verbose_name_plural = _("internal tickets")

    def __str__(self):
        return f"{self.ticket_number} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            last = (
                InternalTicket.objects.order_by("-created_at")
                .values_list("ticket_number", flat=True)
                .first()
            )
            if last:
                try:
                    seq = int(last.split("-")[1]) + 1
                except (IndexError, ValueError):
                    seq = 1
            else:
                seq = 1
            self.ticket_number = f"TKT-{seq:05d}"
        super().save(*args, **kwargs)
