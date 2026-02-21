from django.contrib.auth.hashers import make_password
from django.utils.crypto import get_random_string
from rest_framework import serializers

from apps.portal.models import ClientPortalAccess, PortalDocumentUpload, PortalMessage


# ---------------------------------------------------------------------------
# Staff Portal Access
# ---------------------------------------------------------------------------
class StaffPortalAccessListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientPortalAccess
        fields = [
            "id",
            "contact",
            "contact_name",
            "email",
            "is_active",
            "last_login",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        return (
            obj.contact.full_name
            if hasattr(obj.contact, "full_name")
            else str(obj.contact)
        )


class StaffPortalAccessCreateSerializer(serializers.Serializer):
    contact = serializers.UUIDField()
    email = serializers.EmailField(required=False)

    def validate_contact(self, value):
        from apps.contacts.models import Contact

        try:
            contact = Contact.objects.get(pk=value)
        except Contact.DoesNotExist:
            raise serializers.ValidationError("Contact not found.")
        if ClientPortalAccess.objects.filter(contact=contact).exists():
            raise serializers.ValidationError("This contact already has portal access.")
        return contact

    def create(self, validated_data):
        contact = validated_data["contact"]
        email = validated_data.get("email") or contact.email
        if not email:
            raise serializers.ValidationError(
                {"email": "Email is required when the contact has no email."}
            )
        temp_password = get_random_string(12)
        access = ClientPortalAccess.objects.create(
            contact=contact,
            email=email,
            password_hash=make_password(temp_password),
        )
        # Attach the temp password so the view can return it
        access._temp_password = temp_password
        return access


class StaffPortalAccessDetailSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    contact_email = serializers.SerializerMethodField()

    class Meta:
        model = ClientPortalAccess
        fields = [
            "id",
            "contact",
            "contact_name",
            "contact_email",
            "email",
            "is_active",
            "last_login",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "contact",
            "contact_name",
            "contact_email",
            "last_login",
            "created_at",
            "updated_at",
        ]

    def get_contact_name(self, obj):
        return (
            obj.contact.full_name
            if hasattr(obj.contact, "full_name")
            else str(obj.contact)
        )

    def get_contact_email(self, obj):
        return obj.contact.email


# ---------------------------------------------------------------------------
# Staff Document Review
# ---------------------------------------------------------------------------
class StaffDocumentReviewListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    document_title = serializers.CharField(source="document.title", read_only=True)

    class Meta:
        model = PortalDocumentUpload
        fields = [
            "id",
            "contact",
            "contact_name",
            "case",
            "document",
            "document_title",
            "status",
            "rejection_reason",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        return (
            obj.contact.full_name
            if hasattr(obj.contact, "full_name")
            else str(obj.contact)
        )


class StaffDocumentReviewActionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, default="")


# ---------------------------------------------------------------------------
# Staff Portal Messages
# ---------------------------------------------------------------------------
class StaffPortalMessageListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

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
            "parent_message",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        return (
            obj.contact.full_name
            if hasattr(obj.contact, "full_name")
            else str(obj.contact)
        )

    def get_sender_name(self, obj):
        if obj.sender_user:
            return obj.sender_user.get_full_name()
        return None


class StaffPortalMessageReplySerializer(serializers.Serializer):
    body = serializers.CharField()
    subject = serializers.CharField(required=False)


# ---------------------------------------------------------------------------
# Staff Billing Portal Access
# ---------------------------------------------------------------------------
class StaffBillingAccessSerializer(serializers.ModelSerializer):
    """Serializer for viewing/editing BillingPortalAccess."""

    portal_access_email = serializers.EmailField(
        source="portal_access.email", read_only=True
    )
    contact_name = serializers.SerializerMethodField()
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        from apps.portal.models import BillingPortalAccess

        model = BillingPortalAccess
        fields = [
            "id",
            "portal_access",
            "portal_access_email",
            "contact_name",
            "tenant",
            "tenant_name",
            "can_manage_products",
            "can_manage_services",
            "can_create_invoices",
            "can_create_quotes",
            "can_view_reports",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        contact = obj.portal_access.contact
        return contact.full_name if hasattr(contact, "full_name") else str(contact)


class StaffBillingAccessCreateSerializer(serializers.Serializer):
    """Serializer for enabling billing access on a portal account."""

    portal_access = serializers.UUIDField()
    tenant = serializers.UUIDField()
    can_manage_products = serializers.BooleanField(default=True)
    can_manage_services = serializers.BooleanField(default=True)
    can_create_invoices = serializers.BooleanField(default=True)
    can_create_quotes = serializers.BooleanField(default=True)
    can_view_reports = serializers.BooleanField(default=True)

    def validate_portal_access(self, value):
        try:
            access = ClientPortalAccess.objects.get(pk=value)
        except ClientPortalAccess.DoesNotExist:
            raise serializers.ValidationError("Portal access not found.")

        from apps.portal.models import BillingPortalAccess

        if BillingPortalAccess.objects.filter(portal_access=access).exists():
            raise serializers.ValidationError(
                "This portal account already has billing access."
            )
        return access

    def validate_tenant(self, value):
        from apps.corporations.models import Corporation

        try:
            tenant = Corporation.objects.get(pk=value)
        except Corporation.DoesNotExist:
            raise serializers.ValidationError("Corporation not found.")
        return tenant

    def validate(self, data):
        # Verify the contact belongs to the corporation
        portal_access = data["portal_access"]
        tenant = data["tenant"]

        contact = portal_access.contact
        if contact.corporation_id != tenant.id:
            raise serializers.ValidationError(
                {
                    "tenant": "The contact must belong to this corporation to enable billing access."
                }
            )
        return data

    def create(self, validated_data):
        from apps.portal.models import BillingPortalAccess

        return BillingPortalAccess.objects.create(**validated_data)


class StaffBillingAccessUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating billing access permissions."""

    class Meta:
        from apps.portal.models import BillingPortalAccess

        model = BillingPortalAccess
        fields = [
            "can_manage_products",
            "can_manage_services",
            "can_create_invoices",
            "can_create_quotes",
            "can_view_reports",
            "is_active",
        ]


class StaffBillingAccessListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing billing accesses."""

    portal_access_email = serializers.EmailField(
        source="portal_access.email", read_only=True
    )
    contact_name = serializers.SerializerMethodField()
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        from apps.portal.models import BillingPortalAccess

        model = BillingPortalAccess
        fields = [
            "id",
            "portal_access",
            "portal_access_email",
            "contact_name",
            "tenant",
            "tenant_name",
            "is_active",
            "created_at",
        ]

    def get_contact_name(self, obj):
        contact = obj.portal_access.contact
        return contact.full_name if hasattr(contact, "full_name") else str(contact)
