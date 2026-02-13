import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class Branch(models.Model):
    """
    Represents a physical office or branch location.
    Users can be assigned to a branch for multi-office management.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_("branch name"), max_length=100, unique=True)
    code = models.CharField(
        _("branch code"),
        max_length=20,
        unique=True,
        help_text=_("Short code for the branch (e.g. 'NYC', 'MIA')."),
    )
    address = models.CharField(_("address"), max_length=255, blank=True, default="")
    city = models.CharField(_("city"), max_length=100, blank=True, default="")
    state = models.CharField(_("state"), max_length=100, blank=True, default="")
    zip_code = models.CharField(_("ZIP code"), max_length=20, blank=True, default="")
    phone = models.CharField(_("phone"), max_length=20, blank=True, default="")
    is_active = models.BooleanField(_("active"), default=True)
    is_headquarters = models.BooleanField(
        _("headquarters"),
        default=False,
        help_text=_("Designate as the main office."),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "crm_branches"
        ordering = ["-is_headquarters", "name"]
        verbose_name = _("branch")
        verbose_name_plural = _("branches")

    def __str__(self):
        return f"{self.name} ({self.code})"
