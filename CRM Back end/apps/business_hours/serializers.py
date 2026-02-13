from django.db import transaction
from rest_framework import serializers

from apps.business_hours.models import (
    BusinessHours,
    WorkingDay,
    WorkingInterval,
    Holiday,
)


# ── Nested serializers ──────────────────────────────────────────────


class WorkingIntervalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkingInterval
        fields = ["id", "start_time", "end_time", "sort_order"]
        read_only_fields = ["id"]


class WorkingDaySerializer(serializers.ModelSerializer):
    intervals = WorkingIntervalSerializer(many=True, read_only=True)
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = WorkingDay
        fields = ["id", "day_of_week", "day_name", "is_working", "intervals"]
        read_only_fields = ["id"]


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ["id", "date", "name"]
        read_only_fields = ["id"]


# ── List serializer ─────────────────────────────────────────────────


class BusinessHoursListSerializer(serializers.ModelSerializer):
    working_day_count = serializers.IntegerField(read_only=True)
    holiday_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = BusinessHours
        fields = [
            "id",
            "name",
            "timezone",
            "is_default",
            "is_active",
            "working_day_count",
            "holiday_count",
            "created_at",
        ]
        read_only_fields = fields


# ── Detail serializer ───────────────────────────────────────────────


class BusinessHoursDetailSerializer(serializers.ModelSerializer):
    working_days = WorkingDaySerializer(many=True, read_only=True)
    holidays = HolidaySerializer(many=True, read_only=True)

    class Meta:
        model = BusinessHours
        fields = [
            "id",
            "name",
            "timezone",
            "is_default",
            "is_active",
            "working_days",
            "holidays",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ── Create / Update serializer ──────────────────────────────────────


class WorkingDayInputSerializer(serializers.Serializer):
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    is_working = serializers.BooleanField(default=True)
    intervals = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )


class HolidayInputSerializer(serializers.Serializer):
    date = serializers.DateField()
    name = serializers.CharField(max_length=255)


class BusinessHoursCreateUpdateSerializer(serializers.ModelSerializer):
    working_days = WorkingDayInputSerializer(many=True, required=False)
    holidays = HolidayInputSerializer(many=True, required=False)

    class Meta:
        model = BusinessHours
        fields = [
            "name",
            "timezone",
            "is_default",
            "is_active",
            "working_days",
            "holidays",
        ]

    @staticmethod
    def _save_working_days(business_hours, working_days_data):
        # Delete existing working days
        WorkingDay.objects.filter(business_hours=business_hours).delete()

        for wd_data in working_days_data:
            intervals_data = wd_data.pop("intervals", [])
            working_day = WorkingDay.objects.create(
                business_hours=business_hours,
                day_of_week=wd_data["day_of_week"],
                is_working=wd_data.get("is_working", True),
            )
            for idx, interval in enumerate(intervals_data):
                WorkingInterval.objects.create(
                    working_day=working_day,
                    start_time=interval.get("start_time"),
                    end_time=interval.get("end_time"),
                    sort_order=interval.get("sort_order", idx),
                )

    @staticmethod
    def _save_holidays(business_hours, holidays_data):
        # Delete existing holidays
        Holiday.objects.filter(business_hours=business_hours).delete()

        for hol_data in holidays_data:
            Holiday.objects.create(
                business_hours=business_hours,
                date=hol_data["date"],
                name=hol_data["name"],
            )

    @transaction.atomic
    def create(self, validated_data):
        working_days_data = validated_data.pop("working_days", [])
        holidays_data = validated_data.pop("holidays", [])

        business_hours = BusinessHours.objects.create(**validated_data)

        self._save_working_days(business_hours, working_days_data)
        self._save_holidays(business_hours, holidays_data)

        return business_hours

    @transaction.atomic
    def update(self, instance, validated_data):
        working_days_data = validated_data.pop("working_days", None)
        holidays_data = validated_data.pop("holidays", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if working_days_data is not None:
            self._save_working_days(instance, working_days_data)
        if holidays_data is not None:
            self._save_holidays(instance, holidays_data)

        return instance

    def to_representation(self, instance):
        return BusinessHoursDetailSerializer(instance, context=self.context).data
