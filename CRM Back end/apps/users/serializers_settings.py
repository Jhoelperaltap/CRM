from rest_framework import serializers

from apps.users.models import (
    AuthenticationPolicy,
    BlockedIP,
    BlockedIPLog,
    LoginIPWhitelist,
    SharingRule,
    UserGroup,
)


# ---------------------------------------------------------------------------
# User Groups
# ---------------------------------------------------------------------------
class UserGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = UserGroup
        fields = [
            "id",
            "name",
            "description",
            "member_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.memberships.count()


class UserGroupDetailSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = UserGroup
        fields = [
            "id",
            "name",
            "description",
            "member_count",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_members(self, obj):
        memberships = obj.memberships.select_related("user__role").all()
        return [
            {
                "id": str(m.user.id),
                "email": m.user.email,
                "full_name": m.user.get_full_name(),
                "role": m.user.role.slug if m.user.role else None,
                "joined_at": m.joined_at.isoformat(),
            }
            for m in memberships
        ]

    def get_member_count(self, obj):
        return obj.memberships.count()


class UserGroupMemberSerializer(serializers.Serializer):
    """Add or remove a user from a group."""

    user_id = serializers.UUIDField()


# ---------------------------------------------------------------------------
# Sharing Rules
# ---------------------------------------------------------------------------
class SharingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharingRule
        fields = [
            "id",
            "module",
            "default_access",
            "share_type",
            "shared_from_role",
            "shared_to_role",
            "shared_from_group",
            "shared_to_group",
            "access_level",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ---------------------------------------------------------------------------
# Authentication Policy
# ---------------------------------------------------------------------------
class AuthenticationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthenticationPolicy
        fields = [
            "id",
            "password_reset_frequency_days",
            "password_history_count",
            "idle_session_timeout_minutes",
            "max_concurrent_sessions",
            "max_session_duration_hours",
            "enforce_password_complexity",
            "min_password_length",
            "enforce_2fa",
            "enforce_2fa_for_roles",
            "remember_device_days",
            "sso_enabled",
            "sso_provider",
            "sso_entity_id",
            "sso_login_url",
            "sso_certificate",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


# ---------------------------------------------------------------------------
# Login IP Whitelist
# ---------------------------------------------------------------------------
class LoginIPWhitelistSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginIPWhitelist
        fields = [
            "id",
            "ip_address",
            "cidr_prefix",
            "role",
            "user",
            "description",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ---------------------------------------------------------------------------
# Blocked IP
# ---------------------------------------------------------------------------
class BlockedIPLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedIPLog
        fields = [
            "id",
            "blocked_ip",
            "ip_address",
            "request_type",
            "request_path",
            "user_agent",
            "request_data",
            "timestamp",
        ]
        read_only_fields = fields


class BlockedIPListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    log_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = BlockedIP
        fields = [
            "id",
            "ip_address",
            "cidr_prefix",
            "reason",
            "blocked_webform_requests",
            "is_active",
            "created_by",
            "created_by_name",
            "log_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "blocked_webform_requests",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class BlockedIPDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    logs = BlockedIPLogSerializer(many=True, read_only=True)

    class Meta:
        model = BlockedIP
        fields = [
            "id",
            "ip_address",
            "cidr_prefix",
            "reason",
            "blocked_webform_requests",
            "is_active",
            "created_by",
            "created_by_name",
            "logs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "blocked_webform_requests",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class BlockedIPCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedIP
        fields = [
            "id",
            "ip_address",
            "cidr_prefix",
            "reason",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_ip_address(self, value):
        import ipaddress

        try:
            ipaddress.ip_address(value)
        except ValueError:
            raise serializers.ValidationError("Invalid IP address format.")
        return value

    def to_representation(self, instance):
        return BlockedIPListSerializer(instance, context=self.context).data
