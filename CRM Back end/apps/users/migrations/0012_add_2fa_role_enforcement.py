"""
Add role-based 2FA enforcement field.

Security: Allows admins to require 2FA for specific roles (e.g., admin, manager)
without requiring it for all users.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0011_add_brute_force_protection"),
    ]

    operations = [
        migrations.AddField(
            model_name="authenticationpolicy",
            name="enforce_2fa_for_roles",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    "List of role slugs that require 2FA (e.g., ['admin', 'manager']). "
                    "Takes precedence over enforce_2fa when not empty."
                ),
                verbose_name="enforce 2FA for specific roles",
            ),
        ),
    ]
