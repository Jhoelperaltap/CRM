from rest_framework import serializers

from apps.cases.models import TaxCase, TaxCaseNote
from apps.cases.services import generate_case_number


# ---------------------------------------------------------------------------
# Helpers - lightweight nested representations
# ---------------------------------------------------------------------------
class _UserSummarySerializer(serializers.Serializer):
    """Minimal user representation for read-only nesting."""

    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    """Minimal contact representation for read-only nesting."""

    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class _CorporationSummarySerializer(serializers.Serializer):
    """Minimal corporation representation for read-only nesting."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


# ---------------------------------------------------------------------------
# Tax Case Note serializers
# ---------------------------------------------------------------------------
class TaxCaseNoteSerializer(serializers.ModelSerializer):
    """Read serializer for tax case notes."""

    author = _UserSummarySerializer(read_only=True)

    class Meta:
        model = TaxCaseNote
        fields = [
            "id",
            "case",
            "author",
            "content",
            "is_internal",
            "created_at",
        ]
        read_only_fields = ["id", "case", "author", "created_at"]


class TaxCaseNoteCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating tax case notes.

    ``author`` is set automatically from ``request.user`` in the view.
    ``case`` is set automatically from the URL (nested route).
    """

    class Meta:
        model = TaxCaseNote
        fields = [
            "content",
            "is_internal",
        ]

    def to_representation(self, instance):
        """Return the full read representation after creation."""
        return TaxCaseNoteSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Tax Case serializers
# ---------------------------------------------------------------------------
class TaxCaseListSerializer(serializers.ModelSerializer):
    """Compact serializer used in list views."""

    contact_name = serializers.SerializerMethodField()
    assigned_preparer_name = serializers.SerializerMethodField()

    class Meta:
        model = TaxCase
        fields = [
            "id",
            "case_number",
            "title",
            "case_type",
            "fiscal_year",
            "status",
            "priority",
            "contact_name",
            "assigned_preparer_name",
            "due_date",
            "estimated_fee",
            "closed_date",
            "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj) -> str:
        """Return 'first_name last_name' for the related contact."""
        contact = obj.contact
        if contact:
            first = getattr(contact, "first_name", "")
            last = getattr(contact, "last_name", "")
            return f"{first} {last}".strip()
        return ""

    def get_assigned_preparer_name(self, obj) -> str:
        """Return the full name of the assigned preparer."""
        if obj.assigned_preparer:
            return obj.assigned_preparer.get_full_name()
        return ""


class TaxCaseDetailSerializer(serializers.ModelSerializer):
    """Full serializer used in retrieve views; includes nested objects."""

    contact = _ContactSummarySerializer(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    assigned_preparer = _UserSummarySerializer(read_only=True)
    reviewer = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    notes = TaxCaseNoteSerializer(many=True, read_only=True)

    class Meta:
        model = TaxCase
        fields = [
            "id",
            "case_number",
            "title",
            "case_type",
            "fiscal_year",
            "status",
            "priority",
            "contact",
            "corporation",
            "assigned_preparer",
            "reviewer",
            "created_by",
            "estimated_fee",
            "actual_fee",
            "due_date",
            "extension_date",
            "filed_date",
            "completed_date",
            "closed_date",
            "description",
            "custom_fields",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class TaxCaseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tax cases.

    ``case_number`` is auto-generated on create via the service layer.
    ``created_by`` is set from ``request.user`` in the view.
    """

    class Meta:
        model = TaxCase
        fields = [
            "title",
            "case_type",
            "fiscal_year",
            "status",
            "priority",
            "contact",
            "corporation",
            "assigned_preparer",
            "reviewer",
            "estimated_fee",
            "actual_fee",
            "due_date",
            "extension_date",
            "filed_date",
            "completed_date",
            "closed_date",
            "description",
            "custom_fields",
        ]

    def validate(self, data):
        if self.instance and self.instance.is_locked:
            raise serializers.ValidationError(
                f"Cannot edit a case in '{self.instance.get_status_display()}' status. "
                "Only status transitions are allowed."
            )
        return data

    def create(self, validated_data):
        validated_data["case_number"] = generate_case_number()
        return super().create(validated_data)

    def to_representation(self, instance):
        """Return the full detail representation after create / update."""
        return TaxCaseDetailSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Status transition serializer
# ---------------------------------------------------------------------------
class TaxCaseTransitionSerializer(serializers.Serializer):
    """Accepts a target status and validates against the workflow transition map."""

    status = serializers.ChoiceField(choices=TaxCase.Status.choices)

    def validate_status(self, value):
        case = self.context.get("case")
        if case is None:
            raise serializers.ValidationError("Case context is required.")

        current_status = case.status
        allowed = TaxCase.VALID_TRANSITIONS.get(current_status, [])

        if value not in allowed:
            allowed_display = ", ".join(allowed) if allowed else "none"
            raise serializers.ValidationError(
                f"Cannot transition from '{current_status}' to '{value}'. "
                f"Allowed transitions: [{allowed_display}]."
            )
        return value
