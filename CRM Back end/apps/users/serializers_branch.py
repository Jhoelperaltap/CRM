from rest_framework import serializers

from apps.users.branch_models import Branch


class BranchListSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id", "name", "code", "city", "state", "phone",
            "is_active", "is_headquarters", "user_count", "created_at",
        ]
        read_only_fields = ["id", "user_count", "created_at"]

    def get_user_count(self, obj):
        return obj.users.count()


class BranchDetailSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id", "name", "code", "address", "city", "state",
            "zip_code", "phone", "is_active", "is_headquarters",
            "user_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user_count", "created_at", "updated_at"]

    def get_user_count(self, obj):
        return obj.users.count()


class BranchCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            "name", "code", "address", "city", "state",
            "zip_code", "phone", "is_active", "is_headquarters",
        ]

    def to_representation(self, instance):
        return BranchDetailSerializer(instance).data
