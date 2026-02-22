# Generated migration for paused status fields

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("corporations", "0006_add_client_status"),
    ]

    operations = [
        migrations.AlterField(
            model_name="corporation",
            name="client_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("payment_pending", "Payment Pending"),
                    ("paid", "Paid"),
                    ("paused", "Paused"),
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
            name="pause_reason",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Required when business is paused",
                verbose_name="pause reason",
            ),
        ),
        migrations.AddField(
            model_name="corporation",
            name="paused_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="paused at",
            ),
        ),
        migrations.AddField(
            model_name="corporation",
            name="paused_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="paused_corporations",
                to=settings.AUTH_USER_MODEL,
                verbose_name="paused by",
            ),
        ),
    ]
