from django.contrib import admin

from apps.business_hours.models import (
    BusinessHours,
    Holiday,
    WorkingDay,
    WorkingInterval,
)


class WorkingIntervalInline(admin.TabularInline):
    model = WorkingInterval
    extra = 0
    fields = ["start_time", "end_time", "sort_order"]


class WorkingDayInline(admin.TabularInline):
    model = WorkingDay
    extra = 0
    fields = ["day_of_week", "is_working"]
    show_change_link = True


class HolidayInline(admin.TabularInline):
    model = Holiday
    extra = 0
    fields = ["date", "name"]


@admin.register(BusinessHours)
class BusinessHoursAdmin(admin.ModelAdmin):
    list_display = ["name", "timezone", "is_default", "is_active", "created_at"]
    list_filter = ["is_default", "is_active"]
    search_fields = ["name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [WorkingDayInline, HolidayInline]


@admin.register(WorkingDay)
class WorkingDayAdmin(admin.ModelAdmin):
    list_display = ["business_hours", "day_of_week", "is_working"]
    list_filter = ["day_of_week", "is_working"]
    list_select_related = ["business_hours"]
    inlines = [WorkingIntervalInline]
