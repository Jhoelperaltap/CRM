import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.users.branch_models import Branch  # noqa: F401
from apps.users.managers import UserManager


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------
class Department(models.Model):
    """
    Represents an organizational department (e.g., Accounting, Payroll).
    Each department has its own folder structure per client for document organization.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(_("name"), max_length=100, unique=True)
    code = models.CharField(_("code"), max_length=20, unique=True)
    description = models.TextField(_("description"), blank=True, default="")
    color = models.CharField(
        _("color"),
        max_length=7,
        default="#6366f1",
        help_text=_("Hex color code for UI display"),
    )
    icon = models.CharField(
        _("icon"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("Lucide icon name for UI display"),
    )
    is_active = models.BooleanField(_("active"), default=True)
    order = models.PositiveIntegerField(
        _("display order"),
        default=0,
        help_text=_("Order in which departments appear in lists"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "crm_departments"
        ordering = ["order", "name"]
        verbose_name = _("department")
        verbose_name_plural = _("departments")

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Role
# ---------------------------------------------------------------------------
class Role(models.Model):
    """
    System-defined roles that govern module-level access.
    Supports a parent-child hierarchy for role-based sharing.
    """

    class RoleSlug(models.TextChoices):
        ADMIN = "admin", _("Administrator")
        ORGANIZATION = "organization", _("Organization")
        CEO = "ceo", _("CEO")
        VP_SALES = "vp-sales", _("VP of Sales")
        VP_CUSTOMER_SERVICES = "vp-customer-services", _("VP of Customer Services")
        MARKETING_MANAGER = "marketing-manager", _("Marketing Manager")
        SALES_MANAGER = "sales-manager", _("Sales Manager")
        SALES_REPRESENTATIVE = "sales-representative", _("Sales Representative")
        SUPPORT_MANAGER = "support-manager", _("Support Manager")
        SUPPORT_REPRESENTATIVE = "support-representative", _("Support Representative")
        IT_CONSULTANT = "it-consultant", _("IT Consultant")
        MANAGER = "manager", _("Manager")
        SUPERVISOR = "supervisor", _("Accounting Supervisor")
        PREPARER = "preparer", _("Tax Preparer")
        REVIEWER = "reviewer", _("Tax Reviewer")
        RECEPTIONIST = "receptionist", _("Receptionist")
        INTERN = "intern", _("Intern")

    class AssignUsersPolicy(models.TextChoices):
        ALL_USERS = "all_users", _("All Users")
        SAME_ROLE_HIERARCHY = "same_role_hierarchy", _(
            "Users having Same Role or Same Hierarchy or Subordinate Role"
        )
        SUBORDINATE_ROLE = "subordinate_role", _("Users having Subordinate Role")

    class AssignGroupsPolicy(models.TextChoices):
        ALL_GROUPS = "all_groups", _("All Groups")
        USER_GROUPS = "user_groups", _("All Groups that user is part of")
        SELECTED_GROUPS = "selected_groups", _("Selected Groups")
        NO_GROUPS = "no_groups", _("Can not assign to any group")
        SELECTED_GROUPS_MEMBERS = "selected_groups_members", _(
            "Selected Groups and Group members"
        )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(_("role name"), max_length=50)
    slug = models.CharField(
        _("role slug"),
        max_length=50,
        unique=True,
    )
    description = models.TextField(_("description"), blank=True, default="")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        verbose_name=_("parent role"),
    )
    level = models.PositiveSmallIntegerField(_("hierarchy level"), default=0)
    department = models.CharField(
        _("department"), max_length=100, blank=True, default=""
    )
    assign_users_policy = models.CharField(
        _("assign records to users"),
        max_length=30,
        choices=AssignUsersPolicy.choices,
        default=AssignUsersPolicy.ALL_USERS,
    )
    assign_groups_policy = models.CharField(
        _("assign records to groups"),
        max_length=30,
        choices=AssignGroupsPolicy.choices,
        default=AssignGroupsPolicy.ALL_GROUPS,
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "crm_roles"
        ordering = ["level", "name"]
        verbose_name = _("role")
        verbose_name_plural = _("roles")

    def __str__(self):
        return self.name

    def get_ancestors(self):
        """Return list of ancestor roles from immediate parent to root."""
        ancestors = []
        current = self.parent
        visited = set()
        while current and current.pk not in visited:
            ancestors.append(current)
            visited.add(current.pk)
            current = current.parent
        return ancestors

    def get_descendants(self):
        """Return flat list of all descendant roles (BFS)."""
        descendants = []
        queue = list(self.children.all())
        visited = {self.pk}
        while queue:
            role = queue.pop(0)
            if role.pk in visited:
                continue
            visited.add(role.pk)
            descendants.append(role)
            queue.extend(role.children.all())
        return descendants

    def get_subordinate_user_ids(self):
        """Return user IDs from this role and all descendant roles."""
        from apps.users.models import User

        role_ids = [self.pk] + [r.pk for r in self.get_descendants()]
        return list(
            User.objects.filter(role_id__in=role_ids).values_list("id", flat=True)
        )


# ---------------------------------------------------------------------------
# Module Permission
# ---------------------------------------------------------------------------
class ModulePermission(models.Model):
    """
    Per-role, per-module CRUD permission flags.
    """

    class Module(models.TextChoices):
        CONTACTS = "contacts", _("Contacts")
        CORPORATIONS = "corporations", _("Corporations")
        CASES = "cases", _("Cases")
        DASHBOARD = "dashboard", _("Dashboard")
        USERS = "users", _("Users")
        AUDIT = "audit", _("Audit")
        APPOINTMENTS = "appointments", _("Appointments")
        DOCUMENTS = "documents", _("Documents")
        TASKS = "tasks", _("Tasks")
        QUOTES = "quotes", _("Quotes")
        EMAILS = "emails", _("Emails")
        NOTIFICATIONS = "notifications", _("Notifications")
        WORKFLOWS = "workflows", _("Workflows")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="permissions",
        verbose_name=_("role"),
    )
    module = models.CharField(
        _("module"),
        max_length=30,
        choices=Module.choices,
    )
    can_view = models.BooleanField(_("can view"), default=False)
    can_create = models.BooleanField(_("can create"), default=False)
    can_edit = models.BooleanField(_("can edit"), default=False)
    can_delete = models.BooleanField(_("can delete"), default=False)
    can_export = models.BooleanField(_("can export"), default=False)
    can_import = models.BooleanField(_("can import"), default=False)

    class Meta:
        db_table = "crm_module_permissions"
        unique_together = ("role", "module")
        ordering = ["role", "module"]
        verbose_name = _("module permission")
        verbose_name_plural = _("module permissions")

    def __str__(self):
        return f"{self.role.slug} | {self.module}"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(AbstractUser):
    """
    Custom user model.  Email is the primary login identifier.
    Updated to match Vtiger CRM user form structure.
    """

    class UserType(models.TextChoices):
        STANDARD = "standard", _("Standard")
        ADMIN = "admin", _("Admin")
        POWER_USER = "power_user", _("Power User")

    class Language(models.TextChoices):
        EN_US = "en_us", _("US English")
        EN_GB = "en_gb", _("UK English")
        ES = "es", _("Spanish")
        FR = "fr", _("French")
        DE = "de", _("German")
        PT_BR = "pt_br", _("Portuguese (Brazil)")
        IT = "it", _("Italian")
        NL = "nl", _("Dutch")
        PL = "pl", _("Polish")
        RU = "ru", _("Russian")
        ZH = "zh", _("Chinese")
        JA = "ja", _("Japanese")
        KO = "ko", _("Korean")

    class DigitGroupingPattern(models.TextChoices):
        PATTERN_1 = "123456789", _("123456789")
        PATTERN_2 = "123,456,789", _("123,456,789")
        PATTERN_3 = "12,34,56,789", _("12,34,56,789")

    class DecimalSeparator(models.TextChoices):
        DOT = ".", _(".")
        COMMA = ",", _(",")

    class DigitGroupingSeparator(models.TextChoices):
        COMMA = ",", _(",")
        DOT = ".", _(".")
        SPACE = " ", _(" (space)")
        APOSTROPHE = "'", _("'")

    class SymbolPlacement(models.TextChoices):
        BEFORE = "$1.0", _("$1.0")
        AFTER = "1.0$", _("1.0$")

    class CurrencyFormat(models.TextChoices):
        SYMBOL = "symbol", _("Currency Symbol")
        CODE = "code", _("Currency Code")

    class AggregatedNumberFormat(models.TextChoices):
        FULL = "full", _("Full")
        ABBREVIATED = "abbreviated", _("Abbreviated (1K, 1M)")

    class DefaultRecordView(models.TextChoices):
        SUMMARY = "summary", _("Summary")
        DETAIL = "detail", _("Detail")

    class PersonNameFormat(models.TextChoices):
        FIRST_LAST = "first_last", _("First Name Last Name")
        LAST_FIRST = "last_first", _("Last Name First Name")
        SALUTATION_FIRST_LAST = "salutation_first_last", _(
            "Salutation First Name Last Name"
        )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    email = models.EmailField(
        _("email address"),
        unique=True,
        error_messages={
            "unique": _("A user with that email already exists."),
        },
    )

    # -- User Information --
    user_type = models.CharField(
        _("user type"),
        max_length=20,
        choices=UserType.choices,
        default=UserType.STANDARD,
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        verbose_name=_("role"),
        null=True,
        blank=True,
    )
    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="direct_reports",
        verbose_name=_("reports to"),
        null=True,
        blank=True,
    )
    primary_group = models.ForeignKey(
        "users.UserGroup",
        on_delete=models.SET_NULL,
        related_name="primary_users",
        verbose_name=_("primary group"),
        null=True,
        blank=True,
    )
    language = models.CharField(
        _("language"),
        max_length=10,
        choices=Language.choices,
        default=Language.EN_US,
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name=_("branch"),
    )

    # -- Employee Information --
    title = models.CharField(
        _("title"),
        max_length=100,
        blank=True,
        default="",
    )
    department = models.ForeignKey(
        "Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name=_("department"),
    )
    secondary_email = models.EmailField(
        _("secondary email"),
        blank=True,
        default="",
    )
    other_email = models.EmailField(
        _("other email"),
        blank=True,
        default="",
    )
    phone = models.CharField(
        _("office phone"),
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
    mobile_phone = models.CharField(
        _("mobile phone"),
        max_length=30,
        blank=True,
        default="",
    )
    secondary_phone = models.CharField(
        _("secondary phone"),
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

    # -- User Address --
    street = models.CharField(
        _("street"),
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
    country = models.CharField(
        _("country"),
        max_length=100,
        blank=True,
        default="United States",
    )
    postal_code = models.CharField(
        _("postal code"),
        max_length=20,
        blank=True,
        default="",
    )

    # -- Currency and Number Preferences --
    preferred_currency = models.CharField(
        _("preferred currency"),
        max_length=10,
        blank=True,
        default="USD",
    )
    show_amounts_in_preferred_currency = models.BooleanField(
        _("show amounts in preferred currency"),
        default=True,
    )
    digit_grouping_pattern = models.CharField(
        _("digit grouping pattern"),
        max_length=20,
        choices=DigitGroupingPattern.choices,
        default=DigitGroupingPattern.PATTERN_2,
    )
    decimal_separator = models.CharField(
        _("decimal separator"),
        max_length=5,
        choices=DecimalSeparator.choices,
        default=DecimalSeparator.DOT,
    )
    digit_grouping_separator = models.CharField(
        _("digit grouping separator"),
        max_length=5,
        choices=DigitGroupingSeparator.choices,
        default=DigitGroupingSeparator.COMMA,
    )
    symbol_placement = models.CharField(
        _("symbol placement"),
        max_length=10,
        choices=SymbolPlacement.choices,
        default=SymbolPlacement.BEFORE,
    )
    number_of_currency_decimals = models.PositiveSmallIntegerField(
        _("number of currency decimals"),
        default=2,
    )
    truncate_trailing_zeros = models.BooleanField(
        _("truncate trailing zeros"),
        default=True,
    )
    currency_format = models.CharField(
        _("currency format"),
        max_length=20,
        choices=CurrencyFormat.choices,
        default=CurrencyFormat.SYMBOL,
    )
    aggregated_number_format = models.CharField(
        _("aggregated number format"),
        max_length=20,
        choices=AggregatedNumberFormat.choices,
        default=AggregatedNumberFormat.FULL,
    )

    # -- Phone Preferences --
    phone_country_code = models.CharField(
        _("phone country code"),
        max_length=10,
        blank=True,
        default="+1",
    )
    asterisk_extension = models.CharField(
        _("asterisk extension"),
        max_length=20,
        blank=True,
        default="",
    )
    use_full_screen_record_preview = models.BooleanField(
        _("use full screen for record preview"),
        default=False,
    )

    # -- Signature --
    signature_block = models.TextField(
        _("signature block"),
        blank=True,
        default="",
        help_text=_("HTML signature for emails"),
    )
    insert_signature_before_quoted_text = models.BooleanField(
        _("insert signature before quoted text"),
        default=True,
    )

    # -- User Business Hours --
    business_hours = models.ForeignKey(
        "business_hours.BusinessHours",
        on_delete=models.SET_NULL,
        related_name="users",
        verbose_name=_("business hours"),
        null=True,
        blank=True,
    )

    # -- Usage Preferences --
    default_page_after_login = models.CharField(
        _("default page after login"),
        max_length=50,
        blank=True,
        default="dashboard",
    )
    default_record_view = models.CharField(
        _("default record view"),
        max_length=20,
        choices=DefaultRecordView.choices,
        default=DefaultRecordView.SUMMARY,
    )
    use_mail_composer = models.BooleanField(
        _("use mail composer"),
        default=False,
    )
    person_name_format = models.CharField(
        _("person name format"),
        max_length=30,
        choices=PersonNameFormat.choices,
        default=PersonNameFormat.FIRST_LAST,
    )

    # -- Avatar & Security --
    avatar = models.ImageField(
        _("avatar"),
        upload_to="avatars/%Y/%m/",
        blank=True,
        default="",
    )
    is_active = models.BooleanField(_("active"), default=True)
    last_login_ip = models.GenericIPAddressField(
        _("last login IP"),
        null=True,
        blank=True,
    )
    # Brute force protection fields
    failed_login_attempts = models.PositiveIntegerField(
        _("failed login attempts"),
        default=0,
    )
    locked_until = models.DateTimeField(
        _("locked until"),
        null=True,
        blank=True,
        help_text=_("Account is locked until this time."),
    )
    last_failed_login = models.DateTimeField(
        _("last failed login"),
        null=True,
        blank=True,
    )
    totp_secret = models.CharField(
        _("TOTP secret"), max_length=32, blank=True, default=""
    )
    is_2fa_enabled = models.BooleanField(_("2FA enabled"), default=False)
    recovery_codes = models.JSONField(_("recovery codes"), default=list, blank=True)
    email_account = models.ForeignKey(
        "emails.EmailAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_users",
        verbose_name=_("email account"),
        help_text=_("The email account this user sends from."),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        db_table = "crm_users"
        ordering = ["-created_at"]
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self):
        return self.get_full_name() or self.email

    @property
    def full_name(self):
        return self.get_full_name()

    @property
    def role_slug(self):
        """Shortcut used by permission checks."""
        if self.role_id:
            return self.role.slug
        return None

    @property
    def is_admin(self):
        return self.role_slug == Role.RoleSlug.ADMIN or self.is_superuser

    @property
    def is_manager(self):
        return self.role_slug == Role.RoleSlug.MANAGER


# ---------------------------------------------------------------------------
# User Group
# ---------------------------------------------------------------------------
class UserGroup(models.Model):
    """Named group of users for sharing-rule targeting."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_("group name"), max_length=100, unique=True)
    description = models.TextField(_("description"), blank=True, default="")
    members = models.ManyToManyField(
        "User",
        through="UserGroupMembership",
        related_name="user_groups",
        blank=True,
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "crm_user_groups"
        ordering = ["name"]
        verbose_name = _("user group")
        verbose_name_plural = _("user groups")

    def __str__(self):
        return self.name


class UserGroupMembership(models.Model):
    """Through model for User ↔ UserGroup."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(
        UserGroup,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name=_("group"),
    )
    user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="group_memberships",
        verbose_name=_("user"),
    )
    joined_at = models.DateTimeField(_("joined at"), auto_now_add=True)

    class Meta:
        db_table = "crm_user_group_memberships"
        unique_together = ("group", "user")
        verbose_name = _("group membership")
        verbose_name_plural = _("group memberships")

    def __str__(self):
        return f"{self.user} in {self.group}"


# ---------------------------------------------------------------------------
# Sharing Rule
# ---------------------------------------------------------------------------
class SharingRule(models.Model):
    """
    Controls record-level access based on role hierarchy or groups.
    """

    class DefaultAccess(models.TextChoices):
        PRIVATE = "private", _("Private")
        PUBLIC = "public", _("Public Read/Write")
        READ_ONLY = "read_only", _("Public Read Only")

    class ShareType(models.TextChoices):
        ROLE_HIERARCHY = "role_hierarchy", _("Role & Subordinates")
        GROUP = "group", _("Group")
        SPECIFIC_USER = "specific_user", _("Specific User")

    class AccessLevel(models.TextChoices):
        READ_ONLY = "read_only", _("Read Only")
        READ_WRITE = "read_write", _("Read/Write")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.CharField(
        _("module"),
        max_length=30,
        choices=ModulePermission.Module.choices,
    )
    default_access = models.CharField(
        _("default access"),
        max_length=20,
        choices=DefaultAccess.choices,
        default=DefaultAccess.PRIVATE,
    )
    share_type = models.CharField(
        _("share type"),
        max_length=20,
        choices=ShareType.choices,
    )
    shared_from_role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sharing_rules_from",
        verbose_name=_("shared from role"),
    )
    shared_to_role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sharing_rules_to",
        verbose_name=_("shared to role"),
    )
    shared_from_group = models.ForeignKey(
        UserGroup,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sharing_rules_from",
        verbose_name=_("shared from group"),
    )
    shared_to_group = models.ForeignKey(
        UserGroup,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sharing_rules_to",
        verbose_name=_("shared to group"),
    )
    access_level = models.CharField(
        _("access level"),
        max_length=20,
        choices=AccessLevel.choices,
        default=AccessLevel.READ_ONLY,
    )
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "crm_sharing_rules"
        ordering = ["module", "share_type"]
        verbose_name = _("sharing rule")
        verbose_name_plural = _("sharing rules")

    def __str__(self):
        return f"{self.module} — {self.share_type} ({self.access_level})"


# ---------------------------------------------------------------------------
# Authentication Policy (Singleton)
# ---------------------------------------------------------------------------
AUTHENTICATION_POLICY_PK = uuid.UUID("00000000-0000-4000-8000-000000000001")


class AuthenticationPolicy(models.Model):
    """
    Singleton system-wide authentication settings.
    """

    id = models.UUIDField(
        primary_key=True, default=AUTHENTICATION_POLICY_PK, editable=False
    )
    password_reset_frequency_days = models.PositiveIntegerField(
        _("password reset frequency (days)"), default=180
    )
    password_history_count = models.PositiveIntegerField(
        _("password history count"), default=5
    )
    idle_session_timeout_minutes = models.PositiveIntegerField(
        _("idle session timeout (minutes)"), default=240
    )
    max_concurrent_sessions = models.PositiveIntegerField(
        _("max concurrent sessions"), default=4
    )
    enforce_password_complexity = models.BooleanField(
        _("enforce password complexity"), default=True
    )
    min_password_length = models.PositiveIntegerField(
        _("minimum password length"), default=8
    )
    enforce_2fa = models.BooleanField(
        _("enforce two-factor authentication"), default=False
    )
    enforce_2fa_for_roles = models.JSONField(
        _("enforce 2FA for specific roles"),
        default=list,
        blank=True,
        help_text=_(
            "List of role slugs that require 2FA (e.g., ['admin', 'manager']). "
            "Takes precedence over enforce_2fa when not empty."
        ),
    )
    remember_device_days = models.PositiveIntegerField(
        _("remember device (days)"), default=0
    )
    sso_enabled = models.BooleanField(
        _("SSO enabled"),
        default=False,
        help_text=_("Enable Single Sign-On integration."),
    )
    sso_provider = models.CharField(
        _("SSO provider"),
        max_length=50,
        blank=True,
        default="",
        help_text=_("SSO provider type: 'saml', 'oauth2', or empty."),
    )
    sso_entity_id = models.CharField(
        _("SSO entity ID"),
        max_length=255,
        blank=True,
        default="",
    )
    sso_login_url = models.URLField(
        _("SSO login URL"),
        blank=True,
        default="",
    )
    sso_certificate = models.TextField(
        _("SSO certificate"),
        blank=True,
        default="",
        help_text=_("X.509 certificate for SAML/OAuth2 verification."),
    )
    # Brute force protection settings
    max_failed_login_attempts = models.PositiveIntegerField(
        _("max failed login attempts"),
        default=5,
        help_text=_("Number of failed login attempts before account lockout."),
    )
    lockout_duration_minutes = models.PositiveIntegerField(
        _("lockout duration (minutes)"),
        default=30,
        help_text=_("Duration of account lockout after max failed attempts."),
    )
    failed_login_window_minutes = models.PositiveIntegerField(
        _("failed login window (minutes)"),
        default=15,
        help_text=_("Time window to count failed login attempts."),
    )
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "crm_authentication_policy"
        verbose_name = _("authentication policy")
        verbose_name_plural = _("authentication policies")

    def __str__(self):
        return "Authentication Policy"

    def save(self, *args, **kwargs):
        self.pk = AUTHENTICATION_POLICY_PK
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=AUTHENTICATION_POLICY_PK)
        return obj

    def requires_2fa_for_role(self, role_slug: str) -> bool:
        """
        Check if a specific role requires 2FA.

        Returns True if:
        - enforce_2fa is True (global enforcement), OR
        - The role is in enforce_2fa_for_roles list
        """
        if self.enforce_2fa:
            return True
        if self.enforce_2fa_for_roles and role_slug in self.enforce_2fa_for_roles:
            return True
        return False

    def get_2fa_required_roles(self) -> list:
        """
        Get list of role slugs that require 2FA.
        """
        if self.enforce_2fa:
            # All roles require 2FA
            return ["all"]
        return self.enforce_2fa_for_roles or []


# ---------------------------------------------------------------------------
# Password History
# ---------------------------------------------------------------------------
class PasswordHistory(models.Model):
    """Tracks previous password hashes for reuse prevention."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="password_history",
        verbose_name=_("user"),
    )
    password_hash = models.CharField(_("password hash"), max_length=255)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "crm_password_history"
        ordering = ["-created_at"]
        verbose_name = _("password history")
        verbose_name_plural = _("password histories")

    def __str__(self):
        return f"Password for {self.user} at {self.created_at}"


# ---------------------------------------------------------------------------
# Login IP Whitelist
# ---------------------------------------------------------------------------
class LoginIPWhitelist(models.Model):
    """
    Allow-list of IP addresses (exact or CIDR) per role or user.
    When entries exist, only matching IPs are permitted.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ip_address = models.CharField(_("IP address"), max_length=45)
    cidr_prefix = models.PositiveSmallIntegerField(
        _("CIDR prefix length"), null=True, blank=True
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ip_whitelist",
        verbose_name=_("role"),
    )
    user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ip_whitelist",
        verbose_name=_("user"),
    )
    description = models.CharField(
        _("description"), max_length=255, blank=True, default=""
    )
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "crm_login_ip_whitelist"
        ordering = ["ip_address"]
        verbose_name = _("login IP whitelist entry")
        verbose_name_plural = _("login IP whitelist entries")

    def __str__(self):
        cidr = f"/{self.cidr_prefix}" if self.cidr_prefix else ""
        return f"{self.ip_address}{cidr}"

    def matches(self, client_ip_str):
        """Return True if client_ip_str falls within this entry."""
        import ipaddress

        try:
            client_ip = ipaddress.ip_address(client_ip_str)
            if self.cidr_prefix is not None:
                network = ipaddress.ip_network(
                    f"{self.ip_address}/{self.cidr_prefix}", strict=False
                )
                return client_ip in network
            return client_ip == ipaddress.ip_address(self.ip_address)
        except ValueError:
            return False


# ---------------------------------------------------------------------------
# User Session
# ---------------------------------------------------------------------------
class UserSession(models.Model):
    """Tracks active JWT sessions for concurrent-session enforcement."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="sessions",
        verbose_name=_("user"),
    )
    jti = models.CharField(_("JWT ID"), max_length=255, unique=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True, default="")
    last_activity = models.DateTimeField(_("last activity"), auto_now=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        db_table = "crm_user_sessions"
        ordering = ["-last_activity"]
        verbose_name = _("user session")
        verbose_name_plural = _("user sessions")

    def __str__(self):
        return f"Session {self.jti[:8]}… for {self.user}"


# ---------------------------------------------------------------------------
# Blocked IP
# ---------------------------------------------------------------------------
class BlockedIP(models.Model):
    """
    IP addresses that are blocked from accessing the system.
    Used for security purposes to block malicious or unwanted access.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ip_address = models.CharField(_("IP address"), max_length=45, unique=True)
    cidr_prefix = models.PositiveSmallIntegerField(
        _("CIDR prefix length"), null=True, blank=True
    )
    reason = models.CharField(_("reason"), max_length=255, blank=True, default="")
    blocked_webform_requests = models.PositiveIntegerField(
        _("blocked webform requests"), default=0
    )
    is_active = models.BooleanField(_("active"), default=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blocked_ips_created",
        verbose_name=_("created by"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "crm_blocked_ips"
        ordering = ["-created_at"]
        verbose_name = _("blocked IP")
        verbose_name_plural = _("blocked IPs")

    def __str__(self):
        cidr = f"/{self.cidr_prefix}" if self.cidr_prefix else ""
        return f"{self.ip_address}{cidr}"

    def matches(self, client_ip_str):
        """Return True if client_ip_str falls within this blocked entry."""
        import ipaddress

        try:
            client_ip = ipaddress.ip_address(client_ip_str)
            if self.cidr_prefix is not None:
                network = ipaddress.ip_network(
                    f"{self.ip_address}/{self.cidr_prefix}", strict=False
                )
                return client_ip in network
            return client_ip == ipaddress.ip_address(self.ip_address)
        except ValueError:
            return False

    def increment_blocked_count(self):
        """Increment the blocked webform requests counter."""
        self.blocked_webform_requests += 1
        self.save(update_fields=["blocked_webform_requests", "updated_at"])


class BlockedIPLog(models.Model):
    """
    Log of blocked requests from blocked IP addresses.
    """

    class RequestType(models.TextChoices):
        WEBFORM = "webform", _("Webform Submission")
        LOGIN = "login", _("Login Attempt")
        API = "api", _("API Request")
        OTHER = "other", _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocked_ip = models.ForeignKey(
        BlockedIP,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name=_("blocked IP"),
    )
    ip_address = models.GenericIPAddressField(_("IP address"))
    request_type = models.CharField(
        _("request type"),
        max_length=20,
        choices=RequestType.choices,
        default=RequestType.OTHER,
    )
    request_path = models.CharField(
        _("request path"), max_length=500, blank=True, default=""
    )
    user_agent = models.TextField(_("user agent"), blank=True, default="")
    request_data = models.JSONField(_("request data"), default=dict, blank=True)
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        db_table = "crm_blocked_ip_logs"
        ordering = ["-timestamp"]
        verbose_name = _("blocked IP log")
        verbose_name_plural = _("blocked IP logs")
