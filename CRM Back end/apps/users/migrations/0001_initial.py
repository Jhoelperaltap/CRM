import uuid

import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import apps.users.managers


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        # -----------------------------------------------------------------
        # Role
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="Role",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=50, verbose_name="role name")),
                (
                    "slug",
                    models.CharField(
                        max_length=50, unique=True, verbose_name="role slug"
                    ),
                ),
                (
                    "description",
                    models.TextField(blank=True, default="", verbose_name="description"),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="users.role",
                        verbose_name="parent role",
                    ),
                ),
                (
                    "level",
                    models.PositiveSmallIntegerField(
                        default=0, verbose_name="hierarchy level"
                    ),
                ),
                (
                    "department",
                    models.CharField(
                        blank=True, default="", max_length=100, verbose_name="department"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
            ],
            options={
                "db_table": "crm_roles",
                "ordering": ["level", "name"],
                "verbose_name": "role",
                "verbose_name_plural": "roles",
            },
        ),
        # -----------------------------------------------------------------
        # User
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="User",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                (
                    "last_login",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="last login"
                    ),
                ),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                (
                    "username",
                    models.CharField(
                        error_messages={
                            "unique": "A user with that username already exists."
                        },
                        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                        max_length=150,
                        unique=True,
                        validators=[
                            django.contrib.auth.validators.UnicodeUsernameValidator()
                        ],
                        verbose_name="username",
                    ),
                ),
                (
                    "first_name",
                    models.CharField(
                        blank=True, max_length=150, verbose_name="first name"
                    ),
                ),
                (
                    "last_name",
                    models.CharField(
                        blank=True, max_length=150, verbose_name="last name"
                    ),
                ),
                (
                    "is_staff",
                    models.BooleanField(
                        default=False,
                        help_text="Designates whether the user can log into this admin site.",
                        verbose_name="staff status",
                    ),
                ),
                (
                    "date_joined",
                    models.DateTimeField(
                        default=django.utils.timezone.now, verbose_name="date joined"
                    ),
                ),
                (
                    "email",
                    models.EmailField(
                        error_messages={
                            "unique": "A user with that email already exists."
                        },
                        max_length=254,
                        unique=True,
                        verbose_name="email address",
                    ),
                ),
                (
                    "role",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="users",
                        to="users.role",
                        verbose_name="role",
                    ),
                ),
                (
                    "phone",
                    models.CharField(
                        blank=True, default="", max_length=30, verbose_name="phone number"
                    ),
                ),
                (
                    "avatar",
                    models.ImageField(
                        blank=True,
                        default="",
                        upload_to="avatars/%Y/%m/",
                        verbose_name="avatar",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="active"),
                ),
                (
                    "last_login_ip",
                    models.GenericIPAddressField(
                        blank=True, null=True, verbose_name="last login IP"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "db_table": "crm_users",
                "ordering": ["-created_at"],
                "verbose_name": "user",
                "verbose_name_plural": "users",
            },
            managers=[
                ("objects", apps.users.managers.UserManager()),
            ],
        ),
        # -----------------------------------------------------------------
        # ModulePermission
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="ModulePermission",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "role",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="permissions",
                        to="users.role",
                        verbose_name="role",
                    ),
                ),
                (
                    "module",
                    models.CharField(
                        choices=[
                            ("contacts", "Contacts"),
                            ("corporations", "Corporations"),
                            ("cases", "Cases"),
                            ("dashboard", "Dashboard"),
                            ("users", "Users"),
                            ("audit", "Audit"),
                            ("appointments", "Appointments"),
                            ("documents", "Documents"),
                            ("tasks", "Tasks"),
                        ],
                        max_length=30,
                        verbose_name="module",
                    ),
                ),
                (
                    "can_view",
                    models.BooleanField(default=False, verbose_name="can view"),
                ),
                (
                    "can_create",
                    models.BooleanField(default=False, verbose_name="can create"),
                ),
                (
                    "can_edit",
                    models.BooleanField(default=False, verbose_name="can edit"),
                ),
                (
                    "can_delete",
                    models.BooleanField(default=False, verbose_name="can delete"),
                ),
                (
                    "can_export",
                    models.BooleanField(default=False, verbose_name="can export"),
                ),
                (
                    "can_import",
                    models.BooleanField(default=False, verbose_name="can import"),
                ),
            ],
            options={
                "db_table": "crm_module_permissions",
                "ordering": ["role", "module"],
                "verbose_name": "module permission",
                "verbose_name_plural": "module permissions",
                "unique_together": {("role", "module")},
            },
        ),
        # -----------------------------------------------------------------
        # UserGroup
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="UserGroup",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        max_length=100, unique=True, verbose_name="group name"
                    ),
                ),
                (
                    "description",
                    models.TextField(blank=True, default="", verbose_name="description"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
            ],
            options={
                "db_table": "crm_user_groups",
                "ordering": ["name"],
                "verbose_name": "user group",
                "verbose_name_plural": "user groups",
            },
        ),
        # -----------------------------------------------------------------
        # UserGroupMembership
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="UserGroupMembership",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="users.usergroup",
                        verbose_name="group",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="group_memberships",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "joined_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="joined at"),
                ),
            ],
            options={
                "db_table": "crm_user_group_memberships",
                "verbose_name": "group membership",
                "verbose_name_plural": "group memberships",
                "unique_together": {("group", "user")},
            },
        ),
        # -----------------------------------------------------------------
        # Add members M2M field to UserGroup (through model)
        # -----------------------------------------------------------------
        migrations.AddField(
            model_name="usergroup",
            name="members",
            field=models.ManyToManyField(
                blank=True,
                related_name="user_groups",
                through="users.UserGroupMembership",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # -----------------------------------------------------------------
        # SharingRule
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="SharingRule",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "module",
                    models.CharField(
                        choices=[
                            ("contacts", "Contacts"),
                            ("corporations", "Corporations"),
                            ("cases", "Cases"),
                            ("dashboard", "Dashboard"),
                            ("users", "Users"),
                            ("audit", "Audit"),
                            ("appointments", "Appointments"),
                            ("documents", "Documents"),
                            ("tasks", "Tasks"),
                        ],
                        max_length=30,
                        verbose_name="module",
                    ),
                ),
                (
                    "default_access",
                    models.CharField(
                        choices=[
                            ("private", "Private"),
                            ("public", "Public Read/Write"),
                            ("read_only", "Public Read Only"),
                        ],
                        default="private",
                        max_length=20,
                        verbose_name="default access",
                    ),
                ),
                (
                    "share_type",
                    models.CharField(
                        choices=[
                            ("role_hierarchy", "Role & Subordinates"),
                            ("group", "Group"),
                            ("specific_user", "Specific User"),
                        ],
                        max_length=20,
                        verbose_name="share type",
                    ),
                ),
                (
                    "shared_from_role",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sharing_rules_from",
                        to="users.role",
                        verbose_name="shared from role",
                    ),
                ),
                (
                    "shared_to_role",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sharing_rules_to",
                        to="users.role",
                        verbose_name="shared to role",
                    ),
                ),
                (
                    "shared_from_group",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sharing_rules_from",
                        to="users.usergroup",
                        verbose_name="shared from group",
                    ),
                ),
                (
                    "shared_to_group",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sharing_rules_to",
                        to="users.usergroup",
                        verbose_name="shared to group",
                    ),
                ),
                (
                    "access_level",
                    models.CharField(
                        choices=[
                            ("read_only", "Read Only"),
                            ("read_write", "Read/Write"),
                        ],
                        default="read_only",
                        max_length=20,
                        verbose_name="access level",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
            ],
            options={
                "db_table": "crm_sharing_rules",
                "ordering": ["module", "share_type"],
                "verbose_name": "sharing rule",
                "verbose_name_plural": "sharing rules",
            },
        ),
        # -----------------------------------------------------------------
        # AuthenticationPolicy (singleton)
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="AuthenticationPolicy",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.UUID("00000000-0000-4000-8000-000000000001"),
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "password_reset_frequency_days",
                    models.PositiveIntegerField(
                        default=180, verbose_name="password reset frequency (days)"
                    ),
                ),
                (
                    "password_history_count",
                    models.PositiveIntegerField(
                        default=5, verbose_name="password history count"
                    ),
                ),
                (
                    "idle_session_timeout_minutes",
                    models.PositiveIntegerField(
                        default=240, verbose_name="idle session timeout (minutes)"
                    ),
                ),
                (
                    "max_concurrent_sessions",
                    models.PositiveIntegerField(
                        default=4, verbose_name="max concurrent sessions"
                    ),
                ),
                (
                    "enforce_password_complexity",
                    models.BooleanField(
                        default=True, verbose_name="enforce password complexity"
                    ),
                ),
                (
                    "min_password_length",
                    models.PositiveIntegerField(
                        default=8, verbose_name="minimum password length"
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
            ],
            options={
                "db_table": "crm_authentication_policy",
                "verbose_name": "authentication policy",
                "verbose_name_plural": "authentication policies",
            },
        ),
        # -----------------------------------------------------------------
        # PasswordHistory
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="PasswordHistory",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_history",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "password_hash",
                    models.CharField(max_length=255, verbose_name="password hash"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
            ],
            options={
                "db_table": "crm_password_history",
                "ordering": ["-created_at"],
                "verbose_name": "password history",
                "verbose_name_plural": "password histories",
            },
        ),
        # -----------------------------------------------------------------
        # LoginIPWhitelist
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="LoginIPWhitelist",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "ip_address",
                    models.CharField(max_length=45, verbose_name="IP address"),
                ),
                (
                    "cidr_prefix",
                    models.PositiveSmallIntegerField(
                        blank=True, null=True, verbose_name="CIDR prefix length"
                    ),
                ),
                (
                    "role",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ip_whitelist",
                        to="users.role",
                        verbose_name="role",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ip_whitelist",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "description",
                    models.CharField(
                        blank=True, default="", max_length=255, verbose_name="description"
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
            ],
            options={
                "db_table": "crm_login_ip_whitelist",
                "ordering": ["ip_address"],
                "verbose_name": "login IP whitelist entry",
                "verbose_name_plural": "login IP whitelist entries",
            },
        ),
        # -----------------------------------------------------------------
        # UserSession
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="UserSession",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "jti",
                    models.CharField(
                        max_length=255, unique=True, verbose_name="JWT ID"
                    ),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(
                        blank=True, null=True, verbose_name="IP address"
                    ),
                ),
                (
                    "user_agent",
                    models.TextField(blank=True, default="", verbose_name="user agent"),
                ),
                (
                    "last_activity",
                    models.DateTimeField(auto_now=True, verbose_name="last activity"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="active"),
                ),
            ],
            options={
                "db_table": "crm_user_sessions",
                "ordering": ["-last_activity"],
                "verbose_name": "user session",
                "verbose_name_plural": "user sessions",
            },
        ),
    ]
