"""
Serializers for Webforms.
"""

from django.db import transaction
from rest_framework import serializers

from apps.users.models import User

from .models import Webform, WebformField, WebformHiddenField, WebformRoundRobinUser


class WebformFieldSerializer(serializers.ModelSerializer):
    """Serializer for webform fields."""

    class Meta:
        model = WebformField
        fields = [
            "id",
            "field_name",
            "is_mandatory",
            "is_hidden",
            "override_value",
            "reference_field",
            "duplicate_handling",
            "sort_order",
        ]
        read_only_fields = ["id"]


class WebformHiddenFieldSerializer(serializers.ModelSerializer):
    """Serializer for hidden fields."""

    class Meta:
        model = WebformHiddenField
        fields = [
            "id",
            "field_name",
            "url_parameter",
            "override_value",
            "sort_order",
        ]
        read_only_fields = ["id"]


class WebformRoundRobinUserSerializer(serializers.ModelSerializer):
    """Serializer for round robin users."""

    user_name = serializers.SerializerMethodField()

    class Meta:
        model = WebformRoundRobinUser
        fields = ["id", "user", "user_name", "sort_order"]
        read_only_fields = ["id"]

    def get_user_name(self, obj):
        return obj.user.full_name if obj.user else None


class WebformListSerializer(serializers.ModelSerializer):
    """Serializer for webform list view."""

    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    field_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Webform
        fields = [
            "id",
            "name",
            "primary_module",
            "is_active",
            "captcha_enabled",
            "assigned_to",
            "assigned_to_name",
            "field_count",
            "created_by_name",
            "created_at",
        ]

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class WebformDetailSerializer(serializers.ModelSerializer):
    """Serializer for webform detail view."""

    fields = WebformFieldSerializer(many=True, read_only=True)
    hidden_fields = WebformHiddenFieldSerializer(many=True, read_only=True)
    round_robin_users = WebformRoundRobinUserSerializer(many=True, read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Webform
        fields = [
            "id",
            "name",
            "primary_module",
            "return_url",
            "description",
            "is_active",
            "captcha_enabled",
            "assigned_to",
            "assigned_to_name",
            "round_robin_enabled",
            "fields",
            "hidden_fields",
            "round_robin_users",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class WebformCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating webforms with nested data."""

    fields = WebformFieldSerializer(many=True, required=False)
    hidden_fields = WebformHiddenFieldSerializer(many=True, required=False)
    round_robin_user_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False, default=list
    )

    class Meta:
        model = Webform
        fields = [
            "id",
            "name",
            "primary_module",
            "return_url",
            "description",
            "is_active",
            "captcha_enabled",
            "assigned_to",
            "round_robin_enabled",
            "fields",
            "hidden_fields",
            "round_robin_user_ids",
        ]
        read_only_fields = ["id"]

    @transaction.atomic
    def create(self, validated_data):
        fields_data = validated_data.pop("fields", [])
        hidden_fields_data = validated_data.pop("hidden_fields", [])
        round_robin_user_ids = validated_data.pop("round_robin_user_ids", [])

        webform = Webform.objects.create(**validated_data)

        # Create fields
        for i, field_data in enumerate(fields_data):
            field_data["sort_order"] = field_data.get("sort_order", i)
            WebformField.objects.create(webform=webform, **field_data)

        # Create hidden fields
        for i, hidden_data in enumerate(hidden_fields_data):
            hidden_data["sort_order"] = hidden_data.get("sort_order", i)
            WebformHiddenField.objects.create(webform=webform, **hidden_data)

        # Create round robin users
        for i, user_id in enumerate(round_robin_user_ids):
            try:
                user = User.objects.get(id=user_id)
                WebformRoundRobinUser.objects.create(
                    webform=webform, user=user, sort_order=i
                )
            except User.DoesNotExist:
                pass

        return webform

    @transaction.atomic
    def update(self, instance, validated_data):
        fields_data = validated_data.pop("fields", None)
        hidden_fields_data = validated_data.pop("hidden_fields", None)
        round_robin_user_ids = validated_data.pop("round_robin_user_ids", None)

        # Update main fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update fields if provided
        if fields_data is not None:
            instance.fields.all().delete()
            for i, field_data in enumerate(fields_data):
                field_data["sort_order"] = field_data.get("sort_order", i)
                WebformField.objects.create(webform=instance, **field_data)

        # Update hidden fields if provided
        if hidden_fields_data is not None:
            instance.hidden_fields.all().delete()
            for i, hidden_data in enumerate(hidden_fields_data):
                hidden_data["sort_order"] = hidden_data.get("sort_order", i)
                WebformHiddenField.objects.create(webform=instance, **hidden_data)

        # Update round robin users if provided
        if round_robin_user_ids is not None:
            instance.round_robin_users.all().delete()
            for i, user_id in enumerate(round_robin_user_ids):
                try:
                    user = User.objects.get(id=user_id)
                    WebformRoundRobinUser.objects.create(
                        webform=instance, user=user, sort_order=i
                    )
                except User.DoesNotExist:
                    pass

        return instance

    def to_representation(self, instance):
        """Return detail serializer representation."""
        return WebformDetailSerializer(instance).data
