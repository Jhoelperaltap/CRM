"""
Serializers for Portal Administration.
"""

from rest_framework import serializers

from apps.contacts.models import Contact
from apps.portal.models_admin import (
    PortalAdminLog,
    PortalClientConfig,
    PortalImpersonationToken,
    PortalModulePreset,
    PortalSession,
)

# -----------------------------------------------------------------------
# Module Presets
# -----------------------------------------------------------------------


class PortalModulePresetSerializer(serializers.ModelSerializer):
    """Serializer for module presets."""

    enabled_modules = serializers.SerializerMethodField()

    class Meta:
        model = PortalModulePreset
        fields = [
            "id",
            "name",
            "description",
            "module_dashboard",
            "module_billing",
            "module_messages",
            "module_documents",
            "module_cases",
            "module_rentals",
            "module_buildings",
            "module_appointments",
            "is_system",
            "is_default",
            "enabled_modules",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]

    def get_enabled_modules(self, obj) -> list[str]:
        return obj.get_enabled_modules()


class PortalModulePresetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating presets."""

    class Meta:
        model = PortalModulePreset
        fields = [
            "name",
            "description",
            "module_dashboard",
            "module_billing",
            "module_messages",
            "module_documents",
            "module_cases",
            "module_rentals",
            "module_buildings",
            "module_appointments",
            "is_default",
        ]


# -----------------------------------------------------------------------
# Client Configuration
# -----------------------------------------------------------------------


class PortalClientConfigSerializer(serializers.ModelSerializer):
    """Serializer for client portal configuration."""

    preset_name = serializers.CharField(source="preset.name", read_only=True)
    enabled_modules = serializers.SerializerMethodField()

    class Meta:
        model = PortalClientConfig
        fields = [
            "id",
            "contact",
            "preset",
            "preset_name",
            "module_dashboard",
            "module_billing",
            "module_messages",
            "module_documents",
            "module_cases",
            "module_rentals",
            "module_buildings",
            "module_appointments",
            "is_portal_active",
            "last_login",
            "last_activity",
            "notes",
            "enabled_modules",
            # Licensing limits
            "max_buildings",
            "max_floors_per_building",
            "max_units_per_building",
            "max_rental_properties",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "contact", "last_login", "last_activity", "created_at", "updated_at"]

    def get_enabled_modules(self, obj) -> list[str]:
        return obj.get_enabled_modules()


class PortalClientConfigUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating client configuration."""

    class Meta:
        model = PortalClientConfig
        fields = [
            "module_dashboard",
            "module_billing",
            "module_messages",
            "module_documents",
            "module_cases",
            "module_rentals",
            "module_buildings",
            "module_appointments",
            "is_portal_active",
            "notes",
            # Licensing limits
            "max_buildings",
            "max_floors_per_building",
            "max_units_per_building",
            "max_rental_properties",
        ]


# -----------------------------------------------------------------------
# Client List
# -----------------------------------------------------------------------


class PortalClientListSerializer(serializers.ModelSerializer):
    """Serializer for listing portal clients."""

    contact_id = serializers.UUIDField(source="id")
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    has_portal_access = serializers.SerializerMethodField()
    portal_config = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "contact_id",
            "full_name",
            "email",
            "phone",
            "has_portal_access",
            "portal_config",
            "is_online",
            "created_at",
        ]

    def get_full_name(self, obj) -> str:
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_email(self, obj) -> str | None:
        return obj.email

    def get_phone(self, obj) -> str | None:
        return obj.phone

    def get_has_portal_access(self, obj) -> bool:
        return hasattr(obj, "portal_access") and obj.portal_access is not None

    def get_portal_config(self, obj) -> dict | None:
        if not hasattr(obj, "portal_config") or obj.portal_config is None:
            return None
        config = obj.portal_config
        return {
            "is_portal_active": config.is_portal_active,
            "enabled_modules": config.get_enabled_modules(),
            "last_login": config.last_login,
            "last_activity": config.last_activity,
            "preset_name": config.preset.name if config.preset else None,
        }

    def get_is_online(self, obj) -> bool:
        """Check if client has active session in last 15 minutes."""
        from datetime import timedelta

        from django.utils import timezone

        if not hasattr(obj, "portal_sessions"):
            return False

        threshold = timezone.now() - timedelta(minutes=15)
        return obj.portal_sessions.filter(
            is_active=True,
            last_activity__gte=threshold,
        ).exists()


class PortalClientDetailSerializer(PortalClientListSerializer):
    """Detailed serializer for a single portal client."""

    active_sessions = serializers.SerializerMethodField()
    portal_access_email = serializers.SerializerMethodField()

    class Meta(PortalClientListSerializer.Meta):
        fields = PortalClientListSerializer.Meta.fields + [
            "active_sessions",
            "portal_access_email",
        ]

    def get_active_sessions(self, obj) -> list[dict]:
        if not hasattr(obj, "portal_sessions"):
            return []
        sessions = obj.portal_sessions.filter(is_active=True)[:5]
        return [
            {
                "id": str(s.id),
                "ip_address": s.ip_address,
                "user_agent": s.user_agent[:100] if s.user_agent else None,
                "last_activity": s.last_activity,
                "created_at": s.created_at,
            }
            for s in sessions
        ]

    def get_portal_access_email(self, obj) -> str | None:
        if hasattr(obj, "portal_access") and obj.portal_access:
            return obj.portal_access.email
        return None


# -----------------------------------------------------------------------
# Sessions
# -----------------------------------------------------------------------


class PortalSessionSerializer(serializers.ModelSerializer):
    """Serializer for portal sessions."""

    class Meta:
        model = PortalSession
        fields = [
            "id",
            "contact",
            "session_key",
            "ip_address",
            "user_agent",
            "is_active",
            "last_activity",
            "logged_out_at",
            "created_at",
        ]
        read_only_fields = fields


# -----------------------------------------------------------------------
# Admin Logs
# -----------------------------------------------------------------------


class PortalAdminLogSerializer(serializers.ModelSerializer):
    """Serializer for admin audit logs."""

    admin_user_name = serializers.SerializerMethodField()
    admin_user_email = serializers.CharField(source="admin_user.email", read_only=True)
    contact_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = PortalAdminLog
        fields = [
            "id",
            "admin_user",
            "admin_user_name",
            "admin_user_email",
            "contact",
            "contact_name",
            "action",
            "action_display",
            "details",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields

    def get_admin_user_name(self, obj) -> str:
        return f"{obj.admin_user.first_name} {obj.admin_user.last_name}".strip()

    def get_contact_name(self, obj) -> str:
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()


# -----------------------------------------------------------------------
# Impersonation
# -----------------------------------------------------------------------


class PortalImpersonationTokenSerializer(serializers.ModelSerializer):
    """Serializer for impersonation tokens."""

    admin_user_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    remaining_minutes = serializers.IntegerField(source="get_remaining_minutes", read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = PortalImpersonationToken
        fields = [
            "id",
            "admin_user",
            "admin_user_name",
            "contact",
            "contact_name",
            "token",
            "expires_at",
            "is_active",
            "is_valid",
            "remaining_minutes",
            "ended_at",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields

    def get_admin_user_name(self, obj) -> str:
        return f"{obj.admin_user.first_name} {obj.admin_user.last_name}".strip()

    def get_contact_name(self, obj) -> str:
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()


class ImpersonationStartSerializer(serializers.Serializer):
    """Response serializer for starting impersonation."""

    token = serializers.CharField()
    expires_at = serializers.DateTimeField()
    remaining_minutes = serializers.IntegerField()
    contact_id = serializers.UUIDField()
    contact_name = serializers.CharField()
    portal_url = serializers.CharField()


# -----------------------------------------------------------------------
# Statistics
# -----------------------------------------------------------------------


class PortalAdminStatsSerializer(serializers.Serializer):
    """Serializer for portal admin statistics."""

    total_clients = serializers.IntegerField()
    clients_with_access = serializers.IntegerField()
    active_clients = serializers.IntegerField()
    online_now = serializers.IntegerField()
    inactive_30_days = serializers.IntegerField()
