# Data migration to sync username with email for existing users
# This ensures users can login with their email as username

from django.db import migrations


def sync_username_with_email(apps, schema_editor):
    """
    Update all existing users to have username = email.
    This allows users to login with their email address.
    """
    User = apps.get_model("users", "User")
    for user in User.objects.all():
        if user.email and user.username != user.email:
            user.username = user.email
            user.save(update_fields=["username"])


def reverse_sync(apps, schema_editor):
    """
    Reverse migration - no action needed as we can't restore original usernames.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_alter_user_phone"),
    ]

    operations = [
        migrations.RunPython(sync_username_with_email, reverse_sync),
    ]
