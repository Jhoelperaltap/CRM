from rest_framework import serializers

from apps.dashboard.models import DashboardWidget, UserDashboardConfig, UserPreference


# ---------------------------------------------------------------------------
# Dashboard Widget
# ---------------------------------------------------------------------------
class DashboardWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardWidget
        fields = [
            "id",
            "name",
            "widget_type",
            "chart_type",
            "description",
            "default_enabled",
            "sort_order",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# User Dashboard Config (read)
# ---------------------------------------------------------------------------
class UserDashboardConfigSerializer(serializers.ModelSerializer):
    widget = DashboardWidgetSerializer(read_only=True)

    class Meta:
        model = UserDashboardConfig
        fields = [
            "id",
            "user",
            "widget",
            "is_visible",
            "position",
            "width",
        ]
        read_only_fields = ["id", "user"]


# ---------------------------------------------------------------------------
# User Dashboard Config (write / bulk layout save)
# ---------------------------------------------------------------------------
class _LayoutItemSerializer(serializers.Serializer):
    """Single item in the layout payload."""

    widget_id = serializers.UUIDField()
    is_visible = serializers.BooleanField(default=True)
    position = serializers.IntegerField(min_value=0)
    width = serializers.ChoiceField(
        choices=UserDashboardConfig.Width.choices,
        default=UserDashboardConfig.Width.HALF,
    )


class UserDashboardConfigUpdateSerializer(serializers.Serializer):
    """
    Accepts the full dashboard layout as a list of widget configurations.
    Expected payload::

        {
            "widgets": [
                {"widget_id": "<uuid>", "is_visible": true, "position": 0, "width": "half"},
                ...
            ]
        }
    """

    widgets = _LayoutItemSerializer(many=True)

    def validate_widgets(self, items):
        widget_ids = [item["widget_id"] for item in items]
        if len(widget_ids) != len(set(widget_ids)):
            raise serializers.ValidationError("Duplicate widget IDs are not allowed.")

        existing = set(
            DashboardWidget.objects.filter(id__in=widget_ids).values_list(
                "id", flat=True
            )
        )
        missing = set(widget_ids) - existing
        if missing:
            raise serializers.ValidationError(
                f"Unknown widget IDs: {[str(uid) for uid in missing]}"
            )
        return items

    def save(self, user):
        """
        Replace the user's entire dashboard layout atomically.
        """
        items = self.validated_data["widgets"]

        # Remove existing config rows for this user
        UserDashboardConfig.objects.filter(user=user).delete()

        # Bulk-create the new layout
        configs = [
            UserDashboardConfig(
                user=user,
                widget_id=item["widget_id"],
                is_visible=item["is_visible"],
                position=item["position"],
                width=item["width"],
            )
            for item in items
        ]
        UserDashboardConfig.objects.bulk_create(configs)

        return UserDashboardConfig.objects.filter(user=user).select_related("widget")


# ---------------------------------------------------------------------------
# User Preference
# ---------------------------------------------------------------------------
class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "id",
            "user",
            "theme",
            "sidebar_collapsed",
            "items_per_page",
            "date_format",
            "timezone",
        ]
        read_only_fields = ["id", "user"]
