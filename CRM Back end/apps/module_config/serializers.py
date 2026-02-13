from rest_framework import serializers

from apps.module_config.models import (
    CRMModule,
    CustomField,
    FieldLabel,
    Picklist,
    PicklistValue,
)


# ---------------------------------------------------------------------------
# CRM Module
# ---------------------------------------------------------------------------
class CRMModuleListSerializer(serializers.ModelSerializer):
    custom_fields_count = serializers.IntegerField(
        source="custom_fields.count", read_only=True
    )

    class Meta:
        model = CRMModule
        fields = [
            "id",
            "name",
            "label",
            "label_plural",
            "icon",
            "description",
            "is_active",
            "sort_order",
            "number_prefix",
            "custom_fields_count",
        ]
        read_only_fields = fields


class CRMModuleDetailSerializer(serializers.ModelSerializer):
    custom_fields_count = serializers.IntegerField(
        source="custom_fields.count", read_only=True
    )

    class Meta:
        model = CRMModule
        fields = [
            "id",
            "name",
            "label",
            "label_plural",
            "icon",
            "description",
            "is_active",
            "sort_order",
            "number_prefix",
            "number_format",
            "number_reset_period",
            "number_next_seq",
            "default_fields",
            "custom_fields_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "name",
            "custom_fields_count",
            "created_at",
            "updated_at",
        ]


class CRMModuleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMModule
        fields = [
            "label",
            "label_plural",
            "icon",
            "description",
            "is_active",
            "sort_order",
            "number_prefix",
            "number_format",
            "number_reset_period",
            "number_next_seq",
            "default_fields",
        ]

    def to_representation(self, instance):
        return CRMModuleDetailSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Custom Field
# ---------------------------------------------------------------------------
class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = [
            "id",
            "module",
            "field_name",
            "label",
            "field_type",
            "is_required",
            "is_active",
            "default_value",
            "placeholder",
            "help_text",
            "options",
            "validation_rules",
            "sort_order",
            "section",
            "visible_to_roles",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "module", "created_at", "updated_at"]


class CustomFieldWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = [
            "field_name",
            "label",
            "field_type",
            "is_required",
            "is_active",
            "default_value",
            "placeholder",
            "help_text",
            "options",
            "validation_rules",
            "sort_order",
            "section",
            "visible_to_roles",
        ]

    def validate_field_name(self, value):
        # Ensure slug-like format
        if not value.replace("_", "").replace("-", "").isalnum():
            raise serializers.ValidationError(
                "Field name must contain only letters, numbers, hyphens, and underscores."
            )
        return value.lower().replace("-", "_")

    def validate(self, data):
        field_type = data.get("field_type", "")
        if field_type in ("select", "multiselect"):
            options = data.get("options", [])
            if not options:
                raise serializers.ValidationError(
                    {"options": "Select fields must have at least one option."}
                )
        return data

    def to_representation(self, instance):
        return CustomFieldSerializer(instance, context=self.context).data


class CustomFieldReorderSerializer(serializers.Serializer):
    field_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="Ordered list of custom field IDs.",
    )


# ---------------------------------------------------------------------------
# Picklist Value
# ---------------------------------------------------------------------------
class PicklistValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = PicklistValue
        fields = [
            "id",
            "value",
            "label",
            "sort_order",
            "is_default",
            "is_active",
            "color",
            "description",
        ]
        read_only_fields = ["id"]


class PicklistValueWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PicklistValue
        fields = [
            "value",
            "label",
            "sort_order",
            "is_default",
            "is_active",
            "color",
            "description",
        ]

    def to_representation(self, instance):
        return PicklistValueSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Picklist
# ---------------------------------------------------------------------------
class PicklistSerializer(serializers.ModelSerializer):
    values = PicklistValueSerializer(many=True, read_only=True)
    module_name = serializers.CharField(
        source="module.name", read_only=True, default=None
    )

    class Meta:
        model = Picklist
        fields = [
            "id",
            "name",
            "label",
            "module",
            "module_name",
            "is_system",
            "description",
            "values",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]


class PicklistWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Picklist
        fields = [
            "name",
            "label",
            "module",
            "description",
        ]

    def validate_name(self, value):
        if not value.replace("_", "").isalnum():
            raise serializers.ValidationError(
                "Picklist name must contain only letters, numbers, and underscores."
            )
        return value.lower()

    def to_representation(self, instance):
        return PicklistSerializer(instance, context=self.context).data


class PicklistValueReorderSerializer(serializers.Serializer):
    value_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="Ordered list of picklist value IDs.",
    )


# ---------------------------------------------------------------------------
# Field Label
# ---------------------------------------------------------------------------
class FieldLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldLabel
        fields = [
            "id",
            "module",
            "field_name",
            "language",
            "custom_label",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "module", "created_at", "updated_at"]


class FieldLabelWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldLabel
        fields = [
            "field_name",
            "language",
            "custom_label",
        ]

    def to_representation(self, instance):
        return FieldLabelSerializer(instance, context=self.context).data
