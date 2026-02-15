from django.db import transaction
from rest_framework import serializers

from apps.portal.models import (
    PortalConfiguration,
    PortalMenuItem,
    PortalModuleFieldConfig,
    PortalShortcut,
)

# ── Nested Serializers ──────────────────────────────────────────────


class PortalMenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalMenuItem
        fields = [
            "id",
            "module_name",
            "label",
            "is_enabled",
            "sort_order",
        ]
        read_only_fields = ["id"]


class PortalShortcutSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalShortcut
        fields = [
            "id",
            "shortcut_type",
            "label",
            "custom_url",
            "is_enabled",
            "sort_order",
        ]
        read_only_fields = ["id"]


class PortalModuleFieldConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalModuleFieldConfig
        fields = [
            "id",
            "module_name",
            "field_name",
            "field_label",
            "permission",
            "is_mandatory",
            "sort_order",
        ]
        read_only_fields = ["id"]


# ── Detail Serializer ───────────────────────────────────────────────


class PortalConfigurationDetailSerializer(serializers.ModelSerializer):
    menu_items = PortalMenuItemSerializer(many=True, read_only=True)
    shortcuts = PortalShortcutSerializer(many=True, read_only=True)
    field_configs = PortalModuleFieldConfigSerializer(many=True, read_only=True)
    default_assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = PortalConfiguration
        fields = [
            "id",
            "portal_url",
            "default_assignee",
            "default_assignee_name",
            "support_notification_days",
            "login_details_template",
            "forgot_password_template",
            "custom_css_url",
            "default_scope",
            "session_timeout_hours",
            "announcement_html",
            "greeting_type",
            "account_rep_widget_enabled",
            "recent_documents_widget_enabled",
            "recent_faq_widget_enabled",
            "recent_cases_widget_enabled",
            "chart_open_cases_priority",
            "chart_cases_resolution_time",
            "chart_projects_by_status",
            "is_active",
            "menu_items",
            "shortcuts",
            "field_configs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_default_assignee_name(self, obj):
        if obj.default_assignee:
            return obj.default_assignee.get_full_name()
        return None


# ── Create/Update Serializer ────────────────────────────────────────


class PortalMenuItemInputSerializer(serializers.Serializer):
    module_name = serializers.CharField(max_length=100)
    label = serializers.CharField(max_length=100)
    is_enabled = serializers.BooleanField(default=True)
    sort_order = serializers.IntegerField(default=0)


class PortalShortcutInputSerializer(serializers.Serializer):
    shortcut_type = serializers.ChoiceField(choices=PortalShortcut.ShortcutType.choices)
    label = serializers.CharField(max_length=100)
    custom_url = serializers.CharField(max_length=500, required=False, allow_blank=True)
    is_enabled = serializers.BooleanField(default=True)
    sort_order = serializers.IntegerField(default=0)


class PortalFieldConfigInputSerializer(serializers.Serializer):
    module_name = serializers.CharField(max_length=100)
    field_name = serializers.CharField(max_length=100)
    field_label = serializers.CharField(max_length=100)
    permission = serializers.ChoiceField(
        choices=PortalModuleFieldConfig.Permission.choices
    )
    is_mandatory = serializers.BooleanField(default=False)
    sort_order = serializers.IntegerField(default=0)


class PortalConfigurationCreateUpdateSerializer(serializers.ModelSerializer):
    menu_items = PortalMenuItemInputSerializer(many=True, required=False)
    shortcuts = PortalShortcutInputSerializer(many=True, required=False)
    field_configs = PortalFieldConfigInputSerializer(many=True, required=False)

    class Meta:
        model = PortalConfiguration
        fields = [
            "portal_url",
            "default_assignee",
            "support_notification_days",
            "login_details_template",
            "forgot_password_template",
            "custom_css_url",
            "default_scope",
            "session_timeout_hours",
            "announcement_html",
            "greeting_type",
            "account_rep_widget_enabled",
            "recent_documents_widget_enabled",
            "recent_faq_widget_enabled",
            "recent_cases_widget_enabled",
            "chart_open_cases_priority",
            "chart_cases_resolution_time",
            "chart_projects_by_status",
            "is_active",
            "menu_items",
            "shortcuts",
            "field_configs",
        ]

    @staticmethod
    def _save_menu_items(config, items_data):
        PortalMenuItem.objects.filter(configuration=config).delete()
        for idx, item in enumerate(items_data):
            PortalMenuItem.objects.create(
                configuration=config,
                module_name=item["module_name"],
                label=item["label"],
                is_enabled=item.get("is_enabled", True),
                sort_order=item.get("sort_order", idx),
            )

    @staticmethod
    def _save_shortcuts(config, shortcuts_data):
        PortalShortcut.objects.filter(configuration=config).delete()
        for idx, shortcut in enumerate(shortcuts_data):
            PortalShortcut.objects.create(
                configuration=config,
                shortcut_type=shortcut["shortcut_type"],
                label=shortcut["label"],
                custom_url=shortcut.get("custom_url", ""),
                is_enabled=shortcut.get("is_enabled", True),
                sort_order=shortcut.get("sort_order", idx),
            )

    @staticmethod
    def _save_field_configs(config, configs_data):
        PortalModuleFieldConfig.objects.filter(configuration=config).delete()
        for idx, cfg in enumerate(configs_data):
            PortalModuleFieldConfig.objects.create(
                configuration=config,
                module_name=cfg["module_name"],
                field_name=cfg["field_name"],
                field_label=cfg["field_label"],
                permission=cfg["permission"],
                is_mandatory=cfg.get("is_mandatory", False),
                sort_order=cfg.get("sort_order", idx),
            )

    @transaction.atomic
    def create(self, validated_data):
        menu_items_data = validated_data.pop("menu_items", [])
        shortcuts_data = validated_data.pop("shortcuts", [])
        field_configs_data = validated_data.pop("field_configs", [])

        config = PortalConfiguration.objects.create(**validated_data)

        self._save_menu_items(config, menu_items_data)
        self._save_shortcuts(config, shortcuts_data)
        self._save_field_configs(config, field_configs_data)

        return config

    @transaction.atomic
    def update(self, instance, validated_data):
        menu_items_data = validated_data.pop("menu_items", None)
        shortcuts_data = validated_data.pop("shortcuts", None)
        field_configs_data = validated_data.pop("field_configs", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if menu_items_data is not None:
            self._save_menu_items(instance, menu_items_data)
        if shortcuts_data is not None:
            self._save_shortcuts(instance, shortcuts_data)
        if field_configs_data is not None:
            self._save_field_configs(instance, field_configs_data)

        return instance

    def to_representation(self, instance):
        return PortalConfigurationDetailSerializer(instance, context=self.context).data
