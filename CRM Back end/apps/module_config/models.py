from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# CRM Module
# ---------------------------------------------------------------------------
class CRMModule(TimeStampedModel):
    """
    Module registry - one row per CRM module.
    Managed via seed data, not user-created.
    """

    name = models.CharField(
        _("name"),
        max_length=50,
        unique=True,
        help_text=_("Machine name: contacts, cases, quotes, etc."),
    )
    label = models.CharField(_("label"), max_length=100)
    label_plural = models.CharField(_("label plural"), max_length=100)
    icon = models.CharField(
        _("icon"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("Lucide icon name for frontend."),
    )
    description = models.TextField(_("description"), blank=True, default="")
    is_active = models.BooleanField(_("active"), default=True)
    sort_order = models.IntegerField(_("sort order"), default=0)

    # --- Numbering ---
    number_prefix = models.CharField(
        _("number prefix"),
        max_length=20,
        blank=True,
        default="",
        help_text=_("e.g. TC, QT, CT"),
    )
    number_format = models.CharField(
        _("number format"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("Pattern: {prefix}-{year}-{seq:04d}"),
    )
    number_reset_period = models.CharField(
        _("number reset period"),
        max_length=20,
        blank=True,
        default="yearly",
        help_text=_("yearly, monthly, or never"),
    )
    number_next_seq = models.PositiveIntegerField(
        _("next sequence number"),
        default=1,
    )

    # --- Field config ---
    default_fields = models.JSONField(
        _("default fields"),
        default=dict,
        blank=True,
        help_text=_("Core field visibility configuration."),
    )

    class Meta:
        db_table = "crm_modules"
        ordering = ["sort_order", "name"]
        verbose_name = _("CRM module")
        verbose_name_plural = _("CRM modules")

    def __str__(self):
        return self.label


# ---------------------------------------------------------------------------
# Custom Field
# ---------------------------------------------------------------------------
class CustomField(TimeStampedModel):
    """
    Admin-defined extra fields stored in entity JSONField.
    """

    class FieldType(models.TextChoices):
        TEXT = "text", _("Text")
        NUMBER = "number", _("Number")
        DECIMAL = "decimal", _("Decimal")
        DATE = "date", _("Date")
        DATETIME = "datetime", _("Date & Time")
        BOOLEAN = "boolean", _("Boolean")
        EMAIL = "email", _("Email")
        PHONE = "phone", _("Phone")
        URL = "url", _("URL")
        TEXTAREA = "textarea", _("Text Area")
        SELECT = "select", _("Select")
        MULTISELECT = "multiselect", _("Multi-Select")

    module = models.ForeignKey(
        CRMModule,
        on_delete=models.CASCADE,
        related_name="custom_fields",
        verbose_name=_("module"),
    )
    field_name = models.CharField(
        _("field name"),
        max_length=100,
        help_text=_("Machine name (slug)."),
    )
    label = models.CharField(_("label"), max_length=200)
    field_type = models.CharField(
        _("field type"),
        max_length=20,
        choices=FieldType.choices,
    )
    is_required = models.BooleanField(_("required"), default=False)
    is_active = models.BooleanField(_("active"), default=True)
    default_value = models.CharField(
        _("default value"),
        max_length=500,
        blank=True,
        default="",
    )
    placeholder = models.CharField(
        _("placeholder"),
        max_length=200,
        blank=True,
        default="",
    )
    help_text = models.CharField(
        _("help text"),
        max_length=500,
        blank=True,
        default="",
    )
    options = models.JSONField(
        _("options"),
        default=list,
        blank=True,
        help_text=_('For select/multiselect: [{"value":"a","label":"A"}]'),
    )
    validation_rules = models.JSONField(
        _("validation rules"),
        default=dict,
        blank=True,
        help_text=_('{"min":0,"max":100,"regex":"..."}'),
    )
    sort_order = models.IntegerField(_("sort order"), default=0)
    section = models.CharField(
        _("section"),
        max_length=100,
        blank=True,
        default="",
        help_text=_("Group fields into sections."),
    )
    visible_to_roles = models.JSONField(
        _("visible to roles"),
        default=list,
        blank=True,
        help_text=_("Empty = all roles, or list of role slugs."),
    )

    class Meta:
        db_table = "crm_custom_fields"
        ordering = ["sort_order", "field_name"]
        unique_together = ("module", "field_name")
        verbose_name = _("custom field")
        verbose_name_plural = _("custom fields")

    def __str__(self):
        return f"{self.module.name}.{self.field_name}"


# ---------------------------------------------------------------------------
# Picklist
# ---------------------------------------------------------------------------
class Picklist(TimeStampedModel):
    """
    Named picklist registry.
    Replaces hardcoded TextChoices for status/stage/type fields.
    """

    name = models.CharField(
        _("name"),
        max_length=100,
        help_text=_("Machine name: case_status, quote_stage, etc."),
    )
    label = models.CharField(_("label"), max_length=200)
    module = models.ForeignKey(
        CRMModule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="picklists",
        verbose_name=_("module"),
        help_text=_("null = global picklist"),
    )
    is_system = models.BooleanField(
        _("system picklist"),
        default=False,
        help_text=_("Prevent deletion of system picklists."),
    )
    description = models.TextField(_("description"), blank=True, default="")

    class Meta:
        db_table = "crm_picklists"
        ordering = ["name"]
        unique_together = ("module", "name")
        verbose_name = _("picklist")
        verbose_name_plural = _("picklists")

    def __str__(self):
        return self.label


# ---------------------------------------------------------------------------
# Picklist Value
# ---------------------------------------------------------------------------
class PicklistValue(TimeStampedModel):
    """
    Individual dropdown option within a picklist.
    """

    picklist = models.ForeignKey(
        Picklist,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name=_("picklist"),
    )
    value = models.CharField(_("value"), max_length=100)
    label = models.CharField(_("label"), max_length=200)
    sort_order = models.IntegerField(_("sort order"), default=0)
    is_default = models.BooleanField(_("default"), default=False)
    is_active = models.BooleanField(_("active"), default=True)
    color = models.CharField(
        _("color"),
        max_length=20,
        blank=True,
        default="",
        help_text=_("CSS color for badges."),
    )
    description = models.TextField(_("description"), blank=True, default="")

    class Meta:
        db_table = "crm_picklist_values"
        ordering = ["sort_order", "value"]
        verbose_name = _("picklist value")
        verbose_name_plural = _("picklist values")

    def __str__(self):
        return f"{self.picklist.name}: {self.label}"


# ---------------------------------------------------------------------------
# Field Label
# ---------------------------------------------------------------------------
class FieldLabel(TimeStampedModel):
    """
    Label overrides per module/field (i18n support).
    """

    module = models.ForeignKey(
        CRMModule,
        on_delete=models.CASCADE,
        related_name="field_labels",
        verbose_name=_("module"),
    )
    field_name = models.CharField(_("field name"), max_length=100)
    language = models.CharField(
        _("language"),
        max_length=10,
        default="en",
    )
    custom_label = models.CharField(_("custom label"), max_length=200)

    class Meta:
        db_table = "crm_field_labels"
        ordering = ["module", "field_name"]
        unique_together = ("module", "field_name", "language")
        verbose_name = _("field label")
        verbose_name_plural = _("field labels")

    def __str__(self):
        return f"{self.module.name}.{self.field_name} ({self.language})"
