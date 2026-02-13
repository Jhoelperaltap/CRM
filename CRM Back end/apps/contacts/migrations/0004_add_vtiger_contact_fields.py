# Generated migration for adding Vtiger-style contact fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("contacts", "0003_contact_custom_fields"),
        ("business_hours", "0001_initial"),
    ]

    operations = [
        # Basic Information fields
        migrations.AddField(
            model_name="contact",
            name="title",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Job title or position",
                max_length=100,
                verbose_name="title",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="department",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="department"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="reports_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="direct_reports",
                to="contacts.contact",
                verbose_name="reports to",
            ),
        ),
        # Additional contact info
        migrations.AddField(
            model_name="contact",
            name="secondary_email",
            field=models.EmailField(
                blank=True, default="", max_length=254, verbose_name="secondary email"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="home_phone",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="home phone"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="fax",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="fax"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="assistant",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="assistant"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="assistant_phone",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="assistant phone"
            ),
        ),
        # Lead & Source fields
        migrations.AddField(
            model_name="contact",
            name="lead_source",
            field=models.CharField(
                blank=True,
                choices=[
                    ("cold_call", "Cold Call"),
                    ("existing_customer", "Existing Customer"),
                    ("self_generated", "Self Generated"),
                    ("employee", "Employee"),
                    ("partner", "Partner"),
                    ("public_relations", "Public Relations"),
                    ("direct_mail", "Direct Mail"),
                    ("conference", "Conference"),
                    ("trade_show", "Trade Show"),
                    ("website", "Website"),
                    ("word_of_mouth", "Word of Mouth"),
                    ("email", "Email"),
                    ("campaign", "Campaign"),
                    ("other", "Other"),
                ],
                default="",
                max_length=50,
                verbose_name="lead source",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="referred_by",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="referred by"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="source_campaign",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="source campaign"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="platform",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Marketing platform (e.g., Google Ads, Facebook)",
                max_length=100,
                verbose_name="platform",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="ad_group",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="ad group"
            ),
        ),
        # Communication Preferences
        migrations.AddField(
            model_name="contact",
            name="do_not_call",
            field=models.BooleanField(default=False, verbose_name="do not call"),
        ),
        migrations.AddField(
            model_name="contact",
            name="notify_owner",
            field=models.BooleanField(default=False, verbose_name="notify owner"),
        ),
        migrations.AddField(
            model_name="contact",
            name="email_opt_in",
            field=models.CharField(
                blank=True,
                choices=[
                    ("single_opt_in", "Single Opt-in"),
                    ("double_opt_in", "Double Opt-in"),
                    ("opt_out", "Opt-out"),
                ],
                default="single_opt_in",
                max_length=20,
                verbose_name="email opt-in",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="sms_opt_in",
            field=models.CharField(
                blank=True,
                choices=[
                    ("single_opt_in", "Single Opt-in"),
                    ("double_opt_in", "Double Opt-in"),
                    ("opt_out", "Opt-out"),
                ],
                default="single_opt_in",
                max_length=20,
                verbose_name="SMS opt-in",
            ),
        ),
        # Mailing Address
        migrations.AddField(
            model_name="contact",
            name="mailing_street",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="mailing street"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="mailing_city",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="mailing city"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="mailing_state",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="mailing state"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="mailing_zip",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="mailing zip"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="mailing_country",
            field=models.CharField(
                blank=True,
                default="United States",
                max_length=100,
                verbose_name="mailing country",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="mailing_po_box",
            field=models.CharField(
                blank=True, default="", max_length=50, verbose_name="mailing PO box"
            ),
        ),
        # Other Address
        migrations.AddField(
            model_name="contact",
            name="other_street",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="other street"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="other_city",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="other city"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="other_state",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="other state"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="other_zip",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="other zip"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="other_country",
            field=models.CharField(
                blank=True,
                default="United States",
                max_length=100,
                verbose_name="other country",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="other_po_box",
            field=models.CharField(
                blank=True, default="", max_length=50, verbose_name="other PO box"
            ),
        ),
        # Timezone
        migrations.AddField(
            model_name="contact",
            name="timezone",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="timezone"
            ),
        ),
        # Customer Portal
        migrations.AddField(
            model_name="contact",
            name="portal_user",
            field=models.BooleanField(
                default=False,
                help_text="Whether this contact has customer portal access",
                verbose_name="portal user",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="support_start_date",
            field=models.DateField(
                blank=True, null=True, verbose_name="support start date"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="support_end_date",
            field=models.DateField(
                blank=True, null=True, verbose_name="support end date"
            ),
        ),
        # Social Media
        migrations.AddField(
            model_name="contact",
            name="twitter_username",
            field=models.CharField(
                blank=True, default="", max_length=100, verbose_name="Twitter username"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="linkedin_url",
            field=models.URLField(
                blank=True, default="", max_length=500, verbose_name="LinkedIn URL"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="linkedin_followers",
            field=models.PositiveIntegerField(
                blank=True, null=True, verbose_name="LinkedIn followers"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="facebook_url",
            field=models.URLField(
                blank=True, default="", max_length=500, verbose_name="Facebook URL"
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="facebook_followers",
            field=models.PositiveIntegerField(
                blank=True, null=True, verbose_name="Facebook followers"
            ),
        ),
        # Profile Image
        migrations.AddField(
            model_name="contact",
            name="image",
            field=models.ImageField(
                blank=True, null=True, upload_to="contacts/images/", verbose_name="profile image"
            ),
        ),
        # SLA
        migrations.AddField(
            model_name="contact",
            name="sla",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="contacts",
                to="business_hours.businesshours",
                verbose_name="SLA",
            ),
        ),
    ]
