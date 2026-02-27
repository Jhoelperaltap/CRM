from rest_framework import serializers

from apps.portal.models import (
    PortalDeviceToken,
    PortalDocumentUpload,
    PortalMessage,
    PortalNotification,
)

# -----------------------------------------------------------------------
# Auth serializers
# -----------------------------------------------------------------------


class PortalLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PortalPasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PortalPasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)


class PortalChangePasswordSerializer(serializers.Serializer):
    """Serializer for authenticated password change."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {
                    "new_password": "New password must be different from current password."
                }
            )
        return attrs


# -----------------------------------------------------------------------
# Contact / profile
# -----------------------------------------------------------------------


class PortalContactSerializer(serializers.Serializer):
    """Read-only serializer for the portal user's contact info."""

    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)


class PortalMeSerializer(serializers.Serializer):
    """Response for /portal/auth/me/."""

    portal_access_id = serializers.UUIDField(source="id")
    email = serializers.EmailField()
    contact = PortalContactSerializer()
    last_login = serializers.DateTimeField()


# -----------------------------------------------------------------------
# Cases
# -----------------------------------------------------------------------


class _CaseChecklistItemSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)
    is_required = serializers.BooleanField(read_only=True)


class _CaseChecklistSerializer(serializers.Serializer):
    completed_count = serializers.IntegerField(read_only=True)
    total_count = serializers.IntegerField(read_only=True)
    items = _CaseChecklistItemSerializer(many=True, read_only=True)


class PortalCaseListSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    case_type = serializers.CharField(read_only=True)
    due_date = serializers.DateField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class PortalCaseDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    case_type = serializers.CharField(read_only=True)
    due_date = serializers.DateField(read_only=True)
    description = serializers.CharField(read_only=True)
    checklist = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)

    def get_checklist(self, obj):
        checklist = getattr(obj, "checklist", None)
        if checklist is None:
            return None
        return _CaseChecklistSerializer(checklist).data


# -----------------------------------------------------------------------
# Documents
# -----------------------------------------------------------------------


class PortalDocumentSerializer(serializers.Serializer):
    """Serializer for regular documents visible to portal users."""

    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    doc_type = serializers.CharField(read_only=True)
    file = serializers.FileField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    mime_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    case_id = serializers.UUIDField(source="case.id", read_only=True, allow_null=True)
    case_number = serializers.CharField(
        source="case.case_number", read_only=True, allow_null=True
    )
    created_at = serializers.DateTimeField(read_only=True)
    # URLs for download/view
    download_url = serializers.SerializerMethodField()
    view_url = serializers.SerializerMethodField()
    # Flag to indicate source
    source = serializers.SerializerMethodField()

    def get_source(self, obj):
        return "document"

    def get_download_url(self, obj):
        return f"/api/v1/portal/documents/{obj.id}/download/"

    def get_view_url(self, obj):
        return f"/api/v1/portal/documents/{obj.id}/download/?inline=true"


class PortalDocumentUploadSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source="document.title", read_only=True)
    document_file = serializers.FileField(source="document.file", read_only=True)

    class Meta:
        model = PortalDocumentUpload
        fields = [
            "id",
            "contact",
            "case",
            "document",
            "document_title",
            "document_file",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


class PortalDocumentCreateSerializer(serializers.Serializer):
    """Handles file upload from portal clients."""

    title = serializers.CharField(max_length=255)
    file = serializers.FileField()
    case = serializers.UUIDField(required=False, allow_null=True)
    doc_type = serializers.CharField(max_length=20, default="other")


# -----------------------------------------------------------------------
# Messages
# -----------------------------------------------------------------------


class _SenderSerializer(serializers.Serializer):
    """Sender info for messages."""

    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class _CaseSummarySerializer(serializers.Serializer):
    """Case summary for messages."""

    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)


class PortalMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender = serializers.SerializerMethodField()
    is_from_staff = serializers.SerializerMethodField()
    case = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = PortalMessage
        fields = [
            "id",
            "contact",
            "contact_name",
            "case",
            "message_type",
            "subject",
            "body",
            "sender_user",
            "sender_name",
            "sender",
            "is_from_staff",
            "parent_message",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "message_type",
            "sender_user",
            "sender_name",
            "sender",
            "is_from_staff",
            "is_read",
            "created_at",
        ]

    def get_sender_name(self, obj):
        if obj.sender_user:
            return obj.sender_user.get_full_name()
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return ""

    def get_sender(self, obj):
        """Return sender object for mobile app compatibility."""
        if obj.message_type == "staff_to_client" and obj.sender_user:
            return {
                "id": str(obj.sender_user.id),
                "first_name": obj.sender_user.first_name or "",
                "last_name": obj.sender_user.last_name or "",
                "email": obj.sender_user.email,
            }
        elif obj.contact:
            return {
                "id": str(obj.contact.id),
                "first_name": obj.contact.first_name or "",
                "last_name": obj.contact.last_name or "",
                "email": obj.contact.email or "",
            }
        return {
            "id": "",
            "first_name": "Unknown",
            "last_name": "",
            "email": "",
        }

    def get_is_from_staff(self, obj):
        """Return True if message is from staff to client."""
        return obj.message_type == "staff_to_client"

    def get_case(self, obj):
        """Return case summary if exists."""
        if obj.case:
            return {
                "id": str(obj.case.id),
                "case_number": obj.case.case_number,
                "title": obj.case.title,
            }
        return None

    def get_contact_name(self, obj):
        """Return contact full name."""
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return ""


class PortalMessageCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()
    case = serializers.UUIDField(required=False, allow_null=True)
    parent_message = serializers.UUIDField(required=False, allow_null=True)


# -----------------------------------------------------------------------
# Appointments
# -----------------------------------------------------------------------


class PortalAppointmentSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    start_datetime = serializers.DateTimeField(read_only=True)
    end_datetime = serializers.DateTimeField(read_only=True)
    location = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return ""


# -----------------------------------------------------------------------
# Push notifications
# -----------------------------------------------------------------------


class PortalDeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalDeviceToken
        fields = [
            "id",
            "token",
            "platform",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "created_at"]


class PortalDeviceTokenCreateSerializer(serializers.Serializer):
    """Register a device for push notifications."""

    token = serializers.CharField(max_length=500)
    platform = serializers.ChoiceField(choices=["ios", "android"])


# -----------------------------------------------------------------------
# Portal Notifications
# -----------------------------------------------------------------------


class PortalNotificationSerializer(serializers.ModelSerializer):
    """Serializer for portal notifications."""

    related_message_id = serializers.UUIDField(
        source="related_message.id", read_only=True, allow_null=True
    )
    related_case_id = serializers.UUIDField(
        source="related_case.id", read_only=True, allow_null=True
    )
    related_case_number = serializers.CharField(
        source="related_case.case_number", read_only=True, allow_null=True
    )
    related_appointment_id = serializers.UUIDField(
        source="related_appointment.id", read_only=True, allow_null=True
    )

    class Meta:
        model = PortalNotification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "is_read",
            "related_message_id",
            "related_case_id",
            "related_case_number",
            "related_appointment_id",
            "created_at",
        ]
        read_only_fields = fields
