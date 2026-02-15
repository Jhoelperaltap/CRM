"""
Webforms models for creating embeddable forms that feed into CRM modules.
"""

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Webform(TimeStampedModel):
    """
    Main webform configuration.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_("Name"), max_length=255)
    primary_module = models.CharField(
        _("Primary Module"),
        max_length=50,
        help_text=_(
            "CRM module to create records in (e.g., contacts, cases, corporations)"
        ),
    )
    return_url = models.URLField(
        _("Return URL"),
        max_length=2048,
        blank=True,
        help_text=_("URL to redirect after form submission"),
    )
    description = models.TextField(_("Description"), blank=True)
    is_active = models.BooleanField(_("Active"), default=True)
    captcha_enabled = models.BooleanField(_("Captcha Enabled"), default=False)
    assigned_to = models.ForeignKey(
        "users.User",
        verbose_name=_("Assigned To"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_webforms",
        help_text=_("Default user to assign created records to"),
    )
    round_robin_enabled = models.BooleanField(
        _("Round Robin Enabled"),
        default=False,
        help_text=_("Distribute assignments among round robin users"),
    )
    created_by = models.ForeignKey(
        "users.User",
        verbose_name=_("Created By"),
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_webforms",
    )

    class Meta:
        db_table = "crm_webforms"
        verbose_name = _("Webform")
        verbose_name_plural = _("Webforms")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class WebformField(TimeStampedModel):
    """
    Field configuration for a webform.
    """

    class DuplicateHandling(models.TextChoices):
        NONE = "none", _("None")
        SKIP = "skip", _("Skip")
        UPDATE = "update", _("Update")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webform = models.ForeignKey(
        Webform,
        verbose_name=_("Webform"),
        on_delete=models.CASCADE,
        related_name="fields",
    )
    field_name = models.CharField(
        _("Field Name"), max_length=100, help_text=_("CRM field machine name")
    )
    is_mandatory = models.BooleanField(_("Mandatory"), default=False)
    is_hidden = models.BooleanField(_("Hidden"), default=False)
    override_value = models.CharField(
        _("Override Value"),
        max_length=500,
        blank=True,
        help_text=_("Default or forced value for this field"),
    )
    reference_field = models.CharField(
        _("Reference Field"),
        max_length=100,
        blank=True,
        help_text=_("For lookup reference fields"),
    )
    duplicate_handling = models.CharField(
        _("Duplicate Handling"),
        max_length=20,
        choices=DuplicateHandling.choices,
        default=DuplicateHandling.NONE,
    )
    sort_order = models.IntegerField(_("Sort Order"), default=0)

    class Meta:
        db_table = "crm_webform_fields"
        verbose_name = _("Webform Field")
        verbose_name_plural = _("Webform Fields")
        ordering = ["sort_order"]
        unique_together = [["webform", "field_name"]]

    def __str__(self):
        return f"{self.webform.name} - {self.field_name}"


class WebformHiddenField(TimeStampedModel):
    """
    Hidden fields that can be populated from URL parameters.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webform = models.ForeignKey(
        Webform,
        verbose_name=_("Webform"),
        on_delete=models.CASCADE,
        related_name="hidden_fields",
    )
    field_name = models.CharField(_("Field Name"), max_length=100)
    url_parameter = models.CharField(
        _("URL Parameter"),
        max_length=100,
        blank=True,
        help_text=_("URL query parameter to read value from"),
    )
    override_value = models.CharField(
        _("Override Value"),
        max_length=500,
        blank=True,
        help_text=_("Static value to use if URL parameter is not provided"),
    )
    sort_order = models.IntegerField(_("Sort Order"), default=0)

    class Meta:
        db_table = "crm_webform_hidden_fields"
        verbose_name = _("Webform Hidden Field")
        verbose_name_plural = _("Webform Hidden Fields")
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.webform.name} - {self.field_name} (hidden)"


class WebformRoundRobinUser(TimeStampedModel):
    """
    Users in the round-robin rotation for form submissions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webform = models.ForeignKey(
        Webform,
        verbose_name=_("Webform"),
        on_delete=models.CASCADE,
        related_name="round_robin_users",
    )
    user = models.ForeignKey(
        "users.User", verbose_name=_("User"), on_delete=models.CASCADE
    )
    sort_order = models.IntegerField(_("Sort Order"), default=0)

    class Meta:
        db_table = "crm_webform_round_robin_users"
        verbose_name = _("Round Robin User")
        verbose_name_plural = _("Round Robin Users")
        ordering = ["sort_order"]
        unique_together = [["webform", "user"]]

    def __str__(self):
        return f"{self.webform.name} - {self.user.full_name}"
