from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from apps.users.models import (
    AuthenticationPolicy,
    LoginIPWhitelist,
    ModulePermission,
    Role,
    SharingRule,
    User,
    UserGroup,
    UserGroupMembership,
)


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------
class ModulePermissionInline(admin.TabularInline):
    model = ModulePermission
    extra = 0
    fields = (
        "module",
        "can_view",
        "can_create",
        "can_edit",
        "can_delete",
        "can_export",
        "can_import",
    )


# ---------------------------------------------------------------------------
# Role admin
# ---------------------------------------------------------------------------
@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "level", "department", "created_at")
    list_filter = ("slug", "level", "department")
    search_fields = ("name", "slug", "department")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("parent",)
    inlines = [ModulePermissionInline]


# ---------------------------------------------------------------------------
# Module Permission admin
# ---------------------------------------------------------------------------
@admin.register(ModulePermission)
class ModulePermissionAdmin(admin.ModelAdmin):
    list_display = (
        "role",
        "module",
        "can_view",
        "can_create",
        "can_edit",
        "can_delete",
        "can_export",
        "can_import",
    )
    list_filter = ("role", "module")
    list_editable = (
        "can_view",
        "can_create",
        "can_edit",
        "can_delete",
        "can_export",
        "can_import",
    )
    readonly_fields = ("id",)


# ---------------------------------------------------------------------------
# User admin
# ---------------------------------------------------------------------------
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "is_locked",
        "created_at",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "role")
    search_fields = ("email", "username", "first_name", "last_name", "phone")
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "last_login",
        "last_login_ip",
        "created_at",
        "updated_at",
        "failed_login_attempts",
        "last_failed_login",
        "locked_until",
    )
    actions = ["unlock_accounts"]

    @admin.display(boolean=True, description=_("Locked"))
    def is_locked(self, obj):
        """Display if account is currently locked."""
        from django.utils import timezone

        if obj.locked_until and obj.locked_until > timezone.now():
            return True
        return False

    @admin.action(description=_("Unlock selected accounts"))
    def unlock_accounts(self, request, queryset):
        """Admin action to unlock selected user accounts."""
        from apps.users.services.brute_force import BruteForceProtection

        unlocked_count = 0
        for user in queryset:
            if BruteForceProtection.unlock_account(user):
                unlocked_count += 1

        if unlocked_count:
            self.message_user(
                request,
                _("Successfully unlocked %(count)d account(s).")
                % {"count": unlocked_count},
            )
        else:
            self.message_user(
                request,
                _("No locked accounts were found in the selection."),
                level="warning",
            )

    fieldsets = (
        (None, {"fields": ("id", "email", "username", "password")}),
        (
            _("Personal info"),
            {"fields": ("first_name", "last_name", "phone", "avatar")},
        ),
        (_("Role"), {"fields": ("role",)}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            _("Important dates"),
            {"fields": ("last_login", "last_login_ip", "created_at", "updated_at")},
        ),
        (
            _("Account Security"),
            {
                "fields": (
                    "failed_login_attempts",
                    "last_failed_login",
                    "locked_until",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


# ---------------------------------------------------------------------------
# User Group admin
# ---------------------------------------------------------------------------
class UserGroupMembershipInline(admin.TabularInline):
    model = UserGroupMembership
    extra = 0
    raw_id_fields = ("user",)


@admin.register(UserGroup)
class UserGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "member_count", "created_at")
    search_fields = ("name",)
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [UserGroupMembershipInline]

    def member_count(self, obj):
        return obj.memberships.count()

    member_count.short_description = _("Members")


# ---------------------------------------------------------------------------
# Sharing Rule admin
# ---------------------------------------------------------------------------
@admin.register(SharingRule)
class SharingRuleAdmin(admin.ModelAdmin):
    list_display = (
        "module",
        "default_access",
        "share_type",
        "access_level",
        "is_active",
    )
    list_filter = ("module", "share_type", "is_active")
    readonly_fields = ("id", "created_at")
    raw_id_fields = (
        "shared_from_role",
        "shared_to_role",
        "shared_from_group",
        "shared_to_group",
    )


# ---------------------------------------------------------------------------
# Authentication Policy admin
# ---------------------------------------------------------------------------
@admin.register(AuthenticationPolicy)
class AuthenticationPolicyAdmin(admin.ModelAdmin):
    list_display = (
        "password_reset_frequency_days",
        "max_concurrent_sessions",
        "idle_session_timeout_minutes",
        "updated_at",
    )
    readonly_fields = ("id", "updated_at")

    def has_add_permission(self, request):
        return not AuthenticationPolicy.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# Login IP Whitelist admin
# ---------------------------------------------------------------------------
@admin.register(LoginIPWhitelist)
class LoginIPWhitelistAdmin(admin.ModelAdmin):
    list_display = (
        "ip_address",
        "cidr_prefix",
        "role",
        "user",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "role")
    search_fields = ("ip_address", "description")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("role", "user")
