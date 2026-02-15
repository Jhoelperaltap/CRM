from rest_framework import serializers

from apps.emails.models import EmailAccount, EmailSettings, EmailSyncLog


class EmailAccountSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailAccount
        fields = [
            "id",
            "name",
            "email_address",
            "imap_host",
            "imap_port",
            "imap_use_ssl",
            "smtp_host",
            "smtp_port",
            "smtp_use_tls",
            "username",
            "password",
            "is_active",
            "last_sync_at",
            "sync_interval_minutes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_name",
            "last_sync_at",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class EmailSyncLogSerializer(serializers.ModelSerializer):
    account_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailSyncLog
        fields = [
            "id",
            "account",
            "account_name",
            "status",
            "messages_fetched",
            "error_message",
            "started_at",
            "completed_at",
        ]

    def get_account_name(self, obj):
        return str(obj.account) if obj.account else None


class EmailSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailSettings
        fields = [
            "server_type",
            "smtp_host",
            "smtp_port",
            "smtp_username",
            "smtp_password",
            "smtp_use_tls",
            "email_tracking_enabled",
            "include_email_footer",
            "email_footer_text",
            "case_reply_to",
            "case_allow_group_value",
            "case_bcc_address",
            "ticket_reply_to",
            "ticket_reply_to_address",
            "ticket_from_name",
            "ticket_bcc_address",
            "adhoc_reply_to",
            "sys_notif_from_name",
            "sys_notif_from_reply_to",
            "email_font_family",
            "email_font_size",
            "email_opt_in",
            "allow_adhoc_opted_out",
            "allow_workflow_opted_out",
            "auto_double_opt_in",
            "customer_notif_from_name",
            "customer_notif_from_email",
            "undo_send_enabled",
            "undo_send_duration",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
        extra_kwargs = {
            "smtp_password": {"write_only": True, "required": False},
        }
