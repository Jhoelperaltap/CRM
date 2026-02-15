from rest_framework import serializers

from .models import (
    AutomationEnrollment,
    AutomationSequence,
    AutomationStep,
    AutomationStepLog,
    Campaign,
    CampaignLink,
    CampaignRecipient,
    CampaignTemplate,
    EmailList,
    EmailListSubscriber,
)


class EmailListSerializer(serializers.ModelSerializer):
    subscriber_count = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = EmailList
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "is_dynamic",
            "filter_criteria",
            "subscriber_count",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class EmailListSubscriberSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    contact_email = serializers.CharField(source="contact.email", read_only=True)

    class Meta:
        model = EmailListSubscriber
        fields = [
            "id",
            "email_list",
            "contact",
            "contact_name",
            "contact_email",
            "is_subscribed",
            "subscribed_at",
            "unsubscribed_at",
            "source",
            "created_at",
        ]
        read_only_fields = ["id", "subscribed_at", "unsubscribed_at", "created_at"]


class CampaignTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = CampaignTemplate
        fields = [
            "id",
            "name",
            "description",
            "subject",
            "preview_text",
            "html_content",
            "text_content",
            "category",
            "is_active",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class CampaignListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    open_rate = serializers.ReadOnlyField()
    click_rate = serializers.ReadOnlyField()

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "campaign_type",
            "status",
            "subject",
            "total_recipients",
            "total_sent",
            "total_opened",
            "total_clicked",
            "open_rate",
            "click_rate",
            "scheduled_at",
            "sent_at",
            "created_by_name",
            "created_at",
        ]


class CampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    open_rate = serializers.ReadOnlyField()
    click_rate = serializers.ReadOnlyField()
    bounce_rate = serializers.ReadOnlyField()
    email_list_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=EmailList.objects.all(),
        source="email_lists",
        required=False,
    )

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "description",
            "campaign_type",
            "status",
            "subject",
            "preview_text",
            "from_name",
            "from_email",
            "reply_to",
            "html_content",
            "text_content",
            "template",
            "email_list_ids",
            "scheduled_at",
            "sent_at",
            "completed_at",
            "track_opens",
            "track_clicks",
            "is_ab_test",
            "ab_test_subject_b",
            "ab_test_content_b",
            "ab_test_split",
            "ab_test_winner_criteria",
            "total_recipients",
            "total_sent",
            "total_delivered",
            "total_opened",
            "total_clicked",
            "total_bounced",
            "total_unsubscribed",
            "total_complained",
            "open_rate",
            "click_rate",
            "bounce_rate",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "sent_at",
            "completed_at",
            "total_recipients",
            "total_sent",
            "total_delivered",
            "total_opened",
            "total_clicked",
            "total_bounced",
            "total_unsubscribed",
            "total_complained",
            "created_at",
            "updated_at",
        ]


class CampaignRecipientSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = CampaignRecipient
        fields = [
            "id",
            "campaign",
            "contact",
            "contact_name",
            "email",
            "status",
            "ab_variant",
            "sent_at",
            "delivered_at",
            "opened_at",
            "clicked_at",
            "bounced_at",
            "unsubscribed_at",
            "open_count",
            "click_count",
            "error_message",
            "bounce_type",
        ]
        read_only_fields = ["id", "tracking_token"]


class CampaignLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignLink
        fields = [
            "id",
            "campaign",
            "original_url",
            "tracking_url",
            "total_clicks",
            "unique_clicks",
        ]
        read_only_fields = ["id", "tracking_url", "total_clicks", "unique_clicks"]


class AutomationStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationStep
        fields = [
            "id",
            "sequence",
            "step_type",
            "order",
            "subject",
            "html_content",
            "text_content",
            "template",
            "wait_days",
            "wait_hours",
            "wait_minutes",
            "condition_field",
            "condition_operator",
            "condition_value",
            "tag_action",
            "tag_name",
            "target_list",
            "total_processed",
            "total_sent",
            "total_opened",
            "total_clicked",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_processed",
            "total_sent",
            "total_opened",
            "total_clicked",
            "created_at",
            "updated_at",
        ]


class AutomationSequenceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    step_count = serializers.SerializerMethodField()

    class Meta:
        model = AutomationSequence
        fields = [
            "id",
            "name",
            "is_active",
            "trigger_type",
            "total_enrolled",
            "total_completed",
            "total_unsubscribed",
            "step_count",
            "created_by_name",
            "created_at",
        ]

    def get_step_count(self, obj):
        return obj.steps.count()


class AutomationSequenceSerializer(serializers.ModelSerializer):
    steps = AutomationStepSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    email_list_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=EmailList.objects.all(),
        source="email_lists",
        required=False,
    )

    class Meta:
        model = AutomationSequence
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "trigger_type",
            "trigger_config",
            "email_list_ids",
            "from_name",
            "from_email",
            "reply_to",
            "total_enrolled",
            "total_completed",
            "total_unsubscribed",
            "steps",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_enrolled",
            "total_completed",
            "total_unsubscribed",
            "created_by",
            "created_at",
            "updated_at",
        ]


class AutomationEnrollmentSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    contact_email = serializers.CharField(source="contact.email", read_only=True)
    sequence_name = serializers.CharField(source="sequence.name", read_only=True)
    current_step_order = serializers.IntegerField(
        source="current_step.order", read_only=True
    )

    class Meta:
        model = AutomationEnrollment
        fields = [
            "id",
            "sequence",
            "sequence_name",
            "contact",
            "contact_name",
            "contact_email",
            "status",
            "current_step",
            "current_step_order",
            "enrolled_at",
            "completed_at",
            "next_step_at",
        ]
        read_only_fields = ["id", "enrolled_at", "completed_at"]


class AutomationStepLogSerializer(serializers.ModelSerializer):
    step_type = serializers.CharField(source="step.step_type", read_only=True)
    step_order = serializers.IntegerField(source="step.order", read_only=True)

    class Meta:
        model = AutomationStepLog
        fields = [
            "id",
            "enrollment",
            "step",
            "step_type",
            "step_order",
            "executed_at",
            "status",
            "email_sent",
            "email_opened",
            "email_clicked",
            "error_message",
        ]


class CampaignStatsSerializer(serializers.Serializer):
    """Serializer for campaign analytics."""

    total_campaigns = serializers.IntegerField()
    total_sent = serializers.IntegerField()
    total_opened = serializers.IntegerField()
    total_clicked = serializers.IntegerField()
    avg_open_rate = serializers.FloatField()
    avg_click_rate = serializers.FloatField()
    campaigns_by_status = serializers.DictField()
    campaigns_over_time = serializers.ListField()


class BulkSubscribeSerializer(serializers.Serializer):
    """Serializer for bulk subscribing contacts to a list."""

    contact_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    source = serializers.ChoiceField(
        choices=["manual", "import", "api"], default="manual"
    )
