import csv
import io

from rest_framework import serializers

from apps.contacts.models import Contact, ContactStar, ContactTag, ContactTagAssignment


# ---------------------------------------------------------------------------
# Nested summary serializers (read-only, for embedding in contact responses)
# ---------------------------------------------------------------------------
class _CorporationSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of a linked corporation."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class _UserSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of an assigned / created-by user."""

    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of reports_to contact."""

    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class _SLASummarySerializer(serializers.Serializer):
    """Lightweight read-only representation of SLA."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


# ---------------------------------------------------------------------------
# Contact - List (compact)
# ---------------------------------------------------------------------------
class ContactListSerializer(serializers.ModelSerializer):
    """
    Compact serializer used for list views and search results.
    Includes a computed ``is_starred`` field that reflects whether the
    requesting user has starred the contact.
    """

    full_name = serializers.CharField(read_only=True)
    corporation_name = serializers.CharField(
        source="corporation.name",
        read_only=True,
        default=None,
    )
    assigned_to_name = serializers.SerializerMethodField()
    is_starred = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id",
            "contact_number",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "secondary_email",
            "phone",
            "mobile",
            "title",
            "department",
            "status",
            "lead_source",
            "source",
            "preferred_language",
            "mailing_city",
            "mailing_state",
            "office_services",
            "corporation_name",
            "assigned_to_name",
            "is_starred",
            "created_at",
        ]
        read_only_fields = fields

    # -- helpers --
    def get_assigned_to_name(self, obj):
        if obj.assigned_to_id:
            return obj.assigned_to.get_full_name()
        return None

    def get_is_starred(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            # Prefer pre-annotated value when available (set by the viewset queryset)
            if hasattr(obj, "_is_starred"):
                return obj._is_starred
            return ContactStar.objects.filter(
                user=request.user, contact=obj
            ).exists()
        return False


# ---------------------------------------------------------------------------
# Contact - Detail (full)
# ---------------------------------------------------------------------------
class ContactDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer used for the retrieve (detail) endpoint.
    Embeds nested summaries for corporation, assigned_to, created_by, reports_to, and sla.
    """

    full_name = serializers.CharField(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    assigned_to = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    reports_to = _ContactSummarySerializer(read_only=True)
    sla = _SLASummarySerializer(read_only=True)
    is_starred = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id",
            "contact_number",
            # Basic Information
            "salutation",
            "first_name",
            "last_name",
            "full_name",
            "title",
            "department",
            "reports_to",
            # Contact Info
            "email",
            "secondary_email",
            "phone",
            "mobile",
            "home_phone",
            "fax",
            "assistant",
            "assistant_phone",
            # Personal
            "date_of_birth",
            "ssn_last_four",
            # Lead & Source
            "lead_source",
            "source",
            "referred_by",
            "source_campaign",
            "platform",
            "ad_group",
            # Communication Preferences
            "do_not_call",
            "notify_owner",
            "email_opt_in",
            "sms_opt_in",
            # Mailing Address
            "mailing_street",
            "mailing_city",
            "mailing_state",
            "mailing_zip",
            "mailing_country",
            "mailing_po_box",
            # Other Address
            "other_street",
            "other_city",
            "other_state",
            "other_zip",
            "other_country",
            "other_po_box",
            # Legacy Address
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            # Language & Timezone
            "preferred_language",
            "timezone",
            # Status
            "status",
            # Customer Portal
            "portal_user",
            "support_start_date",
            "support_end_date",
            # Social Media
            "twitter_username",
            "linkedin_url",
            "linkedin_followers",
            "facebook_url",
            "facebook_followers",
            # Image
            "image",
            # Relationships
            "corporation",
            "assigned_to",
            "created_by",
            "sla",
            # Office Services
            "office_services",
            # Other
            "description",
            "tags",
            "is_starred",
            "custom_fields",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_is_starred(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            if hasattr(obj, "_is_starred"):
                return obj._is_starred
            return ContactStar.objects.filter(
                user=request.user, contact=obj
            ).exists()
        return False


# ---------------------------------------------------------------------------
# Contact - Create / Update (writable)
# ---------------------------------------------------------------------------
class ContactCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Writable serializer for creating and updating contacts.
    ``created_by`` is set automatically by the viewset on creation.
    """

    class Meta:
        model = Contact
        fields = [
            # Basic Information
            "salutation",
            "first_name",
            "last_name",
            "title",
            "department",
            "reports_to",
            # Contact Info
            "email",
            "secondary_email",
            "phone",
            "mobile",
            "home_phone",
            "fax",
            "assistant",
            "assistant_phone",
            # Personal
            "date_of_birth",
            "ssn_last_four",
            # Lead & Source
            "lead_source",
            "source",
            "referred_by",
            "source_campaign",
            "platform",
            "ad_group",
            # Communication Preferences
            "do_not_call",
            "notify_owner",
            "email_opt_in",
            "sms_opt_in",
            # Mailing Address
            "mailing_street",
            "mailing_city",
            "mailing_state",
            "mailing_zip",
            "mailing_country",
            "mailing_po_box",
            # Other Address
            "other_street",
            "other_city",
            "other_state",
            "other_zip",
            "other_country",
            "other_po_box",
            # Legacy Address (for backwards compatibility)
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            # Language & Timezone
            "preferred_language",
            "timezone",
            # Status
            "status",
            # Customer Portal
            "portal_user",
            "support_start_date",
            "support_end_date",
            # Social Media
            "twitter_username",
            "linkedin_url",
            "linkedin_followers",
            "facebook_url",
            "facebook_followers",
            # Image
            "image",
            # Relationships
            "corporation",
            "assigned_to",
            "sla",
            # Office Services
            "office_services",
            # Other
            "description",
            "tags",
            "custom_fields",
        ]

    def validate_ssn_last_four(self, value):
        if value and (not value.isdigit() or len(value) != 4):
            raise serializers.ValidationError(
                "SSN last four must be exactly 4 digits."
            )
        return value

    def to_representation(self, instance):
        """Return the full detail representation after create / update."""
        return ContactDetailSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Contact - CSV Import validation
# ---------------------------------------------------------------------------
class ContactImportSerializer(serializers.Serializer):
    """
    Validates a single row from a CSV import file.
    All address / optional fields fall back to empty strings so the row
    can still be imported with minimal data.
    """

    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    mobile = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    salutation = serializers.ChoiceField(
        choices=Contact.Salutation.choices,
        required=False,
        allow_blank=True,
        default="",
    )
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    title = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    department = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    # Mailing address
    mailing_street = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    mailing_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    mailing_state = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    mailing_zip = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    mailing_country = serializers.CharField(max_length=100, required=False, allow_blank=True, default="United States")
    # Legacy address fields for backwards compatibility
    street_address = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    state = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    zip_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default="United States")
    status = serializers.ChoiceField(
        choices=Contact.Status.choices,
        required=False,
        default=Contact.Status.ACTIVE,
    )
    source = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    lead_source = serializers.ChoiceField(
        choices=Contact.LeadSource.choices,
        required=False,
        allow_blank=True,
        default="",
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")
    preferred_language = serializers.ChoiceField(
        choices=Contact.Language.choices,
        required=False,
        allow_blank=True,
        default="en",
    )
    tags = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    office_services = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")


# ---------------------------------------------------------------------------
# Contact Tags
# ---------------------------------------------------------------------------
class ContactTagSerializer(serializers.ModelSerializer):
    """Serializer for contact tags."""

    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    contact_count = serializers.SerializerMethodField()

    class Meta:
        model = ContactTag
        fields = [
            "id",
            "name",
            "color",
            "tag_type",
            "created_by",
            "created_by_name",
            "contact_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "contact_count", "created_at"]

    def get_contact_count(self, obj):
        return obj.assignments.count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ContactTagAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for contact tag assignments."""

    tag_name = serializers.CharField(source="tag.name", read_only=True)
    tag_color = serializers.CharField(source="tag.color", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.get_full_name", read_only=True)

    class Meta:
        model = ContactTagAssignment
        fields = [
            "id",
            "contact",
            "tag",
            "tag_name",
            "tag_color",
            "assigned_by",
            "assigned_by_name",
            "assigned_at",
        ]
        read_only_fields = ["id", "assigned_by", "assigned_by_name", "assigned_at"]

    def create(self, validated_data):
        validated_data["assigned_by"] = self.context["request"].user
        return super().create(validated_data)
