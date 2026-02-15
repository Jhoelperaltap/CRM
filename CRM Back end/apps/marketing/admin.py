from django.contrib import admin
from .models import (
    EmailList,
    EmailListSubscriber,
    CampaignTemplate,
    Campaign,
    CampaignRecipient,
    CampaignLink,
    CampaignLinkClick,
    AutomationSequence,
    AutomationStep,
    AutomationEnrollment,
    AutomationStepLog,
)


@admin.register(EmailList)
class EmailListAdmin(admin.ModelAdmin):
    list_display = ["name", "subscriber_count", "is_active", "is_dynamic", "created_at"]
    list_filter = ["is_active", "is_dynamic", "created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(EmailListSubscriber)
class EmailListSubscriberAdmin(admin.ModelAdmin):
    list_display = ["contact", "email_list", "is_subscribed", "source", "subscribed_at"]
    list_filter = ["is_subscribed", "source", "email_list"]
    search_fields = ["contact__email", "contact__first_name", "contact__last_name"]
    raw_id_fields = ["contact", "email_list"]


@admin.register(CampaignTemplate)
class CampaignTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "is_active", "created_at"]
    list_filter = ["category", "is_active", "created_at"]
    search_fields = ["name", "subject"]


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "campaign_type",
        "status",
        "total_sent",
        "open_rate",
        "click_rate",
        "created_at",
    ]
    list_filter = ["status", "campaign_type", "created_at"]
    search_fields = ["name", "subject"]
    readonly_fields = [
        "total_recipients",
        "total_sent",
        "total_delivered",
        "total_opened",
        "total_clicked",
        "total_bounced",
        "total_unsubscribed",
        "total_complained",
        "sent_at",
        "completed_at",
        "created_at",
        "updated_at",
    ]
    filter_horizontal = ["email_lists"]


@admin.register(CampaignRecipient)
class CampaignRecipientAdmin(admin.ModelAdmin):
    list_display = ["email", "campaign", "status", "sent_at", "opened_at", "clicked_at"]
    list_filter = ["status", "campaign", "ab_variant"]
    search_fields = ["email", "contact__first_name", "contact__last_name"]
    raw_id_fields = ["campaign", "contact"]


@admin.register(CampaignLink)
class CampaignLinkAdmin(admin.ModelAdmin):
    list_display = ["original_url", "campaign", "total_clicks", "unique_clicks"]
    list_filter = ["campaign"]
    search_fields = ["original_url"]


@admin.register(AutomationSequence)
class AutomationSequenceAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "trigger_type",
        "is_active",
        "total_enrolled",
        "total_completed",
        "created_at",
    ]
    list_filter = ["is_active", "trigger_type", "created_at"]
    search_fields = ["name", "description"]
    filter_horizontal = ["email_lists"]


@admin.register(AutomationStep)
class AutomationStepAdmin(admin.ModelAdmin):
    list_display = ["sequence", "order", "step_type", "total_processed", "total_sent"]
    list_filter = ["step_type", "sequence"]
    ordering = ["sequence", "order"]


@admin.register(AutomationEnrollment)
class AutomationEnrollmentAdmin(admin.ModelAdmin):
    list_display = ["contact", "sequence", "status", "current_step", "enrolled_at"]
    list_filter = ["status", "sequence"]
    search_fields = ["contact__email", "contact__first_name"]
    raw_id_fields = ["contact", "sequence", "current_step"]


@admin.register(AutomationStepLog)
class AutomationStepLogAdmin(admin.ModelAdmin):
    list_display = [
        "enrollment",
        "step",
        "status",
        "email_sent",
        "email_opened",
        "executed_at",
    ]
    list_filter = ["status", "email_sent", "email_opened"]
