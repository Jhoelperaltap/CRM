from rest_framework import serializers

from apps.cases.checklist_models import (
    CaseChecklist,
    CaseChecklistItem,
    ChecklistTemplate,
    ChecklistTemplateItem,
)


# ---------------------------------------------------------------------------
# Template serializers (admin settings)
# ---------------------------------------------------------------------------

class ChecklistTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistTemplateItem
        fields = [
            "id",
            "title",
            "description",
            "doc_type",
            "sort_order",
            "is_required",
        ]
        read_only_fields = ["id"]


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    items = ChecklistTemplateItemSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            "id",
            "name",
            "case_type",
            "tax_year",
            "is_active",
            "created_by",
            "created_by_name",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class ChecklistTemplateListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            "id",
            "name",
            "case_type",
            "tax_year",
            "is_active",
            "item_count",
            "created_at",
        ]

    def get_item_count(self, obj):
        return obj.items.count()


# ---------------------------------------------------------------------------
# Case checklist serializers
# ---------------------------------------------------------------------------

class CaseChecklistItemSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CaseChecklistItem
        fields = [
            "id",
            "title",
            "description",
            "is_completed",
            "completed_by",
            "completed_by_name",
            "completed_at",
            "doc_type",
            "linked_document",
            "sort_order",
            "is_required",
        ]
        read_only_fields = [
            "id",
            "completed_by",
            "completed_by_name",
            "completed_at",
            "linked_document",
        ]

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return obj.completed_by.get_full_name()
        return None


class CaseChecklistSerializer(serializers.ModelSerializer):
    items = CaseChecklistItemSerializer(many=True, read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    template_name = serializers.SerializerMethodField()

    class Meta:
        model = CaseChecklist
        fields = [
            "id",
            "case",
            "template",
            "template_name",
            "completed_count",
            "total_count",
            "progress_percent",
            "items",
        ]
        read_only_fields = fields

    def get_template_name(self, obj):
        return str(obj.template) if obj.template else None
