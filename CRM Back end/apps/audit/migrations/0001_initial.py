import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        # -----------------------------------------------------------------
        # AuditLog
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("create", "Create"),
                            ("update", "Update"),
                            ("delete", "Delete"),
                            ("view", "View"),
                        ],
                        db_index=True,
                        max_length=10,
                        verbose_name="action",
                    ),
                ),
                (
                    "module",
                    models.CharField(
                        db_index=True, max_length=50, verbose_name="module"
                    ),
                ),
                (
                    "object_id",
                    models.CharField(max_length=50, verbose_name="object ID"),
                ),
                (
                    "object_repr",
                    models.CharField(
                        max_length=255, verbose_name="object representation"
                    ),
                ),
                (
                    "changes",
                    models.JSONField(blank=True, default=dict, verbose_name="changes"),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(
                        blank=True, null=True, verbose_name="IP address"
                    ),
                ),
                (
                    "user_agent",
                    models.TextField(blank=True, default="", verbose_name="user agent"),
                ),
                (
                    "request_path",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=500,
                        verbose_name="request path",
                    ),
                ),
                (
                    "timestamp",
                    models.DateTimeField(
                        auto_now_add=True, db_index=True, verbose_name="timestamp"
                    ),
                ),
            ],
            options={
                "db_table": "crm_audit_logs",
                "ordering": ["-timestamp"],
                "verbose_name": "audit log",
                "verbose_name_plural": "audit logs",
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(
                fields=["module", "object_id"],
                name="audit_auditl_module_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(
                fields=["user", "timestamp"],
                name="audit_auditl_user_ts_idx",
            ),
        ),
        # -----------------------------------------------------------------
        # LoginHistory
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="LoginHistory",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="login_history",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "email_attempted",
                    models.EmailField(max_length=254, verbose_name="email attempted"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("success", "Success"),
                            ("failed", "Failed"),
                            ("blocked", "Blocked"),
                        ],
                        db_index=True,
                        max_length=10,
                        verbose_name="status",
                    ),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(
                        blank=True, null=True, verbose_name="IP address"
                    ),
                ),
                (
                    "user_agent",
                    models.TextField(blank=True, default="", verbose_name="user agent"),
                ),
                (
                    "failure_reason",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=255,
                        verbose_name="failure reason",
                    ),
                ),
                (
                    "timestamp",
                    models.DateTimeField(
                        auto_now_add=True, db_index=True, verbose_name="timestamp"
                    ),
                ),
            ],
            options={
                "db_table": "crm_login_history",
                "ordering": ["-timestamp"],
                "verbose_name": "login history",
                "verbose_name_plural": "login histories",
            },
        ),
        migrations.AddIndex(
            model_name="loginhistory",
            index=models.Index(
                fields=["user", "timestamp"],
                name="audit_loginh_user_ts_idx",
            ),
        ),
        # -----------------------------------------------------------------
        # SettingsLog
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="SettingsLog",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="settings_logs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                (
                    "setting_area",
                    models.CharField(max_length=100, verbose_name="setting area"),
                ),
                (
                    "setting_key",
                    models.CharField(max_length=100, verbose_name="setting key"),
                ),
                (
                    "old_value",
                    models.JSONField(
                        blank=True, default=dict, verbose_name="old value"
                    ),
                ),
                (
                    "new_value",
                    models.JSONField(
                        blank=True, default=dict, verbose_name="new value"
                    ),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(
                        blank=True, null=True, verbose_name="IP address"
                    ),
                ),
                (
                    "user_agent",
                    models.TextField(blank=True, default="", verbose_name="user agent"),
                ),
                (
                    "timestamp",
                    models.DateTimeField(
                        auto_now_add=True, db_index=True, verbose_name="timestamp"
                    ),
                ),
            ],
            options={
                "db_table": "crm_settings_logs",
                "ordering": ["-timestamp"],
                "verbose_name": "settings log",
                "verbose_name_plural": "settings logs",
            },
        ),
        # -----------------------------------------------------------------
        # EncryptedFieldAccessLog
        # -----------------------------------------------------------------
        migrations.CreateModel(
            name="EncryptedFieldAccessLog",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pii_access_logs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
                ("module", models.CharField(max_length=50, verbose_name="module")),
                (
                    "object_id",
                    models.CharField(max_length=50, verbose_name="object ID"),
                ),
                (
                    "field_name",
                    models.CharField(max_length=100, verbose_name="field name"),
                ),
                (
                    "access_type",
                    models.CharField(
                        choices=[("view", "View"), ("export", "Export")],
                        max_length=10,
                        verbose_name="access type",
                    ),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(
                        blank=True, null=True, verbose_name="IP address"
                    ),
                ),
                (
                    "timestamp",
                    models.DateTimeField(
                        auto_now_add=True, db_index=True, verbose_name="timestamp"
                    ),
                ),
            ],
            options={
                "db_table": "crm_encrypted_field_access_logs",
                "ordering": ["-timestamp"],
                "verbose_name": "encrypted field access log",
                "verbose_name_plural": "encrypted field access logs",
            },
        ),
        migrations.AddIndex(
            model_name="encryptedFieldAccessLog",
            index=models.Index(
                fields=["module", "object_id"],
                name="audit_pii_module_obj_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="encryptedFieldAccessLog",
            index=models.Index(
                fields=["user", "timestamp"],
                name="audit_pii_user_ts_idx",
            ),
        ),
    ]
