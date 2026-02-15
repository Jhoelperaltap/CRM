from rest_framework import serializers

from apps.approvals.models import Approval, ApprovalAction, ApprovalRule

# ── Action ──────────────────────────────────────────────────────────────


class ApprovalActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalAction
        fields = [
            "id",
            "phase",
            "action_type",
            "action_title",
            "action_config",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ── Rule ────────────────────────────────────────────────────────────────


class ApprovalRuleSerializer(serializers.ModelSerializer):
    owner_profile_ids = serializers.PrimaryKeyRelatedField(
        source="owner_profiles",
        many=True,
        read_only=True,
    )
    approver_ids = serializers.PrimaryKeyRelatedField(
        source="approvers",
        many=True,
        read_only=True,
    )

    class Meta:
        model = ApprovalRule
        fields = [
            "id",
            "rule_number",
            "conditions",
            "owner_profile_ids",
            "approver_ids",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ── Approval List ───────────────────────────────────────────────────────


class ApprovalListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    rule_count = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = [
            "id",
            "name",
            "module",
            "is_active",
            "trigger",
            "apply_on",
            "created_by",
            "created_by_name",
            "rule_count",
            "created_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return ""

    def get_rule_count(self, obj):
        return obj.rules.count()


# ── Approval Detail ─────────────────────────────────────────────────────


class ApprovalDetailSerializer(serializers.ModelSerializer):
    rules = ApprovalRuleSerializer(many=True, read_only=True)
    actions = ApprovalActionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = [
            "id",
            "name",
            "module",
            "is_active",
            "description",
            "trigger",
            "entry_criteria_all",
            "entry_criteria_any",
            "apply_on",
            "rules",
            "actions",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return ""


# ── Approval Create/Update ──────────────────────────────────────────────


class ApprovalRuleWriteSerializer(serializers.Serializer):
    rule_number = serializers.IntegerField(default=1)
    conditions = serializers.JSONField(default=list)
    owner_profile_ids = serializers.ListField(
        child=serializers.UUIDField(), default=list
    )
    approver_ids = serializers.ListField(child=serializers.UUIDField(), default=list)


class ApprovalActionWriteSerializer(serializers.Serializer):
    phase = serializers.ChoiceField(choices=ApprovalAction.Phase.choices)
    action_type = serializers.ChoiceField(choices=ApprovalAction.ActionType.choices)
    action_title = serializers.CharField(max_length=255)
    action_config = serializers.JSONField(default=dict)
    is_active = serializers.BooleanField(default=True)


class ApprovalCreateUpdateSerializer(serializers.ModelSerializer):
    rules = ApprovalRuleWriteSerializer(many=True, required=False, default=list)
    actions = ApprovalActionWriteSerializer(many=True, required=False, default=list)

    class Meta:
        model = Approval
        fields = [
            "name",
            "module",
            "is_active",
            "description",
            "trigger",
            "entry_criteria_all",
            "entry_criteria_any",
            "apply_on",
            "rules",
            "actions",
        ]

    def _save_rules(self, approval, rules_data):
        from apps.users.models import Role, User

        approval.rules.all().delete()
        for rule_data in rules_data:
            profile_ids = rule_data.pop("owner_profile_ids", [])
            approver_ids = rule_data.pop("approver_ids", [])
            rule = ApprovalRule.objects.create(approval=approval, **rule_data)
            if profile_ids:
                rule.owner_profiles.set(Role.objects.filter(id__in=profile_ids))
            if approver_ids:
                rule.approvers.set(User.objects.filter(id__in=approver_ids))

    def _save_actions(self, approval, actions_data):
        approval.actions.all().delete()
        for action_data in actions_data:
            ApprovalAction.objects.create(approval=approval, **action_data)

    def create(self, validated_data):
        rules_data = validated_data.pop("rules", [])
        actions_data = validated_data.pop("actions", [])
        validated_data["created_by"] = self.context["request"].user
        approval = Approval.objects.create(**validated_data)
        self._save_rules(approval, rules_data)
        self._save_actions(approval, actions_data)
        return approval

    def update(self, instance, validated_data):
        rules_data = validated_data.pop("rules", None)
        actions_data = validated_data.pop("actions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if rules_data is not None:
            self._save_rules(instance, rules_data)
        if actions_data is not None:
            self._save_actions(instance, actions_data)
        return instance
