from django.contrib import admin

from apps.forecasts.models import ForecastEntry, SalesQuota


@admin.register(SalesQuota)
class SalesQuotaAdmin(admin.ModelAdmin):
    list_display = ["user", "fiscal_year", "quarter", "amount", "set_by", "created_at"]
    list_filter = ["fiscal_year", "quarter"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    raw_id_fields = ["user", "set_by"]


@admin.register(ForecastEntry)
class ForecastEntryAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "fiscal_year",
        "quarter",
        "pipeline",
        "best_case",
        "commit",
        "created_at",
    ]
    list_filter = ["fiscal_year", "quarter"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    raw_id_fields = ["user"]
