from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.fields import EncryptedCharField
from apps.core.models import TimeStampedModel


class Corporation(TimeStampedModel):
    """
    Represents a corporate entity (business, LLC, partnership, etc.)
    tracked in the CRM system.
    """

    # ------------------------------------------------------------------
    # Entity-type choices
    # ------------------------------------------------------------------
    class EntityType(models.TextChoices):
        SOLE_PROPRIETORSHIP = "sole_proprietorship", _("Sole Proprietorship")
        PARTNERSHIP = "partnership", _("Partnership")
        LLC = "llc", _("LLC")
        S_CORP = "s_corp", _("S Corporation")
        C_CORP = "c_corp", _("C Corporation")
        NONPROFIT = "nonprofit", _("Nonprofit")
        TRUST = "trust", _("Trust")
        ESTATE = "estate", _("Estate")
        OTHER = "other", _("Other")

    # ------------------------------------------------------------------
    # Status choices
    # ------------------------------------------------------------------
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        DISSOLVED = "dissolved", _("Dissolved")

    # ------------------------------------------------------------------
    # Organization Type choices (Lead, Customer, etc.)
    # ------------------------------------------------------------------
    class OrganizationType(models.TextChoices):
        LEAD = "lead", _("Lead")
        CUSTOMER = "customer", _("Customer")
        PARTNER = "partner", _("Partner")
        RESELLER = "reseller", _("Reseller")
        COMPETITOR = "competitor", _("Competitor")
        INVESTOR = "investor", _("Investor")
        PRESS = "press", _("Press")
        PROSPECT = "prospect", _("Prospect")
        OTHER = "other", _("Other")

    # ------------------------------------------------------------------
    # Organization Status (Hot, Warm, Cold)
    # ------------------------------------------------------------------
    class OrganizationStatus(models.TextChoices):
        HOT = "hot", _("Hot")
        WARM = "warm", _("Warm")
        COLD = "cold", _("Cold")

    # ------------------------------------------------------------------
    # Annual Revenue Range choices
    # ------------------------------------------------------------------
    class AnnualRevenueRange(models.TextChoices):
        UNDER_100K = "under_100k", _("Under $100,000")
        RANGE_100K_500K = "100k_500k", _("$100,000 - $500,000")
        RANGE_500K_1M = "500k_1m", _("$500,000 - $1,000,000")
        RANGE_1M_5M = "1m_5m", _("$1,000,000 - $5,000,000")
        RANGE_5M_10M = "5m_10m", _("$5,000,000 - $10,000,000")
        RANGE_10M_25M = "10m_25m", _("$10,000,000 - $25,000,000")
        RANGE_25M_50M = "25m_50m", _("$25,000,000 - $50,000,000")
        RANGE_50M_100M = "50m_100m", _("$50,000,000 - $100,000,000")
        OVER_100M = "over_100m", _("Over $100,000,000")

    # ------------------------------------------------------------------
    # Region choices
    # ------------------------------------------------------------------
    class Region(models.TextChoices):
        NORTH = "north", _("North")
        SOUTH = "south", _("South")
        EAST = "east", _("East")
        WEST = "west", _("West")
        NORTHEAST = "northeast", _("Northeast")
        NORTHWEST = "northwest", _("Northwest")
        SOUTHEAST = "southeast", _("Southeast")
        SOUTHWEST = "southwest", _("Southwest")
        CENTRAL = "central", _("Central")
        INTERNATIONAL = "international", _("International")

    # ------------------------------------------------------------------
    # Email/SMS Opt-in choices
    # ------------------------------------------------------------------
    class OptInStatus(models.TextChoices):
        SINGLE_OPT_IN = "single_opt_in", _("Single opt-in (user)")
        DOUBLE_OPT_IN = "double_opt_in", _("Double opt-in")
        OPT_OUT = "opt_out", _("Opt-out")
        NOT_SET = "not_set", _("Not set")

    # ------------------------------------------------------------------
    # Core fields
    # ------------------------------------------------------------------
    name = models.CharField(
        _("name"),
        max_length=255,
        db_index=True,
    )
    legal_name = models.CharField(
        _("legal name"),
        max_length=255,
        blank=True,
        default="",
    )
    entity_type = models.CharField(
        _("entity type"),
        max_length=30,
        choices=EntityType.choices,
        db_index=True,
    )
    organization_type = models.CharField(
        _("organization type"),
        max_length=20,
        choices=OrganizationType.choices,
        default=OrganizationType.LEAD,
        db_index=True,
    )
    organization_status = models.CharField(
        _("organization status"),
        max_length=10,
        choices=OrganizationStatus.choices,
        default=OrganizationStatus.COLD,
    )
    ein = EncryptedCharField(
        _("EIN"),
        max_length=255,
        blank=True,
        default="",
        help_text=_("Employer Identification Number. Encrypted at rest."),
    )
    state_id = models.CharField(
        _("state ID"),
        max_length=50,
        blank=True,
        default="",
    )

    # ------------------------------------------------------------------
    # Business details
    # ------------------------------------------------------------------
    employees = models.PositiveIntegerField(
        _("employees"),
        null=True,
        blank=True,
        help_text=_("Number of employees"),
    )
    ownership = models.CharField(
        _("ownership"),
        max_length=100,
        blank=True,
        default="",
    )
    ticker_symbol = models.CharField(
        _("ticker symbol"),
        max_length=20,
        blank=True,
        default="",
    )
    sic_code = models.CharField(
        _("SIC code"),
        max_length=20,
        blank=True,
        default="",
        help_text=_("Standard Industrial Classification code"),
    )
    industry = models.CharField(
        _("industry"),
        max_length=100,
        blank=True,
        default="",
    )
    annual_revenue = models.DecimalField(
        _("annual revenue"),
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )
    annual_revenue_range = models.CharField(
        _("annual revenue range"),
        max_length=20,
        choices=AnnualRevenueRange.choices,
        blank=True,
        default="",
    )
    fiscal_year_end = models.CharField(
        _("fiscal year end"),
        max_length=20,
        blank=True,
        default="",
    )
    date_incorporated = models.DateField(
        _("date incorporated"),
        null=True,
        blank=True,
    )
    region = models.CharField(
        _("region"),
        max_length=20,
        choices=Region.choices,
        blank=True,
        default="",
    )
    timezone = models.CharField(
        _("timezone"),
        max_length=50,
        blank=True,
        default="",
    )

    # ------------------------------------------------------------------
    # Billing Address
    # ------------------------------------------------------------------
    billing_street = models.CharField(
        _("billing street"),
        max_length=255,
        blank=True,
        default="",
    )
    billing_city = models.CharField(
        _("billing city"),
        max_length=100,
        blank=True,
        default="",
    )
    billing_state = models.CharField(
        _("billing state"),
        max_length=100,
        blank=True,
        default="",
    )
    billing_zip = models.CharField(
        _("billing ZIP code"),
        max_length=20,
        blank=True,
        default="",
    )
    billing_country = models.CharField(
        _("billing country"),
        max_length=100,
        blank=True,
        default="United States",
    )
    billing_po_box = models.CharField(
        _("billing PO box"),
        max_length=50,
        blank=True,
        default="",
    )

    # ------------------------------------------------------------------
    # Shipping Address
    # ------------------------------------------------------------------
    shipping_street = models.CharField(
        _("shipping street"),
        max_length=255,
        blank=True,
        default="",
    )
    shipping_city = models.CharField(
        _("shipping city"),
        max_length=100,
        blank=True,
        default="",
    )
    shipping_state = models.CharField(
        _("shipping state"),
        max_length=100,
        blank=True,
        default="",
    )
    shipping_zip = models.CharField(
        _("shipping ZIP code"),
        max_length=20,
        blank=True,
        default="",
    )
    shipping_country = models.CharField(
        _("shipping country"),
        max_length=100,
        blank=True,
        default="United States",
    )
    shipping_po_box = models.CharField(
        _("shipping PO box"),
        max_length=50,
        blank=True,
        default="",
    )

    # Keep legacy address fields for compatibility
    street_address = models.CharField(
        _("street address"),
        max_length=255,
        blank=True,
        default="",
    )
    city = models.CharField(
        _("city"),
        max_length=100,
        blank=True,
        default="",
    )
    state = models.CharField(
        _("state"),
        max_length=100,
        blank=True,
        default="",
    )
    zip_code = models.CharField(
        _("ZIP code"),
        max_length=20,
        blank=True,
        default="",
    )
    country = models.CharField(
        _("country"),
        max_length=100,
        blank=True,
        default="United States",
    )

    # ------------------------------------------------------------------
    # Contact info
    # ------------------------------------------------------------------
    phone = models.CharField(
        _("phone"),
        max_length=30,
        blank=True,
        default="",
    )
    secondary_phone = models.CharField(
        _("secondary phone"),
        max_length=30,
        blank=True,
        default="",
    )
    fax = models.CharField(
        _("fax"),
        max_length=30,
        blank=True,
        default="",
    )
    email = models.EmailField(
        _("email"),
        blank=True,
        default="",
    )
    secondary_email = models.EmailField(
        _("secondary email"),
        blank=True,
        default="",
    )
    email_domain = models.CharField(
        _("email domain"),
        max_length=100,
        blank=True,
        default="",
    )
    website = models.URLField(
        _("website"),
        blank=True,
        default="",
    )

    # ------------------------------------------------------------------
    # Social media
    # ------------------------------------------------------------------
    twitter_username = models.CharField(
        _("Twitter username"),
        max_length=100,
        blank=True,
        default="",
    )
    linkedin_url = models.URLField(
        _("LinkedIn URL"),
        blank=True,
        default="",
    )
    facebook_url = models.URLField(
        _("Facebook URL"),
        blank=True,
        default="",
    )

    # ------------------------------------------------------------------
    # Marketing preferences
    # ------------------------------------------------------------------
    email_opt_in = models.CharField(
        _("email opt-in"),
        max_length=20,
        choices=OptInStatus.choices,
        default=OptInStatus.SINGLE_OPT_IN,
    )
    sms_opt_in = models.CharField(
        _("SMS opt-in"),
        max_length=20,
        choices=OptInStatus.choices,
        default=OptInStatus.SINGLE_OPT_IN,
    )
    notify_owner = models.BooleanField(
        _("notify owner"),
        default=False,
    )

    # ------------------------------------------------------------------
    # Profile image
    # ------------------------------------------------------------------
    image = models.ImageField(
        _("organization image"),
        upload_to="corporations/images/",
        blank=True,
        null=True,
    )

    # ------------------------------------------------------------------
    # Status & relationships
    # ------------------------------------------------------------------
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    member_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subsidiaries",
        verbose_name=_("member of"),
        help_text=_("Parent organization"),
    )
    primary_contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_for_corporations",
        verbose_name=_("primary contact"),
    )
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_corporations",
        verbose_name=_("assigned to"),
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_corporations",
        verbose_name=_("created by"),
    )
    sla = models.ForeignKey(
        "business_hours.BusinessHours",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="corporations",
        verbose_name=_("SLA"),
        help_text=_("Service Level Agreement"),
    )
    description = models.TextField(
        _("description"),
        blank=True,
        default="",
    )

    # --- Custom fields ---
    custom_fields = models.JSONField(
        _("custom fields"),
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "crm_corporations"
        ordering = ["name"]
        verbose_name = _("corporation")
        verbose_name_plural = _("corporations")

    def __str__(self):
        return self.name
