from rest_framework import serializers

from apps.internal_tickets.models import InternalTicket


class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _GroupSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class InternalTicketListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = InternalTicket
        fields = [
            "id",
            "ticket_number",
            "title",
            "status",
            "priority",
            "category",
            "channel",
            "assigned_to",
            "assigned_to_name",
            "group",
            "group_name",
            "employee",
            "employee_name",
            "deferred_date",
            "rating",
            "reopen_count",
            "satisfaction_survey_feedback",
            "sla_name",
            "sla_hours",
            "sla_breached_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return ""

    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.get_full_name()
        return ""

    def get_group_name(self, obj):
        if obj.group:
            return obj.group.name
        return ""


class InternalTicketDetailSerializer(serializers.ModelSerializer):
    assigned_to = _UserSummarySerializer(read_only=True)
    employee = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    group = _GroupSummarySerializer(read_only=True)

    class Meta:
        model = InternalTicket
        fields = [
            "id",
            "ticket_number",
            "title",
            "description",
            "status",
            "priority",
            "group",
            "assigned_to",
            "channel",
            "resolution",
            "email",
            "category",
            "deferred_date",
            "resolution_type",
            "rating",
            "reopen_count",
            "satisfaction_survey_feedback",
            "employee",
            "created_by",
            "sla_name",
            "sla_hours",
            "sla_breached_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class InternalTicketCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalTicket
        fields = [
            "title",
            "description",
            "status",
            "priority",
            "group",
            "assigned_to",
            "channel",
            "resolution",
            "email",
            "category",
            "deferred_date",
            "resolution_type",
            "rating",
            "reopen_count",
            "satisfaction_survey_feedback",
            "employee",
            "sla_name",
            "sla_hours",
        ]

    def to_representation(self, instance):
        return InternalTicketDetailSerializer(instance, context=self.context).data
