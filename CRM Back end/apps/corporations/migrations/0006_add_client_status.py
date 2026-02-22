# Generated migration for client status fields

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("corporations", "0005_increase_phone_field_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="corporation",
            name="client_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("payment_pending", "Payment Pending"),
                    ("paid", "Paid"),
                    ("business_closed", "Business Closed"),
                ],
                db_index=True,
                default="active",
                max_length=20,
                verbose_name="client status",
            ),
        ),
        migrations.AddField(
            model_name="corporation",
            name="closure_reason",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Required when business is closed",
                verbose_name="closure reason",
            ),
        ),
        migrations.AddField(
            model_name="corporation",
            name="closed_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="closed at",
            ),
        ),
        migrations.AddField(
            model_name="corporation",
            name="closed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="closed_corporations",
                to=settings.AUTH_USER_MODEL,
                verbose_name="closed by",
            ),
        ),
    ]
