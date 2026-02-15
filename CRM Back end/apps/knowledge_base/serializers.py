from rest_framework import serializers

from .models import FAQ, Article, ArticleAttachment, ArticleFeedback, Category


class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True)
    full_path = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "color",
            "parent",
            "order",
            "is_active",
            "is_public",
            "article_count",
            "full_path",
            "children_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Serializer for nested category tree."""

    children = serializers.SerializerMethodField()
    article_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "color", "article_count", "children"]

    def get_children(self, obj):
        children = obj.children.filter(is_active=True).order_by("order", "name")
        return CategoryTreeSerializer(children, many=True).data


class ArticleAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.get_full_name", read_only=True
    )

    class Meta:
        model = ArticleAttachment
        fields = [
            "id",
            "file",
            "name",
            "file_size",
            "mime_type",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "file_size", "mime_type", "uploaded_by", "created_at"]


class ArticleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for article lists."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    helpfulness_score = serializers.FloatField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "category",
            "category_name",
            "status",
            "visibility",
            "author",
            "author_name",
            "view_count",
            "helpfulness_score",
            "is_featured",
            "is_pinned",
            "published_at",
            "created_at",
            "updated_at",
        ]


class ArticleSerializer(serializers.ModelSerializer):
    """Full serializer for article detail/create/update."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    last_edited_by_name = serializers.CharField(
        source="last_edited_by.get_full_name", read_only=True
    )
    attachments = ArticleAttachmentSerializer(many=True, read_only=True)
    helpfulness_score = serializers.FloatField(read_only=True)
    related_article_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Article.objects.filter(status="published"),
        source="related_articles",
        required=False,
    )

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "category",
            "category_name",
            "status",
            "visibility",
            "author",
            "author_name",
            "last_edited_by",
            "last_edited_by_name",
            "tags",
            "keywords",
            "view_count",
            "helpful_count",
            "not_helpful_count",
            "helpfulness_score",
            "is_featured",
            "is_pinned",
            "allow_comments",
            "published_at",
            "expires_at",
            "related_articles",
            "related_article_ids",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "author",
            "last_edited_by",
            "view_count",
            "helpful_count",
            "not_helpful_count",
            "created_at",
            "updated_at",
        ]


class ArticlePublicSerializer(serializers.ModelSerializer):
    """Serializer for public-facing article view."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    attachments = ArticleAttachmentSerializer(many=True, read_only=True)
    helpfulness_score = serializers.FloatField(read_only=True)
    related_articles = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "category",
            "category_name",
            "author_name",
            "tags",
            "view_count",
            "helpfulness_score",
            "is_featured",
            "allow_comments",
            "published_at",
            "attachments",
            "related_articles",
        ]

    def get_related_articles(self, obj):
        related = obj.related_articles.filter(status="published")[:5]
        return ArticleListSerializer(related, many=True).data


class ArticleFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleFeedback
        fields = ["id", "article", "feedback_type", "comment", "email", "created_at"]
        read_only_fields = ["id", "created_at"]


class FAQSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = FAQ
        fields = [
            "id",
            "question",
            "answer",
            "category",
            "category_name",
            "order",
            "is_active",
            "is_public",
            "view_count",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "view_count",
            "created_by",
            "created_at",
            "updated_at",
        ]


class FAQPublicSerializer(serializers.ModelSerializer):
    """Serializer for public FAQ listing."""

    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = FAQ
        fields = ["id", "question", "answer", "category", "category_name"]


class ArticleSearchSerializer(serializers.Serializer):
    """Serializer for search results."""

    query = serializers.CharField(max_length=255, required=True)
    category = serializers.UUIDField(required=False)
    limit = serializers.IntegerField(min_value=1, max_value=50, default=10)


class KBStatsSerializer(serializers.Serializer):
    """Serializer for knowledge base statistics."""

    total_articles = serializers.IntegerField()
    published_articles = serializers.IntegerField()
    draft_articles = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    total_faqs = serializers.IntegerField()
    total_views = serializers.IntegerField()
    avg_helpfulness = serializers.FloatField(allow_null=True)
    popular_articles = ArticleListSerializer(many=True)
