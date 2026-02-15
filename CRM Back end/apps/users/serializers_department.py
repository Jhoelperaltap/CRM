from rest_framework import serializers

from apps.users.models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for Department listing and detail views.
    Includes user count for admin display.
    """

    user_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "code",
            "description",
            "color",
            "icon",
            "is_active",
            "order",
            "user_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DepartmentCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating departments.
    """

    class Meta:
        model = Department
        fields = [
            "name",
            "code",
            "description",
            "color",
            "icon",
            "is_active",
            "order",
        ]

    def validate_code(self, value):
        """Ensure code is uppercase."""
        return value.upper()

    def to_representation(self, instance):
        return DepartmentSerializer(instance, context=self.context).data


class DepartmentSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight read-only representation for nested views.
    """

    class Meta:
        model = Department
        fields = ["id", "name", "code", "color", "icon"]
        read_only_fields = fields
