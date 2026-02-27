# Generated manually for rental properties

import uuid
from django.db import migrations, models
import django.db.models.deletion


def create_default_expense_categories(apps, schema_editor):
    """Create predefined expense categories for rental properties."""
    RentalExpenseCategory = apps.get_model("portal", "RentalExpenseCategory")

    # Default system categories with sort order
    categories = [
        # Primary expenses
        {"name": "MORTGAGE", "slug": "mortgage", "sort_order": 10},
        {"name": "PROPERTY TAXES", "slug": "property-taxes", "sort_order": 20},
        {"name": "HOME INSURANCE", "slug": "home-insurance", "sort_order": 30},
        # Utilities
        {"name": "ELECTRIC", "slug": "electric", "sort_order": 40},
        {"name": "WATER", "slug": "water", "sort_order": 50},
        {"name": "GAS", "slug": "gas", "sort_order": 60},
        {"name": "INTERNET", "slug": "internet", "sort_order": 70},
        # Maintenance
        {"name": "REPAIRS", "slug": "repairs", "sort_order": 80},
        {"name": "MAINTENANCE", "slug": "maintenance", "sort_order": 90},
        {"name": "LANDSCAPING/SNOW", "slug": "landscaping-snow", "sort_order": 100},
        # Other
        {"name": "CLEANING", "slug": "cleaning", "sort_order": 110},
        {"name": "APPLIANCES", "slug": "appliances", "sort_order": 120},
        {"name": "PEST CONTROL", "slug": "pest-control", "sort_order": 130},
        {"name": "HOA FEES", "slug": "hoa-fees", "sort_order": 140},
        {"name": "MANAGEMENT FEES", "slug": "management-fees", "sort_order": 150},
        {"name": "LEGAL/PROFESSIONAL", "slug": "legal-professional", "sort_order": 160},
        {"name": "ADVERTISING", "slug": "advertising", "sort_order": 170},
        {"name": "SUPPLIES", "slug": "supplies", "sort_order": 180},
        {"name": "OTHER", "slug": "other", "sort_order": 999},
    ]

    for cat_data in categories:
        RentalExpenseCategory.objects.create(
            id=uuid.uuid4(),
            name=cat_data["name"],
            slug=cat_data["slug"],
            sort_order=cat_data["sort_order"],
            is_system=True,
            is_active=True,
            contact=None,
        )


def reverse_default_expense_categories(apps, schema_editor):
    """Remove default expense categories."""
    RentalExpenseCategory = apps.get_model("portal", "RentalExpenseCategory")
    RentalExpenseCategory.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0001_initial"),
        ("portal", "0006_billingportalaccess"),
    ]

    operations = [
        # Create RentalProperty model
        migrations.CreateModel(
            name="RentalProperty",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "name",
                    models.CharField(
                        help_text="Display name for the property (e.g., '26-28 HOLYOKE ST')",
                        max_length=255,
                        verbose_name="property name",
                    ),
                ),
                (
                    "address_street",
                    models.CharField(max_length=255, verbose_name="street address"),
                ),
                ("address_city", models.CharField(max_length=100, verbose_name="city")),
                ("address_state", models.CharField(max_length=50, verbose_name="state")),
                (
                    "address_zip",
                    models.CharField(max_length=20, verbose_name="ZIP code"),
                ),
                (
                    "property_type",
                    models.CharField(
                        choices=[
                            ("residential", "Residential"),
                            ("commercial", "Commercial"),
                            ("multi_family", "Multi-Family"),
                            ("mixed_use", "Mixed Use"),
                        ],
                        default="residential",
                        max_length=20,
                        verbose_name="property type",
                    ),
                ),
                (
                    "units_count",
                    models.PositiveIntegerField(
                        default=1,
                        help_text="Number of rental units in the property",
                        verbose_name="number of units",
                    ),
                ),
                (
                    "purchase_date",
                    models.DateField(
                        blank=True, null=True, verbose_name="purchase date"
                    ),
                ),
                (
                    "purchase_price",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                        verbose_name="purchase price",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this property is currently being tracked",
                        verbose_name="active",
                    ),
                ),
                (
                    "contact",
                    models.ForeignKey(
                        help_text="The portal client who owns this property",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rental_properties",
                        to="contacts.contact",
                        verbose_name="contact",
                    ),
                ),
            ],
            options={
                "verbose_name": "rental property",
                "verbose_name_plural": "rental properties",
                "db_table": "crm_rental_properties",
                "ordering": ["name"],
            },
        ),
        # Create RentalExpenseCategory model
        migrations.CreateModel(
            name="RentalExpenseCategory",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "name",
                    models.CharField(
                        help_text="Display name (e.g., 'MORTGAGE', 'REPAIRS')",
                        max_length=100,
                        verbose_name="category name",
                    ),
                ),
                (
                    "slug",
                    models.SlugField(
                        help_text="URL-friendly identifier",
                        max_length=100,
                        verbose_name="slug",
                    ),
                ),
                (
                    "is_system",
                    models.BooleanField(
                        default=False,
                        help_text="System categories cannot be deleted",
                        verbose_name="system category",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                (
                    "sort_order",
                    models.IntegerField(
                        default=0,
                        help_text="Order in which categories appear (lower = first)",
                        verbose_name="sort order",
                    ),
                ),
                (
                    "contact",
                    models.ForeignKey(
                        blank=True,
                        help_text="If set, this is a custom category for this contact only",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rental_expense_categories",
                        to="contacts.contact",
                        verbose_name="contact",
                    ),
                ),
            ],
            options={
                "verbose_name": "rental expense category",
                "verbose_name_plural": "rental expense categories",
                "db_table": "crm_rental_expense_categories",
                "ordering": ["sort_order", "name"],
            },
        ),
        # Add constraints for RentalExpenseCategory
        migrations.AddConstraint(
            model_name="rentalexpensecategory",
            constraint=models.UniqueConstraint(
                condition=models.Q(("contact__isnull", True)),
                fields=("slug",),
                name="unique_system_category_slug",
            ),
        ),
        migrations.AddConstraint(
            model_name="rentalexpensecategory",
            constraint=models.UniqueConstraint(
                condition=models.Q(("contact__isnull", False)),
                fields=("slug", "contact"),
                name="unique_contact_category_slug",
            ),
        ),
        # Create RentalTransaction model
        migrations.CreateModel(
            name="RentalTransaction",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "transaction_type",
                    models.CharField(
                        choices=[("income", "Income"), ("expense", "Expense")],
                        max_length=10,
                        verbose_name="type",
                    ),
                ),
                (
                    "transaction_date",
                    models.DateField(db_index=True, verbose_name="transaction date"),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Transaction amount (always positive)",
                        max_digits=12,
                        verbose_name="amount",
                    ),
                ),
                (
                    "description",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=500,
                        verbose_name="description",
                    ),
                ),
                (
                    "debit_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Amount debited (expenses)",
                        max_digits=12,
                        verbose_name="debit",
                    ),
                ),
                (
                    "credit_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Amount credited (income)",
                        max_digits=12,
                        verbose_name="credit",
                    ),
                ),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        help_text="Category for expense transactions (null for income)",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="transactions",
                        to="portal.rentalexpensecategory",
                        verbose_name="category",
                    ),
                ),
                (
                    "property",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transactions",
                        to="portal.rentalproperty",
                        verbose_name="property",
                    ),
                ),
            ],
            options={
                "verbose_name": "rental transaction",
                "verbose_name_plural": "rental transactions",
                "db_table": "crm_rental_transactions",
                "ordering": ["-transaction_date", "-created_at"],
            },
        ),
        # Add indexes for RentalTransaction
        migrations.AddIndex(
            model_name="rentaltransaction",
            index=models.Index(
                fields=["property", "transaction_date"],
                name="crm_rental__propert_8f5a6c_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="rentaltransaction",
            index=models.Index(
                fields=["transaction_type", "transaction_date"],
                name="crm_rental__transac_4b9e2a_idx",
            ),
        ),
        # Create default expense categories
        migrations.RunPython(
            create_default_expense_categories,
            reverse_default_expense_categories,
        ),
    ]
