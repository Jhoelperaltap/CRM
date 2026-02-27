import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.fields import EncryptedCharField
from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------
class Contact(TimeStampedModel):
    """
    Primary contact entity for the CRM.
    Represents an individual person, potentially linked to a Corporation.
    Updated to match Vtiger CRM contact form structure.
    """

    class Salutation(models.TextChoices):
        MR = "Mr.", _("Mr.")
        MRS = "Mrs.", _("Mrs.")
        MS = "Ms.", _("Ms.")
        DR = "Dr.", _("Dr.")
        PROF = "Prof.", _("Prof.")

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        LEAD = "lead", _("Lead")

    class Language(models.TextChoices):
        EN = "en", _("English")
        ES = "es", _("Spanish")
        FR = "fr", _("French")
        PT = "pt", _("Portuguese")
        ZH = "zh", _("Chinese")
        KO = "ko", _("Korean")
        VI = "vi", _("Vietnamese")
        HT = "ht", _("Haitian Creole")
        OTHER = "other", _("Other")

    class EmailOptIn(models.TextChoices):
        SINGLE_OPT_IN = "single_opt_in", _("Single Opt-in")
        DOUBLE_OPT_IN = "double_opt_in", _("Double Opt-in")
        OPT_OUT = "opt_out", _("Opt-out")

    class SMSOptIn(models.TextChoices):
        SINGLE_OPT_IN = "single_opt_in", _("Single Opt-in")
        DOUBLE_OPT_IN = "double_opt_in", _("Double Opt-in")
        OPT_OUT = "opt_out", _("Opt-out")

    class LeadSource(models.TextChoices):
        COLD_CALL = "cold_call", _("Cold Call")
        EXISTING_CUSTOMER = "existing_customer", _("Existing Customer")
        SELF_GENERATED = "self_generated", _("Self Generated")
        EMPLOYEE = "employee", _("Employee")
        PARTNER = "partner", _("Partner")
        PUBLIC_RELATIONS = "public_relations", _("Public Relations")
        DIRECT_MAIL = "direct_mail", _("Direct Mail")
        CONFERENCE = "conference", _("Conference")
        TRADE_SHOW = "trade_show", _("Trade Show")
        WEBSITE = "website", _("Website")
        WORD_OF_MOUTH = "word_of_mouth", _("Word of Mouth")
        EMAIL = "email", _("Email")
        CAMPAIGN = "campaign", _("Campaign")
        OTHER = "other", _("Other")

    # -- Contact Number (auto-generated) --
    contact_number = models.CharField(
        _("contact number"),
        max_length=20,
        unique=True,
        blank=True,
        db_index=True,
        help_text=_("Auto-generated contact ID (e.g., CON0001)"),
    )

    # -- Basic Information --
    salutation = models.CharField(
        _("salutation"),
        max_length=10,
        choices=Salutation.choices,
        blank=True,
        default="",
    )
    first_name = models.CharField(
        _("first name"),
        max_length=100,
        db_index=True,
    )
    last_name = models.CharField(
        _("last name"),
        max_length=100,
        db_index=True,
    )
    title = models.CharField(
        _("title"),
        max_length=100,
        blank=True,
        default="",
        help_text=_("Job title or position"),
    )
    department = models.CharField(
        _("department"),
        max_length=100,
        blank=True,
        default="",
    )
    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="direct_reports",
        verbose_name=_("reports to"),
        null=True,
        blank=True,
    )

    # -- Contact info --
    email = models.EmailField(
        _("email address"),
        blank=True,
        default="",
        db_index=True,
    )
    secondary_email = models.EmailField(
        _("secondary email"),
        blank=True,
        default="",
    )
    phone = models.CharField(
        _("office phone"),
        max_length=30,
        blank=True,
        default="",
    )
    mobile = models.CharField(
        _("mobile"),
        max_length=30,
        blank=True,
        default="",
    )
    home_phone = models.CharField(
        _("home phone"),
        max_length=30,
        blank=True,
        default="",
    )
    fax = models.CharField(
        _("fax"),
        max_length=30,
        blank=True,
        default="",
    )
    assistant = models.CharField(
        _("assistant"),
        max_length=100,
        blank=True,
        default="",
    )
    assistant_phone = models.CharField(
        _("assistant phone"),
        max_length=30,
        blank=True,
        default="",
    )

    # -- Personal --
    date_of_birth = models.DateField(
        _("date of birth"),
        null=True,
        blank=True,
    )
    ssn_last_four = EncryptedCharField(
        _("SSN last four"),
        max_length=255,
        blank=True,
        default="",
        help_text=_("Last four digits of SSN. Encrypted at rest."),
    )

    # -- Lead & Source Information --
    lead_source = models.CharField(
        _("lead source"),
        max_length=50,
        choices=LeadSource.choices,
        blank=True,
        default="",
    )
    source = models.CharField(
        _("source"),
        max_length=100,
        blank=True,
        default="",
        help_text=_("How the contact was acquired (e.g., referral, website, walk-in)."),
    )
    referred_by = models.CharField(
        _("referred by"),
        max_length=255,
        blank=True,
        default="",
    )
    source_campaign = models.CharField(
        _("source campaign"),
        max_length=255,
        blank=True,
        default="",
    )
    platform = models.CharField(
        _("platform"),
        max_length=100,
        blank=True,
        default="",
        help_text=_("Marketing platform (e.g., Google Ads, Facebook)"),
    )
    ad_group = models.CharField(
        _("ad group"),
        max_length=255,
        blank=True,
        default="",
    )

    # -- Communication Preferences --
    do_not_call = models.BooleanField(
        _("do not call"),
        default=False,
    )
    notify_owner = models.BooleanField(
        _("notify owner"),
        default=False,
    )
    email_opt_in = models.CharField(
        _("email opt-in"),
        max_length=20,
        choices=EmailOptIn.choices,
        default=EmailOptIn.SINGLE_OPT_IN,
        blank=True,
    )
    sms_opt_in = models.CharField(
        _("SMS opt-in"),
        max_length=20,
        choices=SMSOptIn.choices,
        default=SMSOptIn.SINGLE_OPT_IN,
        blank=True,
    )

    # -- Mailing Address --
    mailing_street = models.CharField(
        _("mailing street"),
        max_length=255,
        blank=True,
        default="",
    )
    mailing_city = models.CharField(
        _("mailing city"),
        max_length=100,
        blank=True,
        default="",
    )
    mailing_state = models.CharField(
        _("mailing state"),
        max_length=100,
        blank=True,
        default="",
    )
    mailing_zip = models.CharField(
        _("mailing zip"),
        max_length=20,
        blank=True,
        default="",
    )
    mailing_country = models.CharField(
        _("mailing country"),
        max_length=100,
        blank=True,
        default="United States",
    )
    mailing_po_box = models.CharField(
        _("mailing PO box"),
        max_length=50,
        blank=True,
        default="",
    )

    # -- Other Address --
    other_street = models.CharField(
        _("other street"),
        max_length=255,
        blank=True,
        default="",
    )
    other_city = models.CharField(
        _("other city"),
        max_length=100,
        blank=True,
        default="",
    )
    other_state = models.CharField(
        _("other state"),
        max_length=100,
        blank=True,
        default="",
    )
    other_zip = models.CharField(
        _("other zip"),
        max_length=20,
        blank=True,
        default="",
    )
    other_country = models.CharField(
        _("other country"),
        max_length=100,
        blank=True,
        default="United States",
    )
    other_po_box = models.CharField(
        _("other PO box"),
        max_length=50,
        blank=True,
        default="",
    )

    # -- Legacy Address (for backwards compatibility) --
    street_address = models.CharField(
        _("street address"),
        max_length=255,
        blank=True,
        default="",
    )
    city = models.CharField(
        _("city"),
        max_length=100,
        blank=True,
        default="",
    )
    state = models.CharField(
        _("state"),
        max_length=100,
        blank=True,
        default="",
    )
    zip_code = models.CharField(
        _("zip code"),
        max_length=20,
        blank=True,
        default="",
    )
    country = models.CharField(
        _("country"),
        max_length=100,
        blank=True,
        default="United States",
    )

    # -- Language & Timezone --
    preferred_language = models.CharField(
        _("preferred language"),
        max_length=10,
        choices=Language.choices,
        default=Language.EN,
        blank=True,
    )
    timezone = models.CharField(
        _("timezone"),
        max_length=100,
        blank=True,
        default="",
    )

    # -- Classification --
    status = models.CharField(
        _("status"),
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    # -- Customer Portal Details --
    portal_user = models.BooleanField(
        _("portal user"),
        default=False,
        help_text=_("Whether this contact has customer portal access"),
    )
    support_start_date = models.DateField(
        _("support start date"),
        null=True,
        blank=True,
    )
    support_end_date = models.DateField(
        _("support end date"),
        null=True,
        blank=True,
    )

    # -- Social Media --
    twitter_username = models.CharField(
        _("Twitter username"),
        max_length=100,
        blank=True,
        default="",
    )
    linkedin_url = models.URLField(
        _("LinkedIn URL"),
        max_length=500,
        blank=True,
        default="",
    )
    linkedin_followers = models.PositiveIntegerField(
        _("LinkedIn followers"),
        null=True,
        blank=True,
    )
    facebook_url = models.URLField(
        _("Facebook URL"),
        max_length=500,
        blank=True,
        default="",
    )
    facebook_followers = models.PositiveIntegerField(
        _("Facebook followers"),
        null=True,
        blank=True,
    )

    # -- Profile Image --
    image = models.ImageField(
        _("profile image"),
        upload_to="contacts/images/",
        blank=True,
        null=True,
    )

    # -- Relationships --
    # ManyToMany relationship: a contact can belong to multiple corporations
    corporations = models.ManyToManyField(
        "corporations.Corporation",
        related_name="contacts",
        verbose_name=_("corporations"),
        blank=True,
    )
    # Primary corporation for display purposes (optional)
    primary_corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        related_name="primary_contacts",
        verbose_name=_("primary corporation"),
        null=True,
        blank=True,
        help_text=_("Main corporation for this contact"),
    )
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="assigned_contacts",
        verbose_name=_("assigned to"),
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="created_contacts",
        verbose_name=_("created by"),
        null=True,
        blank=True,
    )
    sla = models.ForeignKey(
        "business_hours.BusinessHours",
        on_delete=models.SET_NULL,
        related_name="contacts",
        verbose_name=_("SLA"),
        null=True,
        blank=True,
    )

    # -- Custom fields --
    custom_fields = models.JSONField(
        _("custom fields"),
        default=dict,
        blank=True,
    )

    # -- Office Services --
    office_services = models.CharField(
        _("office services"),
        max_length=100,
        blank=True,
        default="",
        help_text=_("Office location for services (e.g., WALTHAM, GLOUCESTER)"),
    )

    # -- Misc --
    description = models.TextField(
        _("description"),
        blank=True,
        default="",
    )
    tags = models.CharField(
        _("tags"),
        max_length=500,
        blank=True,
        default="",
        help_text=_("Comma-separated tags."),
    )

    class Meta:
        db_table = "crm_contacts"
        ordering = ["last_name", "first_name"]
        verbose_name = _("contact")
        verbose_name_plural = _("contacts")
        indexes = [
            models.Index(fields=["last_name", "first_name"], name="idx_contact_name"),
            # Common filter: contacts by status and assigned user
            models.Index(
                fields=["status", "assigned_to"],
                name="idx_contact_status_assigned",
            ),
            # Common filter: contacts by primary corporation
            models.Index(
                fields=["primary_corporation", "status"],
                name="idx_contact_prim_corp_status",
            ),
        ]

    def __str__(self):
        return self.full_name

    def save(self, *args, **kwargs):
        if not self.contact_number:
            # Generate contact number like CON0001, CON0002, etc.
            last_contact = Contact.objects.order_by("-contact_number").first()
            if last_contact and last_contact.contact_number:
                try:
                    last_num = int(last_contact.contact_number.replace("CON", ""))
                    new_num = last_num + 1
                except ValueError:
                    new_num = 1
            else:
                new_num = 1
            self.contact_number = f"CON{new_num:04d}"
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        parts = []
        if self.salutation:
            parts.append(self.salutation)
        parts.append(self.first_name)
        parts.append(self.last_name)
        return " ".join(parts).strip()

    @property
    def corporation(self):
        """Backward compatibility: returns primary corporation or first corporation."""
        if self.primary_corporation:
            return self.primary_corporation
        return self.corporations.first()

    @corporation.setter
    def corporation(self, value):
        """
        Backward compatibility setter.

        Allows legacy code/tests to do `contact.corporation = corp` by:
        - setting primary_corporation
        - ensuring the corporation is included in the M2M `corporations`
        """
        self.primary_corporation = value
        if value is None:
            return

        # If the contact is already saved, keep M2M consistent immediately.
        # If not saved yet, caller should save first and then add to M2M.
        if self.pk:
            self.corporations.add(value)

    @property
    def corporation_name(self):
        """Returns name of primary corporation for display."""
        corp = self.corporation
        return corp.name if corp else None


# ---------------------------------------------------------------------------
# ContactStar (favourites)
# ---------------------------------------------------------------------------
class ContactStar(models.Model):
    """
    Join table that tracks which users have starred (favourited) a contact.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="starred_contacts",
        verbose_name=_("user"),
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="stars",
        verbose_name=_("contact"),
    )
    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )

    class Meta:
        db_table = "crm_contact_stars"
        unique_together = ("user", "contact")
        ordering = ["-created_at"]
        verbose_name = _("contact star")
        verbose_name_plural = _("contact stars")

    def __str__(self):
        return f"{self.user} -> {self.contact}"


# ---------------------------------------------------------------------------
# ContactTag
# ---------------------------------------------------------------------------
class ContactTag(models.Model):
    """
    Tags for categorizing contacts.
    Can be personal (per user) or shared (visible to all).
    """

    class TagType(models.TextChoices):
        SHARED = "shared", _("Shared")
        PERSONAL = "personal", _("Personal")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(
        _("name"),
        max_length=50,
    )
    color = models.CharField(
        _("color"),
        max_length=7,
        default="#6366f1",
        help_text=_("Hex color code for the tag."),
    )
    tag_type = models.CharField(
        _("type"),
        max_length=10,
        choices=TagType.choices,
        default=TagType.SHARED,
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_contact_tags",
        verbose_name=_("created by"),
    )
    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )

    class Meta:
        db_table = "crm_contact_tags"
        ordering = ["name"]
        verbose_name = _("contact tag")
        verbose_name_plural = _("contact tags")

    def __str__(self):
        return self.name


class ContactTagAssignment(models.Model):
    """
    Join table linking contacts to tags.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="tag_assignments",
        verbose_name=_("contact"),
    )
    tag = models.ForeignKey(
        ContactTag,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name=_("tag"),
    )
    assigned_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_contact_tags",
        verbose_name=_("assigned by"),
    )
    assigned_at = models.DateTimeField(
        _("assigned at"),
        auto_now_add=True,
    )

    class Meta:
        db_table = "crm_contact_tag_assignments"
        unique_together = ("contact", "tag")
        ordering = ["-assigned_at"]
        verbose_name = _("contact tag assignment")
        verbose_name_plural = _("contact tag assignments")

    def __str__(self):
        return f"{self.contact} - {self.tag}"
