# Generated manually for commercial buildings

import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0001_initial"),
        ("portal", "0008_add_receipt_to_transaction"),
    ]

    operations = [
        # Create CommercialBuilding model
        migrations.CreateModel(
            name="CommercialBuilding",
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
                        help_text="Display name for the building",
                        max_length=200,
                        verbose_name="building name",
                    ),
                ),
                (
                    "address_street",
                    models.CharField(max_length=255, verbose_name="street address"),
                ),
                ("address_city", models.CharField(max_length=100, verbose_name="city")),
                (
                    "address_state",
                    models.CharField(max_length=50, verbose_name="state"),
                ),
                (
                    "address_zip",
                    models.CharField(max_length=20, verbose_name="ZIP code"),
                ),
                (
                    "total_sqft",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                        verbose_name="total square feet",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this building is currently being tracked",
                        verbose_name="active",
                    ),
                ),
                (
                    "contact",
                    models.ForeignKey(
                        help_text="The portal client who owns this building",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="commercial_buildings",
                        to="contacts.contact",
                        verbose_name="contact",
                    ),
                ),
            ],
            options={
                "verbose_name": "commercial building",
                "verbose_name_plural": "commercial buildings",
                "db_table": "crm_commercial_buildings",
                "ordering": ["name"],
            },
        ),
        # Create CommercialFloor model
        migrations.CreateModel(
            name="CommercialFloor",
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
                    "floor_number",
                    models.IntegerField(
                        help_text="Numeric floor identifier (e.g., 1, 2, -1 for basement)",
                        verbose_name="floor number",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Optional display name (e.g., 'Floor #1', 'Basement')",
                        max_length=100,
                        verbose_name="floor name",
                    ),
                ),
                (
                    "total_sqft",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                        verbose_name="total square feet",
                    ),
                ),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="floors",
                        to="portal.commercialbuilding",
                        verbose_name="building",
                    ),
                ),
            ],
            options={
                "verbose_name": "commercial floor",
                "verbose_name_plural": "commercial floors",
                "db_table": "crm_commercial_floors",
                "ordering": ["floor_number"],
                "unique_together": {("building", "floor_number")},
            },
        ),
        # Create CommercialUnit model
        migrations.CreateModel(
            name="CommercialUnit",
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
                    "unit_number",
                    models.CharField(
                        help_text="Unit identifier (e.g., '#101', 'Suite A', '#205B')",
                        max_length=50,
                        verbose_name="unit number",
                    ),
                ),
                (
                    "sqft",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                        verbose_name="square feet",
                    ),
                ),
                (
                    "door_code",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Access code for the unit",
                        max_length=50,
                        verbose_name="door code",
                    ),
                ),
                (
                    "is_available",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this unit is available for rent",
                        verbose_name="available",
                    ),
                ),
                (
                    "notes",
                    models.TextField(blank=True, default="", verbose_name="notes"),
                ),
                (
                    "floor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="units",
                        to="portal.commercialfloor",
                        verbose_name="floor",
                    ),
                ),
            ],
            options={
                "verbose_name": "commercial unit",
                "verbose_name_plural": "commercial units",
                "db_table": "crm_commercial_units",
                "ordering": ["unit_number"],
            },
        ),
        # Create CommercialTenant model
        migrations.CreateModel(
            name="CommercialTenant",
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
                    "tenant_name",
                    models.CharField(
                        help_text="Name of the person or primary contact",
                        max_length=200,
                        verbose_name="tenant name",
                    ),
                ),
                (
                    "business_name",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Name of the business operating in the unit",
                        max_length=200,
                        verbose_name="business name",
                    ),
                ),
                (
                    "email",
                    models.EmailField(blank=True, default="", max_length=254, verbose_name="email"),
                ),
                (
                    "phone",
                    models.CharField(
                        blank=True, default="", max_length=50, verbose_name="phone"
                    ),
                ),
                (
                    "is_current",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this is the current tenant of the unit",
                        verbose_name="current tenant",
                    ),
                ),
                (
                    "unit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tenants",
                        to="portal.commercialunit",
                        verbose_name="unit",
                    ),
                ),
            ],
            options={
                "verbose_name": "commercial tenant",
                "verbose_name_plural": "commercial tenants",
                "db_table": "crm_commercial_tenants",
                "ordering": ["-is_current", "-created_at"],
            },
        ),
        # Create CommercialLease model
        migrations.CreateModel(
            name="CommercialLease",
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
                ("start_date", models.DateField(verbose_name="start date")),
                ("end_date", models.DateField(verbose_name="end date")),
                (
                    "monthly_rent",
                    models.DecimalField(
                        decimal_places=2, max_digits=12, verbose_name="monthly rent"
                    ),
                ),
                (
                    "renewal_increase_percent",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Percentage increase applied upon lease renewal",
                        max_digits=5,
                        verbose_name="renewal increase (%)",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("pending", "Pending"),
                            ("expired", "Expired"),
                            ("terminated", "Terminated"),
                        ],
                        default="active",
                        max_length=20,
                        verbose_name="status",
                    ),
                ),
                (
                    "lease_document",
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to="commercial/leases/%Y/%m/",
                        verbose_name="lease document",
                    ),
                ),
                (
                    "notes",
                    models.TextField(blank=True, default="", verbose_name="notes"),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leases",
                        to="portal.commercialtenant",
                        verbose_name="tenant",
                    ),
                ),
                (
                    "unit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="leases",
                        to="portal.commercialunit",
                        verbose_name="unit",
                    ),
                ),
            ],
            options={
                "verbose_name": "commercial lease",
                "verbose_name_plural": "commercial leases",
                "db_table": "crm_commercial_leases",
                "ordering": ["-start_date"],
            },
        ),
        # Add indexes for CommercialLease
        migrations.AddIndex(
            model_name="commerciallease",
            index=models.Index(
                fields=["unit", "status"],
                name="crm_commerc_unit_id_1a2b3c_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="commerciallease",
            index=models.Index(
                fields=["start_date", "end_date"],
                name="crm_commerc_start_d_4d5e6f_idx",
            ),
        ),
        # Create CommercialPayment model
        migrations.CreateModel(
            name="CommercialPayment",
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
                ("payment_date", models.DateField(verbose_name="payment date")),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2, max_digits=12, verbose_name="amount"
                    ),
                ),
                (
                    "payment_month",
                    models.IntegerField(
                        help_text="Month covered by this payment (1-12)",
                        verbose_name="payment month",
                    ),
                ),
                (
                    "payment_year",
                    models.IntegerField(
                        help_text="Year covered by this payment",
                        verbose_name="payment year",
                    ),
                ),
                (
                    "receipt",
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to="commercial/receipts/%Y/%m/",
                        verbose_name="receipt",
                    ),
                ),
                (
                    "notes",
                    models.CharField(
                        blank=True, default="", max_length=500, verbose_name="notes"
                    ),
                ),
                (
                    "lease",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="portal.commerciallease",
                        verbose_name="lease",
                    ),
                ),
            ],
            options={
                "verbose_name": "commercial payment",
                "verbose_name_plural": "commercial payments",
                "db_table": "crm_commercial_payments",
                "ordering": ["-payment_year", "-payment_month", "-payment_date"],
            },
        ),
        # Add index for CommercialPayment
        migrations.AddIndex(
            model_name="commercialpayment",
            index=models.Index(
                fields=["lease", "payment_year", "payment_month"],
                name="crm_commerc_lease_i_7g8h9i_idx",
            ),
        ),
    ]
