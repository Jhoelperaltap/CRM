from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Quote
# ---------------------------------------------------------------------------
class Quote(TimeStampedModel):
    """
    A service proposal / fee estimate sent to a client.
    Tracks pricing, line items, addresses, and workflow stage.
    """

    class Stage(models.TextChoices):
        DRAFT = "draft", _("Draft")
        SENT = "sent", _("Sent")
        ACCEPTED = "accepted", _("Accepted")
        REJECTED = "rejected", _("Rejected")
        EXPIRED = "expired", _("Expired")

    # --- Fields ---
    quote_number = models.CharField(
        _("quote number"),
        max_length=20,
        unique=True,
        db_index=True,
    )
    subject = models.CharField(_("subject"), max_length=255)
    stage = models.CharField(
        _("stage"),
        max_length=20,
        choices=Stage.choices,
        default=Stage.DRAFT,
        db_index=True,
    )
    valid_until = models.DateField(_("valid until"), null=True, blank=True)

    # --- Relationships ---
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.PROTECT,
        related_name="quotes",
        verbose_name=_("contact"),
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
        verbose_name=_("corporation"),
    )
    case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
        verbose_name=_("case"),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_quotes",
        verbose_name=_("assigned to"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_quotes",
        verbose_name=_("created by"),
    )

    # --- Billing address ---
    billing_street = models.CharField(
        _("billing street"), max_length=255, blank=True, default=""
    )
    billing_city = models.CharField(
        _("billing city"), max_length=100, blank=True, default=""
    )
    billing_state = models.CharField(
        _("billing state"), max_length=100, blank=True, default=""
    )
    billing_zip = models.CharField(
        _("billing zip"), max_length=20, blank=True, default=""
    )
    billing_country = models.CharField(
        _("billing country"), max_length=100, blank=True, default="United States"
    )

    # --- Shipping address ---
    shipping_street = models.CharField(
        _("shipping street"), max_length=255, blank=True, default=""
    )
    shipping_city = models.CharField(
        _("shipping city"), max_length=100, blank=True, default=""
    )
    shipping_state = models.CharField(
        _("shipping state"), max_length=100, blank=True, default=""
    )
    shipping_zip = models.CharField(
        _("shipping zip"), max_length=20, blank=True, default=""
    )
    shipping_country = models.CharField(
        _("shipping country"), max_length=100, blank=True, default="United States"
    )

    # --- Totals ---
    subtotal = models.DecimalField(
        _("subtotal"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    discount_percent = models.DecimalField(
        _("discount percent"),
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    discount_amount = models.DecimalField(
        _("discount amount"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    tax_percent = models.DecimalField(
        _("tax percent"),
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    tax_amount = models.DecimalField(
        _("tax amount"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    total = models.DecimalField(
        _("total"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # --- Custom fields ---
    custom_fields = models.JSONField(
        _("custom fields"),
        default=dict,
        blank=True,
    )

    # --- Text ---
    terms_conditions = models.TextField(_("terms & conditions"), blank=True, default="")
    description = models.TextField(_("description"), blank=True, default="")

    class Meta:
        db_table = "crm_quotes"
        ordering = ["-created_at"]
        verbose_name = _("quote")
        verbose_name_plural = _("quotes")

    def __str__(self):
        return f"{self.quote_number} - {self.subject}"


# ---------------------------------------------------------------------------
# Quote Line Item
# ---------------------------------------------------------------------------
class QuoteLineItem(TimeStampedModel):
    """
    Individual service line on a quote.
    """

    class ServiceType(models.TextChoices):
        INDIVIDUAL_1040 = "individual_1040", _("Individual (1040)")
        CORPORATE_1120 = "corporate_1120", _("Corporate (1120)")
        S_CORP_1120S = "s_corp_1120s", _("S-Corp (1120-S)")
        PARTNERSHIP_1065 = "partnership_1065", _("Partnership (1065)")
        NONPROFIT_990 = "nonprofit_990", _("Nonprofit (990)")
        TRUST_1041 = "trust_1041", _("Trust (1041)")
        PAYROLL = "payroll", _("Payroll")
        SALES_TAX = "sales_tax", _("Sales Tax")
        BOOKKEEPING = "bookkeeping", _("Bookkeeping")
        CONSULTING = "consulting", _("Consulting")
        AMENDMENT = "amendment", _("Amendment")
        OTHER = "other", _("Other")

    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name="line_items",
        verbose_name=_("quote"),
    )
    service_type = models.CharField(
        _("service type"),
        max_length=30,
        choices=ServiceType.choices,
        default=ServiceType.OTHER,
    )
    description = models.CharField(
        _("description"), max_length=255, blank=True, default=""
    )
    quantity = models.DecimalField(
        _("quantity"),
        max_digits=10,
        decimal_places=2,
        default=1,
    )
    unit_price = models.DecimalField(
        _("unit price"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    discount_percent = models.DecimalField(
        _("discount percent"),
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    total = models.DecimalField(
        _("total"),
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    sort_order = models.IntegerField(_("sort order"), default=0)

    class Meta:
        db_table = "crm_quote_line_items"
        ordering = ["sort_order", "created_at"]
        verbose_name = _("quote line item")
        verbose_name_plural = _("quote line items")

    def __str__(self):
        return f"{self.quote.quote_number} - {self.description}"
