from rest_framework import serializers

from apps.documents.models import DepartmentClientFolder
from apps.users.serializers_department import DepartmentSummarySerializer


class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["full_name"] = f"{data['first_name']} {data['last_name']}".strip()
        return data


class _CorporationSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class DepartmentClientFolderListSerializer(serializers.ModelSerializer):
    """List serializer for department client folders."""

    document_count = serializers.IntegerField(read_only=True, default=0)
    children_count = serializers.IntegerField(read_only=True, default=0)
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_color = serializers.CharField(source="department.color", read_only=True)
    path = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentClientFolder
        fields = [
            "id",
            "name",
            "department",
            "department_name",
            "department_color",
            "contact",
            "corporation",
            "parent",
            "is_default",
            "document_count",
            "children_count",
            "path",
            "created_at",
        ]
        read_only_fields = fields

    def get_path(self, obj):
        return obj.get_path()


class DepartmentClientFolderTreeSerializer(serializers.ModelSerializer):
    """Tree serializer with nested children for folder hierarchy."""

    children = serializers.SerializerMethodField()
    document_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = DepartmentClientFolder
        fields = [
            "id",
            "name",
            "department",
            "contact",
            "corporation",
            "parent",
            "is_default",
            "document_count",
            "children",
        ]
        read_only_fields = fields

    def get_children(self, obj):
        children_qs = getattr(obj, "_prefetched_children", None)
        if children_qs is None:
            children_qs = obj.children.all()
        return DepartmentClientFolderTreeSerializer(
            children_qs, many=True, context=self.context
        ).data


class DepartmentClientFolderDetailSerializer(serializers.ModelSerializer):
    """Detail serializer with expanded related objects."""

    department = DepartmentSummarySerializer(read_only=True)
    contact = _ContactSummarySerializer(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    document_count = serializers.IntegerField(read_only=True, default=0)
    path = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentClientFolder
        fields = [
            "id",
            "name",
            "department",
            "contact",
            "corporation",
            "parent",
            "description",
            "is_default",
            "created_by",
            "document_count",
            "path",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_path(self, obj):
        return obj.get_path()


class DepartmentClientFolderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating department client folders."""

    class Meta:
        model = DepartmentClientFolder
        fields = [
            "name",
            "department",
            "contact",
            "corporation",
            "parent",
            "description",
        ]

    def validate(self, attrs):
        contact = attrs.get("contact")
        corporation = attrs.get("corporation")

        # Ensure exactly one client type is specified
        if contact and corporation:
            raise serializers.ValidationError(
                "A folder can only be linked to either a Contact or Corporation, not both."
            )
        if not contact and not corporation:
            raise serializers.ValidationError(
                "A folder must be linked to either a Contact or Corporation."
            )

        # Validate parent belongs to same department and client
        parent = attrs.get("parent")
        if parent:
            if parent.department != attrs.get("department"):
                raise serializers.ValidationError(
                    {"parent": "Parent folder must belong to the same department."}
                )
            if contact and parent.contact != contact:
                raise serializers.ValidationError(
                    {"parent": "Parent folder must belong to the same contact."}
                )
            if corporation and parent.corporation != corporation:
                raise serializers.ValidationError(
                    {"parent": "Parent folder must belong to the same corporation."}
                )

        # Check for duplicate name within same parent
        name = attrs.get("name")
        department = attrs.get("department")
        qs = DepartmentClientFolder.objects.filter(
            name=name,
            department=department,
            parent=parent,
        )
        if contact:
            qs = qs.filter(contact=contact)
        if corporation:
            qs = qs.filter(corporation=corporation)

        if qs.exists():
            raise serializers.ValidationError(
                {"name": "A folder with this name already exists in this location."}
            )

        return attrs

    def create(self, validated_data):
        # Set created_by from request context
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)

    def to_representation(self, instance):
        return DepartmentClientFolderDetailSerializer(
            instance, context=self.context
        ).data


class DepartmentClientFolderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating department client folders."""

    class Meta:
        model = DepartmentClientFolder
        fields = ["name", "description", "parent"]

    def validate(self, attrs):
        instance = self.instance
        parent = attrs.get("parent")

        # Prevent circular references
        if parent and instance:
            current = parent
            visited = set()
            while current is not None and current.pk not in visited:
                if current.pk == instance.pk:
                    raise serializers.ValidationError(
                        {"parent": "A folder cannot be its own ancestor."}
                    )
                visited.add(current.pk)
                current = current.parent

        # Validate parent belongs to same department and client
        if parent:
            if parent.department != instance.department:
                raise serializers.ValidationError(
                    {"parent": "Parent folder must belong to the same department."}
                )
            if instance.contact and parent.contact != instance.contact:
                raise serializers.ValidationError(
                    {"parent": "Parent folder must belong to the same contact."}
                )
            if instance.corporation and parent.corporation != instance.corporation:
                raise serializers.ValidationError(
                    {"parent": "Parent folder must belong to the same corporation."}
                )

        # Check for duplicate name within same parent
        name = attrs.get("name", instance.name)
        new_parent = attrs.get("parent", instance.parent)
        qs = DepartmentClientFolder.objects.filter(
            name=name,
            department=instance.department,
            parent=new_parent,
        )
        if instance.contact:
            qs = qs.filter(contact=instance.contact)
        if instance.corporation:
            qs = qs.filter(corporation=instance.corporation)
        qs = qs.exclude(pk=instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                {"name": "A folder with this name already exists in this location."}
            )

        return attrs

    def to_representation(self, instance):
        return DepartmentClientFolderDetailSerializer(
            instance, context=self.context
        ).data


class InitializeFoldersSerializer(serializers.Serializer):
    """Serializer for initializing default folders for a client."""

    contact = serializers.UUIDField(required=False, allow_null=True)
    corporation = serializers.UUIDField(required=False, allow_null=True)
    department = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        contact = attrs.get("contact")
        corporation = attrs.get("corporation")

        if contact and corporation:
            raise serializers.ValidationError(
                "Specify either contact or corporation, not both."
            )
        if not contact and not corporation:
            raise serializers.ValidationError(
                "Either contact or corporation is required."
            )

        return attrs
