from rest_framework import serializers

from apps.forecasts.models import ForecastEntry, SalesQuota


class _UserSummary(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class SalesQuotaSerializer(serializers.ModelSerializer):
    user_detail = _UserSummary(source="user", read_only=True)
    period_label = serializers.CharField(read_only=True)

    class Meta:
        model = SalesQuota
        fields = [
            "id",
            "user",
            "user_detail",
            "fiscal_year",
            "quarter",
            "amount",
            "period_label",
            "notify_by_email",
            "set_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "set_by", "created_at", "updated_at"]


class SalesQuotaBulkItemSerializer(serializers.Serializer):
    user = serializers.UUIDField()
    fiscal_year = serializers.IntegerField()
    quarter = serializers.IntegerField(min_value=1, max_value=4)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class SalesQuotaBulkSerializer(serializers.Serializer):
    quotas = SalesQuotaBulkItemSerializer(many=True)
    notify_by_email = serializers.BooleanField(default=False)


class ForecastEntrySerializer(serializers.ModelSerializer):
    user_detail = _UserSummary(source="user", read_only=True)
    period_label = serializers.CharField(read_only=True)

    class Meta:
        model = ForecastEntry
        fields = [
            "id",
            "user",
            "user_detail",
            "fiscal_year",
            "quarter",
            "pipeline",
            "best_case",
            "commit",
            "period_label",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QuarterSummarySerializer(serializers.Serializer):
    fiscal_year = serializers.IntegerField()
    quarter = serializers.IntegerField()
    period_label = serializers.CharField()
    quota = serializers.DecimalField(max_digits=12, decimal_places=2)
    closed_won = serializers.DecimalField(max_digits=12, decimal_places=2)
    gap = serializers.DecimalField(max_digits=12, decimal_places=2)
    pipeline = serializers.DecimalField(max_digits=12, decimal_places=2)
    best_case = serializers.DecimalField(max_digits=12, decimal_places=2)
    commit = serializers.DecimalField(max_digits=12, decimal_places=2)
    funnel_total = serializers.DecimalField(max_digits=12, decimal_places=2)


class TeamMemberQuotaSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    full_name = serializers.CharField()
    fiscal_year = serializers.IntegerField()
    quarter = serializers.IntegerField()
    period_label = serializers.CharField()
    quota = serializers.DecimalField(max_digits=12, decimal_places=2)
    closed_won = serializers.DecimalField(max_digits=12, decimal_places=2)
    gap = serializers.DecimalField(max_digits=12, decimal_places=2)
    pipeline = serializers.DecimalField(max_digits=12, decimal_places=2)
    best_case = serializers.DecimalField(max_digits=12, decimal_places=2)
    commit = serializers.DecimalField(max_digits=12, decimal_places=2)
    funnel_total = serializers.DecimalField(max_digits=12, decimal_places=2)
