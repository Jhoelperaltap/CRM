from rest_framework import serializers

from apps.corporations.models import Corporation


# ---------------------------------------------------------------------------
# Corporation - CSV Import validation
# ---------------------------------------------------------------------------
class CorporationImportSerializer(serializers.Serializer):
    """Validates a single row from a CSV import file."""

    name = serializers.CharField(max_length=255)
    legal_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    entity_type = serializers.ChoiceField(
        choices=Corporation.EntityType.choices,
        required=False,
        default=Corporation.EntityType.OTHER,
    )
    ein = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    state_id = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    street_address = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    state = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    zip_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default="United States")
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    fax = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    website = serializers.URLField(required=False, allow_blank=True, default="")
    industry = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(
        choices=Corporation.Status.choices,
        required=False,
        default=Corporation.Status.ACTIVE,
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")


# ---------------------------------------------------------------------------
# Lightweight nested summaries (read-only)
# ---------------------------------------------------------------------------
class _ContactSummarySerializer(serializers.Serializer):
    """Minimal read-only representation of a Contact for nested display."""

    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class _UserSummarySerializer(serializers.Serializer):
    """Minimal read-only representation of a User for nested display."""

    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)

    def get_full_name(self, obj):
        return obj.get_full_name()


class _CorporationSummarySerializer(serializers.Serializer):
    """Minimal read-only representation of a Corporation for nested display."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class _SLASummarySerializer(serializers.Serializer):
    """Minimal read-only representation of a BusinessHours (SLA) for nested display."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


# ---------------------------------------------------------------------------
# Corporation — List (compact)
# ---------------------------------------------------------------------------
class CorporationListSerializer(serializers.ModelSerializer):
    """
    Compact serializer used for list views and search results.
    """

    primary_contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    member_of_name = serializers.SerializerMethodField()

    class Meta:
        model = Corporation
        fields = [
            "id",
            "name",
            "entity_type",
            "organization_type",
            "organization_status",
            "ein",
            "phone",
            "email",
            "website",
            "industry",
            "employees",
            "region",
            "billing_city",
            "billing_state",
            "status",
            "primary_contact_name",
            "assigned_to_name",
            "member_of_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_primary_contact_name(self, obj):
        if obj.primary_contact_id and obj.primary_contact:
            return (
                f"{obj.primary_contact.first_name} "
                f"{obj.primary_contact.last_name}"
            ).strip()
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to_id and obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return None

    def get_member_of_name(self, obj):
        if obj.member_of_id and obj.member_of:
            return obj.member_of.name
        return None


# ---------------------------------------------------------------------------
# Corporation — Detail (full)
# ---------------------------------------------------------------------------
class CorporationDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer used for retrieve views.
    Includes nested summaries for primary_contact and assigned_to.
    """

    primary_contact = _ContactSummarySerializer(read_only=True)
    assigned_to = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    member_of = _CorporationSummarySerializer(read_only=True)
    sla = _SLASummarySerializer(read_only=True)

    class Meta:
        model = Corporation
        fields = [
            "id",
            # Organization Details
            "name",
            "legal_name",
            "entity_type",
            "organization_type",
            "organization_status",
            "ein",
            "state_id",
            # Business details
            "employees",
            "ownership",
            "ticker_symbol",
            "sic_code",
            "industry",
            "annual_revenue",
            "annual_revenue_range",
            "fiscal_year_end",
            "date_incorporated",
            "region",
            "timezone",
            # Contact info
            "phone",
            "secondary_phone",
            "fax",
            "email",
            "secondary_email",
            "email_domain",
            "website",
            # Social media
            "twitter_username",
            "linkedin_url",
            "facebook_url",
            # Marketing preferences
            "email_opt_in",
            "sms_opt_in",
            "notify_owner",
            # Billing address
            "billing_street",
            "billing_city",
            "billing_state",
            "billing_zip",
            "billing_country",
            "billing_po_box",
            # Shipping address
            "shipping_street",
            "shipping_city",
            "shipping_state",
            "shipping_zip",
            "shipping_country",
            "shipping_po_box",
            # Legacy address fields
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            # Status & relationships
            "status",
            "member_of",
            "primary_contact",
            "assigned_to",
            "created_by",
            "sla",
            # Other
            "description",
            "image",
            "custom_fields",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Corporation — Create / Update (writable)
# ---------------------------------------------------------------------------
class CorporationCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Writable serializer for creating and updating corporations.
    The ``created_by`` field is set automatically in the view.
    """

    class Meta:
        model = Corporation
        fields = [
            "id",
            # Organization Details
            "name",
            "legal_name",
            "entity_type",
            "organization_type",
            "organization_status",
            "ein",
            "state_id",
            # Business details
            "employees",
            "ownership",
            "ticker_symbol",
            "sic_code",
            "industry",
            "annual_revenue",
            "annual_revenue_range",
            "fiscal_year_end",
            "date_incorporated",
            "region",
            "timezone",
            # Contact info
            "phone",
            "secondary_phone",
            "fax",
            "email",
            "secondary_email",
            "email_domain",
            "website",
            # Social media
            "twitter_username",
            "linkedin_url",
            "facebook_url",
            # Marketing preferences
            "email_opt_in",
            "sms_opt_in",
            "notify_owner",
            # Billing address
            "billing_street",
            "billing_city",
            "billing_state",
            "billing_zip",
            "billing_country",
            "billing_po_box",
            # Shipping address
            "shipping_street",
            "shipping_city",
            "shipping_state",
            "shipping_zip",
            "shipping_country",
            "shipping_po_box",
            # Legacy address fields
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            # Status & relationships
            "status",
            "member_of",
            "primary_contact",
            "assigned_to",
            "sla",
            # Other
            "description",
            "image",
            "custom_fields",
        ]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        """Return the full detail representation after create/update."""
        return CorporationDetailSerializer(instance, context=self.context).data
