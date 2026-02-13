# Generated migration for adding contact_number and office_services fields

from django.db import migrations, models


def drop_existing_indexes(apps, schema_editor):
    """Drop any existing indexes that might conflict."""
    with schema_editor.connection.cursor() as cursor:
        # Drop indexes if they exist (from previous failed migrations)
        cursor.execute("DROP INDEX IF EXISTS crm_contacts_contact_number_c7a730e3_like")
        cursor.execute("DROP INDEX IF EXISTS crm_contacts_contact_number_c7a730e3")
        cursor.execute("DROP INDEX IF EXISTS crm_contacts_contact_number_key")
        # Try to drop the column if it exists (from previous failed attempts)
        try:
            cursor.execute(
                "ALTER TABLE crm_contacts DROP COLUMN IF EXISTS contact_number"
            )
        except Exception:
            pass
        try:
            cursor.execute(
                "ALTER TABLE crm_contacts DROP COLUMN IF EXISTS office_services"
            )
        except Exception:
            pass


def noop(apps, schema_editor):
    pass


def generate_contact_numbers(apps, schema_editor):
    """
    Generate contact numbers for existing contacts.
    """
    Contact = apps.get_model("contacts", "Contact")
    for idx, contact in enumerate(
        Contact.objects.all().order_by("created_at"), start=1
    ):
        contact.contact_number = f"CON{idx:04d}"
        contact.save(update_fields=["contact_number"])


def reverse_contact_numbers(apps, schema_editor):
    """
    Reverse - clear contact numbers.
    """
    Contact = apps.get_model("contacts", "Contact")
    Contact.objects.all().update(contact_number="")


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0005_alter_contact_corporation_alter_contact_phone"),
    ]

    operations = [
        # First, clean up any existing indexes/columns from failed migrations
        migrations.RunPython(drop_existing_indexes, noop),
        # Add contact_number field (not unique yet)
        migrations.AddField(
            model_name="contact",
            name="contact_number",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Auto-generated contact ID (e.g., CON0001)",
                max_length=20,
                verbose_name="contact number",
            ),
        ),
        # Add office_services field
        migrations.AddField(
            model_name="contact",
            name="office_services",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Office location for services (e.g., WALTHAM, GLOUCESTER)",
                max_length=100,
                verbose_name="office services",
            ),
        ),
        # Generate contact numbers for existing records
        migrations.RunPython(generate_contact_numbers, reverse_contact_numbers),
        # Now make contact_number unique and add index
        migrations.AlterField(
            model_name="contact",
            name="contact_number",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Auto-generated contact ID (e.g., CON0001)",
                max_length=20,
                unique=True,
                verbose_name="contact number",
            ),
        ),
    ]
