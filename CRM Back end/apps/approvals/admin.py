from django.contrib import admin

from apps.approvals.models import Approval, ApprovalAction, ApprovalRule


class ApprovalRuleInline(admin.TabularInline):
    model = ApprovalRule
    extra = 0


class ApprovalActionInline(admin.TabularInline):
    model = ApprovalAction
    extra = 0


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "module",
        "is_active",
        "trigger",
        "apply_on",
        "created_by",
        "created_at",
    ]
    list_filter = ["module", "is_active", "trigger"]
    search_fields = ["name", "description"]
    raw_id_fields = ["created_by"]
    inlines = [ApprovalRuleInline, ApprovalActionInline]
