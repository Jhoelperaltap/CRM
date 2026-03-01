# Generated migration for initial module presets

from django.db import migrations


def create_initial_presets(apps, schema_editor):
    """Create the initial module presets."""
    PortalModulePreset = apps.get_model("portal", "PortalModulePreset")

    # Full preset - all modules enabled
    PortalModulePreset.objects.create(
        name="Full",
        description="All modules enabled - complete portal access",
        module_dashboard=True,
        module_billing=True,
        module_messages=True,
        module_documents=True,
        module_cases=True,
        module_rentals=True,
        module_buildings=True,
        is_system=True,
        is_default=False,
    )

    # Basic preset - essential modules only
    PortalModulePreset.objects.create(
        name="Basic",
        description="Essential modules: Dashboard, Messages, Documents",
        module_dashboard=True,
        module_billing=False,
        module_messages=True,
        module_documents=True,
        module_cases=False,
        module_rentals=False,
        module_buildings=False,
        is_system=True,
        is_default=False,
    )

    # Real Estate preset - property management focused
    PortalModulePreset.objects.create(
        name="Real Estate",
        description="Property management: Dashboard, Rentals, Buildings",
        module_dashboard=True,
        module_billing=False,
        module_messages=True,
        module_documents=True,
        module_cases=False,
        module_rentals=True,
        module_buildings=True,
        is_system=True,
        is_default=False,
    )

    # Tax Services preset - tax case focused
    PortalModulePreset.objects.create(
        name="Tax Services",
        description="Tax services: Dashboard, Billing, Messages, Documents, Cases",
        module_dashboard=True,
        module_billing=True,
        module_messages=True,
        module_documents=True,
        module_cases=True,
        module_rentals=False,
        module_buildings=False,
        is_system=True,
        is_default=False,
    )


def remove_initial_presets(apps, schema_editor):
    """Remove the initial presets."""
    PortalModulePreset = apps.get_model("portal", "PortalModulePreset")
    PortalModulePreset.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("portal", "0010_portal_admin_models"),
    ]

    operations = [
        migrations.RunPython(create_initial_presets, remove_initial_presets),
    ]
