# Generated manually for licensing limits

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("portal", "0012_add_module_appointments"),
    ]

    operations = [
        migrations.AddField(
            model_name="portalclientconfig",
            name="max_buildings",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Maximum commercial buildings (0 = unlimited)",
                verbose_name="max buildings",
            ),
        ),
        migrations.AddField(
            model_name="portalclientconfig",
            name="max_floors_per_building",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Maximum floors per building (0 = unlimited)",
                verbose_name="max floors per building",
            ),
        ),
        migrations.AddField(
            model_name="portalclientconfig",
            name="max_units_per_building",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Maximum units per building (0 = unlimited)",
                verbose_name="max units per building",
            ),
        ),
        migrations.AddField(
            model_name="portalclientconfig",
            name="max_rental_properties",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Maximum residential rental properties (0 = unlimited)",
                verbose_name="max rental properties",
            ),
        ),
    ]
