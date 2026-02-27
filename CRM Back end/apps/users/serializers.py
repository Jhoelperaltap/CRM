from django.contrib.auth import password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.emails.models import EmailAccount
from apps.users.models import (
    Branch,
    Department,
    ModulePermission,
    Role,
    User,
    UserGroup,
)


# ---------------------------------------------------------------------------
# Role / Permission serializers
# ---------------------------------------------------------------------------
class ModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModulePermission
        fields = [
            "id",
            "role",
            "module",
            "can_view",
            "can_create",
            "can_edit",
            "can_delete",
            "can_export",
            "can_import",
        ]
        read_only_fields = ["id"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = ModulePermissionSerializer(many=True, read_only=True)
    user_count = serializers.IntegerField(read_only=True, required=False)
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "parent",
            "parent_name",
            "level",
            "department",
            "assign_users_policy",
            "assign_groups_policy",
            "created_at",
            "permissions",
            "user_count",
        ]
        read_only_fields = ["id", "created_at"]

    def get_parent_name(self, obj):
        if obj.parent:
            return obj.parent.name
        return ""


class RoleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "parent",
            "level",
            "department",
            "assign_users_policy",
            "assign_groups_policy",
        ]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        return RoleSerializer(instance, context=self.context).data


class RoleTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    permissions = ModulePermissionSerializer(many=True, read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "level",
            "department",
            "assign_users_policy",
            "assign_groups_policy",
            "user_count",
            "permissions",
            "children",
        ]

    def get_children(self, obj):
        children = obj.children.prefetch_related("permissions", "children").all()
        return RoleTreeSerializer(children, many=True, context=self.context).data

    def get_user_count(self, obj):
        return obj.users.count()


# ---------------------------------------------------------------------------
# Nested summary serializers
# ---------------------------------------------------------------------------
class _UserSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of reports_to user."""

    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _UserGroupSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of primary group."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class _BusinessHoursSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of business hours."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class _DepartmentSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of department."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)
    color = serializers.CharField(read_only=True)
    icon = serializers.CharField(read_only=True)


# ---------------------------------------------------------------------------
# User serializers
# ---------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    """
    Read-only serializer used in list / detail views.
    Includes the full nested role and excludes password.
    """

    role = RoleSerializer(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    is_locked = serializers.SerializerMethodField()

    def get_is_locked(self, obj):
        """Check if account is currently locked due to failed login attempts."""
        from django.utils import timezone

        if obj.locked_until and obj.locked_until > timezone.now():
            return True
        return False

    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=None
    )
    email_account_email = serializers.CharField(
        source="email_account.email_address", read_only=True, default=None
    )
    reports_to = _UserSummarySerializer(read_only=True)
    primary_group = _UserGroupSummarySerializer(read_only=True)
    business_hours = _BusinessHoursSummarySerializer(read_only=True)
    department = _DepartmentSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            # User Information
            "user_type",
            "role",
            "reports_to",
            "primary_group",
            "language",
            "branch",
            "branch_name",
            # Employee Information
            "title",
            "department",
            "secondary_email",
            "other_email",
            "phone",
            "home_phone",
            "mobile_phone",
            "secondary_phone",
            "fax",
            # User Address
            "street",
            "city",
            "state",
            "country",
            "postal_code",
            # Currency and Number Preferences
            "preferred_currency",
            "show_amounts_in_preferred_currency",
            "digit_grouping_pattern",
            "decimal_separator",
            "digit_grouping_separator",
            "symbol_placement",
            "number_of_currency_decimals",
            "truncate_trailing_zeros",
            "currency_format",
            "aggregated_number_format",
            # Phone Preferences
            "phone_country_code",
            "asterisk_extension",
            "use_full_screen_record_preview",
            # Signature
            "signature_block",
            "insert_signature_before_quoted_text",
            # User Business Hours
            "business_hours",
            # Usage Preferences
            "default_page_after_login",
            "default_record_view",
            "use_mail_composer",
            "person_name_format",
            # Avatar & Security
            "avatar",
            "is_active",
            "last_login",
            "last_login_ip",
            "email_account",
            "email_account_email",
            # Account lockout
            "is_locked",
            "failed_login_attempts",
            "locked_until",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.  Accepts a role UUID and a raw password.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        required=True,
    )
    reports_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    primary_group = serializers.PrimaryKeyRelatedField(
        queryset=UserGroup.objects.all(),
        required=False,
        allow_null=True,
    )
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False,
        allow_null=True,
    )
    email_account = serializers.PrimaryKeyRelatedField(
        queryset=EmailAccount.objects.all(),
        required=False,
        allow_null=True,
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "password",
            # User Information
            "user_type",
            "role",
            "reports_to",
            "primary_group",
            "language",
            "branch",
            # Employee Information
            "title",
            "department",
            "secondary_email",
            "other_email",
            "phone",
            "home_phone",
            "mobile_phone",
            "secondary_phone",
            "fax",
            # User Address
            "street",
            "city",
            "state",
            "country",
            "postal_code",
            # Currency and Number Preferences
            "preferred_currency",
            "show_amounts_in_preferred_currency",
            "digit_grouping_pattern",
            "decimal_separator",
            "digit_grouping_separator",
            "symbol_placement",
            "number_of_currency_decimals",
            "truncate_trailing_zeros",
            "currency_format",
            "aggregated_number_format",
            # Phone Preferences
            "phone_country_code",
            "asterisk_extension",
            "use_full_screen_record_preview",
            # Signature
            "signature_block",
            "insert_signature_before_quoted_text",
            # User Business Hours
            "business_hours",
            # Usage Preferences
            "default_page_after_login",
            "default_record_view",
            "use_mail_composer",
            "person_name_format",
            # Avatar & Security
            "avatar",
            "is_active",
            "email_account",
        ]
        read_only_fields = ["id"]

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def to_representation(self, instance):
        """Return the full UserSerializer representation after creation."""
        return UserSerializer(instance, context=self.context).data


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profiles.
    Optionally accepts a new password to update.
    """

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={"input_type": "password"},
    )
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        required=False,
    )
    reports_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    primary_group = serializers.PrimaryKeyRelatedField(
        queryset=UserGroup.objects.all(),
        required=False,
        allow_null=True,
    )
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False,
        allow_null=True,
    )
    email_account = serializers.PrimaryKeyRelatedField(
        queryset=EmailAccount.objects.all(),
        required=False,
        allow_null=True,
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "first_name",
            "last_name",
            "password",
            # User Information
            "user_type",
            "role",
            "reports_to",
            "primary_group",
            "language",
            "branch",
            # Employee Information
            "title",
            "department",
            "secondary_email",
            "other_email",
            "phone",
            "home_phone",
            "mobile_phone",
            "secondary_phone",
            "fax",
            # User Address
            "street",
            "city",
            "state",
            "country",
            "postal_code",
            # Currency and Number Preferences
            "preferred_currency",
            "show_amounts_in_preferred_currency",
            "digit_grouping_pattern",
            "decimal_separator",
            "digit_grouping_separator",
            "symbol_placement",
            "number_of_currency_decimals",
            "truncate_trailing_zeros",
            "currency_format",
            "aggregated_number_format",
            # Phone Preferences
            "phone_country_code",
            "asterisk_extension",
            "use_full_screen_record_preview",
            # Signature
            "signature_block",
            "insert_signature_before_quoted_text",
            # User Business Hours
            "business_hours",
            # Usage Preferences
            "default_page_after_login",
            "default_record_view",
            "use_mail_composer",
            "person_name_format",
            # Avatar & Security
            "avatar",
            "is_active",
            "email_account",
        ]

    def validate_password(self, value):
        if value:
            password_validation.validate_password(value)
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
        return instance

    def to_representation(self, instance):
        """Return the full UserSerializer representation after update."""
        return UserSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Password change
# ---------------------------------------------------------------------------
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(_("Current password is incorrect."))
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": _("New passwords do not match.")}
            )
        if attrs["new_password"] == attrs["old_password"]:
            raise serializers.ValidationError(
                {"new_password": _("New password must differ from the current one.")}
            )
        return attrs

    def save(self, **kwargs):
        from apps.users.models import PasswordHistory

        user = self.context["request"].user
        # Store current password hash before changing
        PasswordHistory.objects.create(
            user=user,
            password_hash=user.password,
        )
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


# ---------------------------------------------------------------------------
# JWT / Auth
# ---------------------------------------------------------------------------
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to:
      1. Embed extra claims (email, role slug) in the access token.
      2. Return the authenticated user profile alongside the token pair.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims
        token["email"] = user.email
        token["role"] = user.role.slug if user.role else None
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Append full user profile to the response
        user = self.user
        data["user"] = UserSerializer(
            user, context={"request": self.context.get("request")}
        ).data

        return data


# ---------------------------------------------------------------------------
# CSV import
# ---------------------------------------------------------------------------
class UserImportSerializer(serializers.Serializer):
    """Validates a single CSV row for user import."""

    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")
    role = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Role.objects.all(),
        required=False,
        allow_null=True,
    )
    phone = serializers.CharField(max_length=30, required=False, default="")
    is_active = serializers.BooleanField(required=False, default=True)

    def create(self, validated_data):
        role = validated_data.pop("role", None)
        user = User(role=role, **validated_data)
        # Imported users get a random unusable password; admin must reset.
        user.set_unusable_password()
        user.save()
        return user
