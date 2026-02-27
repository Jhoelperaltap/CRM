"""
Rental Properties models for the Client Portal.

This module provides models for clients to track their rental properties,
including income and expenses with monthly breakdown.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class RentalProperty(TimeStampedModel):
    """
    A rental property owned/managed by a portal client.
    Tracks property details and links to income/expense transactions.
    """

    class PropertyType(models.TextChoices):
        RESIDENTIAL = "residential", _("Residential")
        COMMERCIAL = "commercial", _("Commercial")
        MULTI_FAMILY = "multi_family", _("Multi-Family")
        MIXED_USE = "mixed_use", _("Mixed Use")

    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="rental_properties",
        verbose_name=_("contact"),
        help_text=_("The portal client who owns this property"),
    )
    name = models.CharField(
        _("property name"),
        max_length=255,
        help_text=_("Display name for the property (e.g., '26-28 HOLYOKE ST')"),
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
    property_type = models.CharField(
        _("property type"),
        max_length=20,
        choices=PropertyType.choices,
        default=PropertyType.RESIDENTIAL,
    )
    units_count = models.PositiveIntegerField(
        _("number of units"),
        default=1,
        help_text=_("Number of rental units in the property"),
    )
    purchase_date = models.DateField(
        _("purchase date"),
        null=True,
        blank=True,
    )
    purchase_price = models.DecimalField(
        _("purchase price"),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Whether this property is currently being tracked"),
    )

    class Meta:
        db_table = "crm_rental_properties"
        ordering = ["name"]
        verbose_name = _("rental property")
        verbose_name_plural = _("rental properties")

    def __str__(self):
        return self.name

    @property
    def full_address(self) -> str:
        """Return the full formatted address."""
        return f"{self.address_street}, {self.address_city}, {self.address_state} {self.address_zip}"


class RentalExpenseCategory(TimeStampedModel):
    """
    Categories for rental expenses.

    System categories (is_system=True) are predefined and cannot be deleted.
    Clients can create custom categories linked to their contact.
    """

    name = models.CharField(
        _("category name"),
        max_length=100,
        help_text=_("Display name (e.g., 'MORTGAGE', 'REPAIRS')"),
    )
    slug = models.SlugField(
        _("slug"),
        max_length=100,
        help_text=_("URL-friendly identifier"),
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="rental_expense_categories",
        verbose_name=_("contact"),
        help_text=_("If set, this is a custom category for this contact only"),
    )
    is_system = models.BooleanField(
        _("system category"),
        default=False,
        help_text=_("System categories cannot be deleted"),
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
    )
    sort_order = models.IntegerField(
        _("sort order"),
        default=0,
        help_text=_("Order in which categories appear (lower = first)"),
    )

    class Meta:
        db_table = "crm_rental_expense_categories"
        ordering = ["sort_order", "name"]
        verbose_name = _("rental expense category")
        verbose_name_plural = _("rental expense categories")
        constraints = [
            models.UniqueConstraint(
                fields=["slug"],
                condition=models.Q(contact__isnull=True),
                name="unique_system_category_slug",
            ),
            models.UniqueConstraint(
                fields=["slug", "contact"],
                condition=models.Q(contact__isnull=False),
                name="unique_contact_category_slug",
            ),
        ]

    def __str__(self):
        if self.contact:
            return f"{self.name} (Custom)"
        return self.name


class RentalTransaction(TimeStampedModel):
    """
    A financial transaction (income or expense) for a rental property.

    Uses accounting-style debit/credit amounts:
    - Income (credit): money coming in (rent payments)
    - Expense (debit): money going out (mortgage, repairs, etc.)
    """

    class TransactionType(models.TextChoices):
        INCOME = "income", _("Income")  # Credit - money comes in
        EXPENSE = "expense", _("Expense")  # Debit - money goes out

    property = models.ForeignKey(
        RentalProperty,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name=_("property"),
    )
    transaction_type = models.CharField(
        _("type"),
        max_length=10,
        choices=TransactionType.choices,
    )
    category = models.ForeignKey(
        RentalExpenseCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name=_("category"),
        help_text=_("Category for expense transactions (null for income)"),
    )
    transaction_date = models.DateField(
        _("transaction date"),
        db_index=True,
    )
    amount = models.DecimalField(
        _("amount"),
        max_digits=12,
        decimal_places=2,
        help_text=_("Transaction amount (always positive)"),
    )
    description = models.CharField(
        _("description"),
        max_length=500,
        blank=True,
        default="",
    )
    # Accounting-style fields
    debit_amount = models.DecimalField(
        _("debit"),
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Amount debited (expenses)"),
    )
    credit_amount = models.DecimalField(
        _("credit"),
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Amount credited (income)"),
    )

    class Meta:
        db_table = "crm_rental_transactions"
        ordering = ["-transaction_date", "-created_at"]
        verbose_name = _("rental transaction")
        verbose_name_plural = _("rental transactions")
        indexes = [
            models.Index(fields=["property", "transaction_date"]),
            models.Index(fields=["transaction_type", "transaction_date"]),
        ]

    def __str__(self):
        return f"{self.get_transaction_type_display()}: ${self.amount} on {self.transaction_date}"

    def save(self, *args, **kwargs):
        """Automatically set debit/credit based on transaction type."""
        if self.transaction_type == self.TransactionType.INCOME:
            self.credit_amount = self.amount
            self.debit_amount = 0
        else:  # EXPENSE
            self.debit_amount = self.amount
            self.credit_amount = 0
        super().save(*args, **kwargs)
