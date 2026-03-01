"""
Commercial Buildings models for the Client Portal.

This module provides models for managing commercial buildings with multiple
floors and units/suites, including tenants, leases, and rent payments.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class CommercialBuilding(TimeStampedModel):
    """
    A commercial building with multiple floors and units.
    Independent entity owned/managed by a portal client.
    """

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="commercial_buildings",
        verbose_name=_("contact"),
        help_text=_("The portal client who owns this building"),
    )
    name = models.CharField(
        _("building name"),
        max_length=200,
        help_text=_("Display name for the building"),
    )
    address_street = models.CharField(
        _("street address"),
        max_length=255,
    )
    address_city = models.CharField(
        _("city"),
        max_length=100,
    )
    address_state = models.CharField(
        _("state"),
        max_length=50,
    )
    address_zip = models.CharField(
        _("ZIP code"),
        max_length=20,
    )
    total_sqft = models.DecimalField(
        _("total square feet"),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Whether this building is currently being tracked"),
    )

    class Meta:
        db_table = "crm_commercial_buildings"
        ordering = ["name"]
        verbose_name = _("commercial building")
        verbose_name_plural = _("commercial buildings")

    def __str__(self):
        return self.name

    @property
    def full_address(self) -> str:
        """Return the full formatted address."""
        return f"{self.address_street}, {self.address_city}, {self.address_state} {self.address_zip}"


class CommercialFloor(TimeStampedModel):
    """
    A floor within a commercial building.
    Can contain multiple units/suites.
    """

    building = models.ForeignKey(
        CommercialBuilding,
        on_delete=models.CASCADE,
        related_name="floors",
        verbose_name=_("building"),
    )
    floor_number = models.IntegerField(
        _("floor number"),
        help_text=_("Numeric floor identifier (e.g., 1, 2, -1 for basement)"),
    )
    name = models.CharField(
        _("floor name"),
        max_length=100,
        blank=True,
        default="",
        help_text=_("Optional display name (e.g., 'Floor #1', 'Basement')"),
    )
    total_sqft = models.DecimalField(
        _("total square feet"),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "crm_commercial_floors"
        ordering = ["floor_number"]
        verbose_name = _("commercial floor")
        verbose_name_plural = _("commercial floors")
        unique_together = [("building", "floor_number")]

    def __str__(self):
        if self.name:
            return f"{self.name} ({self.building.name})"
        return f"Floor #{self.floor_number} ({self.building.name})"

    @property
    def display_name(self) -> str:
        """Return the display name for this floor."""
        if self.name:
            return self.name
        return f"Floor #{self.floor_number}"


class CommercialUnit(TimeStampedModel):
    """
    A unit/suite within a commercial floor.
    Can be rented to tenants through leases.
    """

    floor = models.ForeignKey(
        CommercialFloor,
        on_delete=models.CASCADE,
        related_name="units",
        verbose_name=_("floor"),
    )
    unit_number = models.CharField(
        _("unit number"),
        max_length=50,
        help_text=_("Unit identifier (e.g., '#101', 'Suite A', '#205B')"),
    )
    sqft = models.DecimalField(
        _("square feet"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    door_code = models.CharField(
        _("door code"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("Access code for the unit"),
    )
    is_available = models.BooleanField(
        _("available"),
        default=True,
        help_text=_("Whether this unit is available for rent"),
    )
    notes = models.TextField(
        _("notes"),
        blank=True,
        default="",
    )

    class Meta:
        db_table = "crm_commercial_units"
        ordering = ["unit_number"]
        verbose_name = _("commercial unit")
        verbose_name_plural = _("commercial units")

    def __str__(self):
        return f"{self.unit_number} ({self.floor.display_name}, {self.floor.building.name})"

    @property
    def current_tenant(self):
        """Return the current active tenant, if any."""
        return self.tenants.filter(is_current=True).first()

    @property
    def current_lease(self):
        """Return the current active lease, if any."""
        return self.leases.filter(status=CommercialLease.Status.ACTIVE).first()


class CommercialTenant(TimeStampedModel):
    """
    A tenant occupying a commercial unit.
    Stores tenant contact information and business details.
    """

    unit = models.ForeignKey(
        CommercialUnit,
        on_delete=models.CASCADE,
        related_name="tenants",
        verbose_name=_("unit"),
    )
    tenant_name = models.CharField(
        _("tenant name"),
        max_length=200,
        help_text=_("Name of the person or primary contact"),
    )
    business_name = models.CharField(
        _("business name"),
        max_length=200,
        blank=True,
        default="",
        help_text=_("Name of the business operating in the unit"),
    )
    email = models.EmailField(
        _("email"),
        blank=True,
        default="",
    )
    phone = models.CharField(
        _("phone"),
        max_length=50,
        blank=True,
        default="",
    )
    is_current = models.BooleanField(
        _("current tenant"),
        default=True,
        help_text=_("Whether this is the current tenant of the unit"),
    )

    class Meta:
        db_table = "crm_commercial_tenants"
        ordering = ["-is_current", "-created_at"]
        verbose_name = _("commercial tenant")
        verbose_name_plural = _("commercial tenants")

    def __str__(self):
        if self.business_name:
            return f"{self.tenant_name} ({self.business_name})"
        return self.tenant_name


class CommercialLease(TimeStampedModel):
    """
    A lease agreement between the building owner and a tenant.
    Tracks contract terms, rent amount, and renewal conditions.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        PENDING = "pending", _("Pending")
        EXPIRED = "expired", _("Expired")
        TERMINATED = "terminated", _("Terminated")

    unit = models.ForeignKey(
        CommercialUnit,
        on_delete=models.CASCADE,
        related_name="leases",
        verbose_name=_("unit"),
    )
    tenant = models.ForeignKey(
        CommercialTenant,
        on_delete=models.CASCADE,
        related_name="leases",
        verbose_name=_("tenant"),
    )
    start_date = models.DateField(
        _("start date"),
    )
    end_date = models.DateField(
        _("end date"),
    )
    monthly_rent = models.DecimalField(
        _("monthly rent"),
        max_digits=12,
        decimal_places=2,
    )
    renewal_increase_percent = models.DecimalField(
        _("renewal increase (%)"),
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_("Percentage increase applied upon lease renewal"),
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    lease_document = models.FileField(
        _("lease document"),
        upload_to="commercial/leases/%Y/%m/",
        null=True,
        blank=True,
    )
    notes = models.TextField(
        _("notes"),
        blank=True,
        default="",
    )

    class Meta:
        db_table = "crm_commercial_leases"
        ordering = ["-start_date"]
        verbose_name = _("commercial lease")
        verbose_name_plural = _("commercial leases")
        indexes = [
            models.Index(fields=["unit", "status"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self):
        return f"Lease: {self.tenant} - {self.unit} ({self.status})"

    @property
    def next_rent_after_renewal(self):
        """Calculate the rent after applying renewal increase."""
        if self.renewal_increase_percent:
            increase = self.monthly_rent * (self.renewal_increase_percent / 100)
            return self.monthly_rent + increase
        return self.monthly_rent

    @property
    def days_until_expiration(self):
        """Calculate days until lease expiration."""
        from django.utils import timezone

        today = timezone.now().date()
        if self.end_date > today:
            return (self.end_date - today).days
        return 0


class CommercialPayment(TimeStampedModel):
    """
    A rent payment for a commercial lease.
    Tracks manual payment records entered by the building owner.
    """

    lease = models.ForeignKey(
        CommercialLease,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name=_("lease"),
    )
    payment_date = models.DateField(
        _("payment date"),
    )
    amount = models.DecimalField(
        _("amount"),
        max_digits=12,
        decimal_places=2,
    )
    payment_month = models.IntegerField(
        _("payment month"),
        help_text=_("Month covered by this payment (1-12)"),
    )
    payment_year = models.IntegerField(
        _("payment year"),
        help_text=_("Year covered by this payment"),
    )
    receipt = models.FileField(
        _("receipt"),
        upload_to="commercial/receipts/%Y/%m/",
        null=True,
        blank=True,
    )
    notes = models.CharField(
        _("notes"),
        max_length=500,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "crm_commercial_payments"
        ordering = ["-payment_year", "-payment_month", "-payment_date"]
        verbose_name = _("commercial payment")
        verbose_name_plural = _("commercial payments")
        indexes = [
            models.Index(fields=["lease", "payment_year", "payment_month"]),
        ]

    def __str__(self):
        return f"Payment: ${self.amount} ({self.payment_month}/{self.payment_year})"
