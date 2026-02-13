from rest_framework import serializers

from apps.core.validators import validate_file_type
from apps.documents.models import Document, DocumentFolder, DocumentLink, DocumentTag


# ---------------------------------------------------------------------------
# Inline summary serializers (read-only, used in nested representations)
# ---------------------------------------------------------------------------
class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)


class _CorporationSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class _CaseSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)


# ---------------------------------------------------------------------------
# DocumentFolder serializers
# ---------------------------------------------------------------------------
class DocumentFolderListSerializer(serializers.ModelSerializer):
    document_count = serializers.IntegerField(read_only=True, default=0)
    children_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = DocumentFolder
        fields = [
            "id",
            "name",
            "parent",
            "owner",
            "is_default",
            "document_count",
            "children_count",
        ]
        read_only_fields = fields


class DocumentFolderTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    document_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = DocumentFolder
        fields = [
            "id",
            "name",
            "parent",
            "owner",
            "is_default",
            "document_count",
            "children",
        ]
        read_only_fields = fields

    def get_children(self, obj):
        children_qs = getattr(obj, "_prefetched_children", None)
        if children_qs is None:
            children_qs = obj.children.all()
        return DocumentFolderTreeSerializer(
            children_qs, many=True, context=self.context
        ).data


class DocumentFolderCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentFolder
        fields = ["name", "parent", "description"]

    def validate(self, attrs):
        parent = attrs.get("parent")
        instance = self.instance

        # Prevent circular references
        if parent and instance:
            current = parent
            while current is not None:
                if current.pk == instance.pk:
                    raise serializers.ValidationError(
                        {"parent": "A folder cannot be a descendant of itself."}
                    )
                current = current.parent

        # Uniqueness within same parent
        name = attrs.get("name", getattr(instance, "name", None))
        parent_id = parent.pk if parent else (attrs.get("parent") or None)
        qs = DocumentFolder.objects.filter(name=name, parent=parent_id)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {
                    "name": "A folder with this name already exists in the selected parent."
                }
            )
        return attrs

    def to_representation(self, instance):
        return DocumentFolderListSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# DocumentTag serializers
# ---------------------------------------------------------------------------
class DocumentTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTag
        fields = ["id", "name", "color", "tag_type", "owner", "created_at"]
        read_only_fields = ["id", "owner", "created_at"]


class DocumentTagCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTag
        fields = ["name", "color", "tag_type"]

    def to_representation(self, instance):
        return DocumentTagSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# DocumentLink serializers
# ---------------------------------------------------------------------------
class DocumentLinkListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DocumentLink
        fields = [
            "id",
            "title",
            "url",
            "description",
            "folder",
            "contact",
            "corporation",
            "case",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return ""


class _FolderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentFolder
        fields = ["id", "name"]
        read_only_fields = fields


class DocumentLinkDetailSerializer(serializers.ModelSerializer):
    folder = _FolderSummarySerializer(read_only=True)
    tags = DocumentTagSerializer(many=True, read_only=True)
    contact = _ContactSummarySerializer(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    case = _CaseSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)

    class Meta:
        model = DocumentLink
        fields = [
            "id",
            "title",
            "url",
            "description",
            "folder",
            "tags",
            "contact",
            "corporation",
            "case",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DocumentLinkCreateUpdateSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(
        queryset=DocumentTag.objects.all(), many=True, required=False
    )

    class Meta:
        model = DocumentLink
        fields = [
            "title",
            "url",
            "description",
            "folder",
            "tags",
            "contact",
            "corporation",
            "case",
        ]

    def to_representation(self, instance):
        return DocumentLinkDetailSerializer(instance, context=self.context).data


# ---------------------------------------------------------------------------
# Document serializers (updated)
# ---------------------------------------------------------------------------
class DocumentListSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
        source="tags", many=True, read_only=True
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "doc_type",
            "status",
            "file_size",
            "mime_type",
            "version",
            "is_encrypted",
            "parent_document",
            "contact",
            "corporation",
            "case",
            "folder",
            "folder_name",
            "tag_ids",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name()
        return ""

    def get_folder_name(self, obj):
        if obj.folder:
            return obj.folder.name
        return None


class DocumentDetailSerializer(serializers.ModelSerializer):
    contact = _ContactSummarySerializer(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    case = _CaseSummarySerializer(read_only=True)
    uploaded_by = _UserSummarySerializer(read_only=True)
    folder = _FolderSummarySerializer(read_only=True)
    tags = DocumentTagSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "doc_type",
            "status",
            "description",
            "file_size",
            "mime_type",
            "version",
            "is_encrypted",
            "encryption_key_id",
            "parent_document",
            "contact",
            "corporation",
            "case",
            "folder",
            "tags",
            "uploaded_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DocumentCreateUpdateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False)
    tags = serializers.PrimaryKeyRelatedField(
        queryset=DocumentTag.objects.all(), many=True, required=False
    )

    class Meta:
        model = Document
        fields = [
            "title",
            "file",
            "doc_type",
            "status",
            "description",
            "contact",
            "corporation",
            "case",
            "folder",
            "tags",
            "parent_document",
        ]

    def validate_file(self, value):
        """
        Validate uploaded file by checking magic bytes match extension.

        Security: Prevents file type spoofing attacks where malicious files
        are uploaded with fake extensions.
        """
        if value:
            try:
                validate_file_type(value)
            except Exception as e:
                raise serializers.ValidationError(str(e))
        return value

    def to_representation(self, instance):
        return DocumentDetailSerializer(instance, context=self.context).data
