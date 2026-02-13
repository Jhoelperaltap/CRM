# Generated migration for adding Vtiger-style user fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_blockedip_blockediplog"),
        ("business_hours", "0001_initial"),
    ]

    operations = [
        # User Information
        migrations.AddField(
            model_name="user",
            name="user_type",
            field=models.CharField(
                choices=[
                    ("standard", "Standard"),
                    ("admin", "Admin"),
                    ("power_user", "Power User"),
                ],
                default="standard",
                max_length=20,
                verbose_name="user type",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="reports_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="direct_reports",
                to=settings.AUTH_USER_MODEL,
                verbose_name="reports to",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="primary_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="primary_users",
                to="users.usergroup",
                verbose_name="primary group",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="language",
            field=models.CharField(
                choices=[
                    ("en_us", "US English"),
                    ("en_gb", "UK English"),
                    ("es", "Spanish"),
                    ("fr", "French"),
                    ("de", "German"),
                    ("pt_br", "Portuguese (Brazil)"),
                    ("it", "Italian"),
                    ("nl", "Dutch"),
                    ("pl", "Polish"),
                    ("ru", "Russian"),
                    ("zh", "Chinese"),
                    ("ja", "Japanese"),
                    ("ko", "Korean"),
                ],
                default="en_us",
                max_length=10,
                verbose_name="language",
            ),
        ),
        # Employee Information
        migrations.AddField(
            model_name="user",
            name="title",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="title"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="department",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="department"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="secondary_email",
            field=models.EmailField(
                blank=True, default="", max_length=254, verbose_name="secondary email"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="other_email",
            field=models.EmailField(
                blank=True, default="", max_length=254, verbose_name="other email"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="home_phone",
            field=models.CharField(
                blank=True, default="", max_length=30, verbose_name="home phone"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="mobile_phone",
            field=models.CharField(
                blank=True, default="", max_length=30, verbose_name="mobile phone"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="secondary_phone",
            field=models.CharField(
                blank=True, default="", max_length=30, verbose_name="secondary phone"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="fax",
            field=models.CharField(
                blank=True, default="", max_length=30, verbose_name="fax"
            ),
        ),
        # User Address
        migrations.AddField(
            model_name="user",
            name="street",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="street"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="city",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="city"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="state",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="state"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="country",
            field=models.CharField(
                blank=True,
                default="United States",
                max_length=100,
                verbose_name="country",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="postal_code",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="postal code"
            ),
        ),
        # Currency and Number Preferences
        migrations.AddField(
            model_name="user",
            name="preferred_currency",
            field=models.CharField(
                blank=True,
                default="USD",
                max_length=10,
                verbose_name="preferred currency",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="show_amounts_in_preferred_currency",
            field=models.BooleanField(
                default=True, verbose_name="show amounts in preferred currency"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="digit_grouping_pattern",
            field=models.CharField(
                choices=[
                    ("123456789", "123456789"),
                    ("123,456,789", "123,456,789"),
                    ("12,34,56,789", "12,34,56,789"),
                ],
                default="123,456,789",
                max_length=20,
                verbose_name="digit grouping pattern",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="decimal_separator",
            field=models.CharField(
                choices=[(".", "."), (",", ",")],
                default=".",
                max_length=5,
                verbose_name="decimal separator",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="digit_grouping_separator",
            field=models.CharField(
                choices=[(",", ","), (".", "."), (" ", " (space)"), ("'", "'")],
                default=",",
                max_length=5,
                verbose_name="digit grouping separator",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="symbol_placement",
            field=models.CharField(
                choices=[("$1.0", "$1.0"), ("1.0$", "1.0$")],
                default="$1.0",
                max_length=10,
                verbose_name="symbol placement",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="number_of_currency_decimals",
            field=models.PositiveSmallIntegerField(
                default=2, verbose_name="number of currency decimals"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="truncate_trailing_zeros",
            field=models.BooleanField(
                default=True, verbose_name="truncate trailing zeros"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="currency_format",
            field=models.CharField(
                choices=[("symbol", "Currency Symbol"), ("code", "Currency Code")],
                default="symbol",
                max_length=20,
                verbose_name="currency format",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="aggregated_number_format",
            field=models.CharField(
                choices=[("full", "Full"), ("abbreviated", "Abbreviated (1K, 1M)")],
                default="full",
                max_length=20,
                verbose_name="aggregated number format",
            ),
        ),
        # Phone Preferences
        migrations.AddField(
            model_name="user",
            name="phone_country_code",
            field=models.CharField(
                blank=True,
                default="+1",
                max_length=10,
                verbose_name="phone country code",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="asterisk_extension",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="asterisk extension"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="use_full_screen_record_preview",
            field=models.BooleanField(
                default=False, verbose_name="use full screen for record preview"
            ),
        ),
        # Signature
        migrations.AddField(
            model_name="user",
            name="signature_block",
            field=models.TextField(
                blank=True,
                default="",
                help_text="HTML signature for emails",
                verbose_name="signature block",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="insert_signature_before_quoted_text",
            field=models.BooleanField(
                default=True, verbose_name="insert signature before quoted text"
            ),
        ),
        # User Business Hours
        migrations.AddField(
            model_name="user",
            name="business_hours",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="users",
                to="business_hours.businesshours",
                verbose_name="business hours",
            ),
        ),
        # Usage Preferences
        migrations.AddField(
            model_name="user",
            name="default_page_after_login",
            field=models.CharField(
                blank=True,
                default="dashboard",
                max_length=50,
                verbose_name="default page after login",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="default_record_view",
            field=models.CharField(
                choices=[("summary", "Summary"), ("detail", "Detail")],
                default="summary",
                max_length=20,
                verbose_name="default record view",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="use_mail_composer",
            field=models.BooleanField(default=False, verbose_name="use mail composer"),
        ),
        migrations.AddField(
            model_name="user",
            name="person_name_format",
            field=models.CharField(
                choices=[
                    ("first_last", "First Name Last Name"),
                    ("last_first", "Last Name First Name"),
                    ("salutation_first_last", "Salutation First Name Last Name"),
                ],
                default="first_last",
                max_length=30,
                verbose_name="person name format",
            ),
        ),
    ]
