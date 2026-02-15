from rest_framework import serializers

from apps.esign.models import EsignDocument, EsignSignee

# ── Signee ──────────────────────────────────────────────────────────────


class EsignSigneeSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = EsignSignee
        fields = [
            "id",
            "order",
            "signee_type",
            "contact",
            "contact_name",
            "user",
            "recipient_email",
            "status",
            "signed_at",
            "ip_address",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "signed_at", "ip_address"]

    def get_contact_name(self, obj):
        if obj.contact:
            return obj.contact.full_name
        return ""


class EsignSigneeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EsignSignee
        fields = [
            "order",
            "signee_type",
            "contact",
            "user",
            "recipient_email",
        ]


# ── Document ────────────────────────────────────────────────────────────


class EsignDocumentListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    signee_count = serializers.SerializerMethodField()

    class Meta:
        model = EsignDocument
        fields = [
            "id",
            "title",
            "status",
            "document_source",
            "email_subject",
            "created_by",
            "created_by_name",
            "signee_count",
            "sent_at",
            "completed_at",
            "created_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return ""

    def get_signee_count(self, obj):
        return obj.signees.count()


class EsignDocumentDetailSerializer(serializers.ModelSerializer):
    signees = EsignSigneeSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    internal_document_title = serializers.SerializerMethodField()

    class Meta:
        model = EsignDocument
        fields = [
            "id",
            "title",
            "status",
            "document_source",
            "file",
            "internal_document",
            "internal_document_title",
            "related_module",
            "related_record_id",
            "email_subject",
            "email_note",
            "created_by",
            "created_by_name",
            "signees",
            "sent_at",
            "completed_at",
            "expires_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return ""

    def get_internal_document_title(self, obj):
        if obj.internal_document:
            return obj.internal_document.title
        return ""


class EsignDocumentCreateSerializer(serializers.ModelSerializer):
    signees = EsignSigneeWriteSerializer(many=True, required=True)

    class Meta:
        model = EsignDocument
        fields = [
            "title",
            "document_source",
            "file",
            "internal_document",
            "related_module",
            "related_record_id",
            "email_subject",
            "email_note",
            "expires_at",
            "signees",
        ]

    def validate_signees(self, value):
        if not value:
            raise serializers.ValidationError("At least one signee is required.")
        return value

    def validate(self, attrs):
        source = attrs.get("document_source", EsignDocument.DocumentSource.UPLOAD)
        if source == EsignDocument.DocumentSource.UPLOAD and not attrs.get("file"):
            raise serializers.ValidationError(
                {"file": "A file is required when document source is 'upload'."}
            )
        if source == EsignDocument.DocumentSource.INTERNAL and not attrs.get(
            "internal_document"
        ):
            raise serializers.ValidationError(
                {
                    "internal_document": "An internal document is required when source is 'internal'."
                }
            )
        return attrs

    def create(self, validated_data):
        signees_data = validated_data.pop("signees")
        validated_data["created_by"] = self.context["request"].user
        esign_doc = EsignDocument.objects.create(**validated_data)
        for idx, signee_data in enumerate(signees_data):
            signee_data.setdefault("order", idx + 1)
            EsignSignee.objects.create(esign_document=esign_doc, **signee_data)
        return esign_doc


class EsignDocumentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EsignDocument
        fields = [
            "title",
            "email_subject",
            "email_note",
            "status",
            "expires_at",
        ]
