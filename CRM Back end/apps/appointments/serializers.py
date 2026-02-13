from rest_framework import serializers

from apps.appointments.models import Appointment, AppointmentPage


class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class _CaseSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)


class AppointmentListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "title",
            "start_datetime",
            "end_datetime",
            "location",
            "status",
            "contact",
            "contact_name",
            "assigned_to",
            "assigned_to_name",
            "case",
            "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return ""

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return ""


class AppointmentDetailSerializer(serializers.ModelSerializer):
    contact = _ContactSummarySerializer(read_only=True)
    assigned_to = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    case = _CaseSummarySerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "title",
            "description",
            "start_datetime",
            "end_datetime",
            "location",
            "status",
            "contact",
            "assigned_to",
            "created_by",
            "case",
            "reminder_at",
            "notes",
            "recurrence_pattern",
            "recurrence_end_date",
            "parent_appointment",
            "recurrence_config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AppointmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "title",
            "description",
            "start_datetime",
            "end_datetime",
            "location",
            "status",
            "contact",
            "assigned_to",
            "case",
            "reminder_at",
            "notes",
            "recurrence_pattern",
            "recurrence_end_date",
            "recurrence_config",
        ]

    def validate(self, data):
        start = data.get(
            "start_datetime", getattr(self.instance, "start_datetime", None)
        )
        end = data.get("end_datetime", getattr(self.instance, "end_datetime", None))
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_datetime": "End datetime must be after start datetime."}
            )

        # Double-booking prevention
        assigned_to = data.get(
            "assigned_to", getattr(self.instance, "assigned_to", None)
        )
        start = data.get(
            "start_datetime", getattr(self.instance, "start_datetime", None)
        )
        end = data.get("end_datetime", getattr(self.instance, "end_datetime", None))
        if assigned_to and start and end:
            from apps.appointments.models import Appointment

            overlapping = Appointment.objects.filter(
                assigned_to=assigned_to,
                start_datetime__lt=end,
                end_datetime__gt=start,
            ).exclude(
                status__in=[Appointment.Status.CANCELLED, Appointment.Status.NO_SHOW],
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError(
                    {
                        "assigned_to": "This staff member has a conflicting appointment during this time slot."
                    }
                )

        return data

    def to_representation(self, instance):
        return AppointmentDetailSerializer(instance, context=self.context).data


# -----------------------------------------------------------------------
# Calendar-specific serializer (lightweight for calendar rendering)
# -----------------------------------------------------------------------

STATUS_COLOR_MAP = {
    "scheduled": "#3b82f6",  # blue
    "confirmed": "#10b981",  # green
    "in_progress": "#f59e0b",  # yellow
    "completed": "#6b7280",  # gray
    "cancelled": "#ef4444",  # red
    "no_show": "#f97316",  # orange
    "checked_in": "#8b5cf6",  # purple
}


class AppointmentCalendarSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "title",
            "start_datetime",
            "end_datetime",
            "status",
            "contact_name",
            "assigned_to_name",
            "location",
            "color",
            "parent_appointment",
            "recurrence_pattern",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return ""

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return ""

    def get_color(self, obj):
        # Use custom color if set, otherwise fall back to status-based color
        if obj.color and obj.color != "#2563eb":  # Check if custom color is set
            return obj.color
        return STATUS_COLOR_MAP.get(obj.status, "#3b82f6")


class AppointmentQuickCreateSerializer(serializers.ModelSerializer):
    """Minimal fields for quick calendar creation."""

    class Meta:
        model = Appointment
        fields = [
            "title",
            "contact",
            "start_datetime",
            "end_datetime",
            "assigned_to",
            "location",
            "color",
        ]

    def validate(self, data):
        start = data.get("start_datetime")
        end = data.get("end_datetime")
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_datetime": "End datetime must be after start datetime."}
            )

        # Double-booking prevention
        assigned_to = data.get("assigned_to")
        if assigned_to and start and end:
            from apps.appointments.models import Appointment

            overlapping = Appointment.objects.filter(
                assigned_to=assigned_to,
                start_datetime__lt=end,
                end_datetime__gt=start,
            ).exclude(
                status__in=[Appointment.Status.CANCELLED, Appointment.Status.NO_SHOW],
            )
            if overlapping.exists():
                raise serializers.ValidationError(
                    {
                        "assigned_to": "This staff member has a conflicting appointment during this time slot."
                    }
                )

        return data

    def to_representation(self, instance):
        return AppointmentDetailSerializer(instance, context=self.context).data


# -----------------------------------------------------------------------
# Appointment Page serializers
# -----------------------------------------------------------------------


class AppointmentPageListSerializer(serializers.ModelSerializer):
    meet_with_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentPage
        fields = [
            "id",
            "name",
            "page_type",
            "slug",
            "event_duration",
            "event_activity_type",
            "meet_with",
            "meet_with_name",
            "assigned_to",
            "assigned_to_name",
            "created_by",
            "created_by_name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_meet_with_name(self, obj):
        return obj.meet_with.get_full_name() if obj.meet_with else ""

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else ""

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ""


class AppointmentPageDetailSerializer(serializers.ModelSerializer):
    meet_with_detail = _UserSummarySerializer(source="meet_with", read_only=True)
    assigned_to_detail = _UserSummarySerializer(source="assigned_to", read_only=True)
    created_by_detail = _UserSummarySerializer(source="created_by", read_only=True)

    class Meta:
        model = AppointmentPage
        fields = [
            "id",
            "name",
            "page_type",
            "introduction",
            "slug",
            "css_url",
            "event_duration",
            "event_activity_type",
            "meet_with",
            "meet_with_detail",
            "assigned_to",
            "assigned_to_detail",
            "created_by",
            "created_by_detail",
            "allow_known_records",
            "email_otp_validation",
            "is_active",
            "track_utm",
            "notification_config",
            "schedule_config",
            "invitee_questions",
            "event",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AppointmentPageCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentPage
        fields = [
            "name",
            "page_type",
            "introduction",
            "slug",
            "css_url",
            "event_duration",
            "event_activity_type",
            "meet_with",
            "assigned_to",
            "allow_known_records",
            "email_otp_validation",
            "is_active",
            "track_utm",
            "notification_config",
            "schedule_config",
            "invitee_questions",
            "event",
        ]

    def to_representation(self, instance):
        return AppointmentPageDetailSerializer(instance, context=self.context).data
