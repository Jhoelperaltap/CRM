"""
Serializers for Activity Timeline and Comments.
"""

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from apps.activities.models import Activity, Comment, CommentReaction
from apps.users.models import User, Department
from apps.documents.models import DepartmentClientFolder


class UserMiniSerializer(serializers.ModelSerializer):
    """Minimal user info for activity/comment display."""

    full_name = serializers.CharField(read_only=True)
    initials = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "first_name",
            "last_name",
            "initials",
            "avatar",
        ]

    def get_initials(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name[0]}{obj.last_name[0]}".upper()
        elif obj.first_name:
            return obj.first_name[:2].upper()
        return obj.email[:2].upper()


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for Activity timeline items."""

    performed_by = UserMiniSerializer(read_only=True)
    activity_type_display = serializers.CharField(
        source="get_activity_type_display", read_only=True
    )
    entity_type = serializers.SerializerMethodField()
    entity_id = serializers.UUIDField(source="object_id", read_only=True)
    related_entity_type = serializers.SerializerMethodField()
    related_entity_id = serializers.UUIDField(
        source="related_object_id", read_only=True
    )
    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            "id",
            "activity_type",
            "activity_type_display",
            "title",
            "description",
            "metadata",
            "performed_by",
            "entity_type",
            "entity_id",
            "related_entity_type",
            "related_entity_id",
            "department_name",
            "created_at",
            "time_ago",
        ]
        read_only_fields = fields

    def get_entity_type(self, obj):
        if obj.content_type:
            return obj.content_type.model
        return None

    def get_related_entity_type(self, obj):
        if obj.related_content_type:
            return obj.related_content_type.model
        return None

    def get_time_ago(self, obj):
        """Return human-readable time ago string."""
        now = timezone.now()
        diff = now - obj.created_at
        seconds = diff.total_seconds()

        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")


class ActivityCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating activities."""

    entity_type = serializers.ChoiceField(
        choices=["contact", "corporation"], write_only=True
    )
    entity_id = serializers.UUIDField(write_only=True)
    related_entity_type = serializers.CharField(
        required=False, allow_null=True, write_only=True
    )
    related_entity_id = serializers.UUIDField(
        required=False, allow_null=True, write_only=True
    )

    class Meta:
        model = Activity
        fields = [
            "activity_type",
            "title",
            "description",
            "metadata",
            "entity_type",
            "entity_id",
            "related_entity_type",
            "related_entity_id",
            "department",
        ]

    def create(self, validated_data):
        entity_type = validated_data.pop("entity_type")
        entity_id = validated_data.pop("entity_id")
        related_entity_type = validated_data.pop("related_entity_type", None)
        related_entity_id = validated_data.pop("related_entity_id", None)

        # Get content type for entity
        content_type = ContentType.objects.get(model=entity_type)
        validated_data["content_type"] = content_type
        validated_data["object_id"] = entity_id

        # Get content type for related entity if provided
        if related_entity_type and related_entity_id:
            related_content_type = ContentType.objects.get(model=related_entity_type)
            validated_data["related_content_type"] = related_content_type
            validated_data["related_object_id"] = related_entity_id

        # Set performed_by to current user
        validated_data["performed_by"] = self.context["request"].user

        return super().create(validated_data)


class CommentReactionSerializer(serializers.ModelSerializer):
    """Serializer for comment reactions."""

    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = CommentReaction
        fields = ["id", "reaction_type", "user", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class DepartmentMiniSerializer(serializers.ModelSerializer):
    """Minimal department info for comment display."""

    class Meta:
        model = Department
        fields = ["id", "name", "code", "color"]


class DepartmentFolderMiniSerializer(serializers.ModelSerializer):
    """Minimal department folder info."""

    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = DepartmentClientFolder
        fields = ["id", "name", "department", "department_name"]


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for comments."""

    author = UserMiniSerializer(read_only=True)
    mentioned_users = UserMiniSerializer(many=True, read_only=True)
    mentioned_departments = DepartmentMiniSerializer(many=True, read_only=True)
    reactions = CommentReactionSerializer(many=True, read_only=True)
    reaction_counts = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    entity_type = serializers.SerializerMethodField()
    entity_id = serializers.UUIDField(source="object_id", read_only=True)
    time_ago = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    department_folder_info = DepartmentFolderMiniSerializer(
        source="department_folder", read_only=True
    )

    class Meta:
        model = Comment
        fields = [
            "id",
            "content",
            "author",
            "mentioned_users",
            "mentioned_departments",
            "parent",
            "is_edited",
            "edited_at",
            "reactions",
            "reaction_counts",
            "replies_count",
            "entity_type",
            "entity_id",
            "send_email",
            "email_sent",
            "department_folder",
            "department_folder_info",
            "created_at",
            "time_ago",
            "can_edit",
            "can_delete",
        ]
        read_only_fields = [
            "id",
            "author",
            "mentioned_users",
            "mentioned_departments",
            "is_edited",
            "edited_at",
            "reactions",
            "email_sent",
            "department_folder_info",
            "created_at",
        ]

    def get_entity_type(self, obj):
        if obj.content_type:
            return obj.content_type.model
        return None

    def get_reaction_counts(self, obj):
        """Return count of each reaction type."""
        counts = {}
        for reaction in obj.reactions.all():
            counts[reaction.reaction_type] = counts.get(reaction.reaction_type, 0) + 1
        return counts

    def get_replies_count(self, obj):
        return obj.replies.filter(is_deleted=False).count()

    def get_time_ago(self, obj):
        """Return human-readable time ago string."""
        now = timezone.now()
        diff = now - obj.created_at
        seconds = diff.total_seconds()

        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if request and request.user:
            return obj.author_id == request.user.id
        return False

    def get_can_delete(self, obj):
        request = self.context.get("request")
        if request and request.user:
            return obj.author_id == request.user.id or request.user.role == "admin"
        return False


class CommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments."""

    entity_type = serializers.ChoiceField(
        choices=["contact", "corporation"], write_only=True
    )
    entity_id = serializers.UUIDField(write_only=True)
    send_email = serializers.BooleanField(default=False, required=False)
    department_folder = serializers.PrimaryKeyRelatedField(
        queryset=DepartmentClientFolder.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Comment
        fields = [
            "content",
            "parent",
            "entity_type",
            "entity_id",
            "send_email",
            "department_folder",
        ]

    def create(self, validated_data):
        entity_type = validated_data.pop("entity_type")
        entity_id = validated_data.pop("entity_id")

        # Get content type for entity
        content_type = ContentType.objects.get(model=entity_type)
        validated_data["content_type"] = content_type
        validated_data["object_id"] = entity_id

        # Set author to current user
        validated_data["author"] = self.context["request"].user

        comment = super().create(validated_data)

        # Create activity for this comment
        Activity.objects.create(
            content_type=content_type,
            object_id=entity_id,
            activity_type=Activity.ActivityType.COMMENT_ADDED,
            title=f"{comment.author.full_name} added a comment",
            description=comment.content[:200]
            + ("..." if len(comment.content) > 200 else ""),
            performed_by=comment.author,
            related_content_type=ContentType.objects.get_for_model(Comment),
            related_object_id=comment.id,
        )

        return comment


class CommentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating comments."""

    class Meta:
        model = Comment
        fields = ["content"]

    def update(self, instance, validated_data):
        instance.content = validated_data.get("content", instance.content)
        instance.is_edited = True
        instance.edited_at = timezone.now()
        instance.save()
        return instance


class MentionSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for @mention suggestions (users)."""

    display_name = serializers.SerializerMethodField()
    mention_key = serializers.SerializerMethodField()
    suggestion_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "mention_key",
            "avatar",
            "suggestion_type",
        ]

    def get_display_name(self, obj):
        return obj.full_name or obj.email

    def get_mention_key(self, obj):
        """Return the key to use for @mentions."""
        if obj.first_name:
            return obj.first_name.lower()
        return obj.email.split("@")[0].lower()

    def get_suggestion_type(self, obj):
        return "user"


class DepartmentMentionSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for @mention suggestions (departments)."""

    display_name = serializers.SerializerMethodField()
    mention_key = serializers.SerializerMethodField()
    suggestion_type = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "code",
            "color",
            "icon",
            "display_name",
            "mention_key",
            "suggestion_type",
            "user_count",
        ]

    def get_display_name(self, obj):
        return obj.name

    def get_mention_key(self, obj):
        """Return the key to use for @mentions (department code)."""
        return obj.code.lower()

    def get_suggestion_type(self, obj):
        return "department"

    def get_user_count(self, obj):
        return obj.users.filter(is_active=True).count()
