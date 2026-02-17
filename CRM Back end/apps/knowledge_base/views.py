from django.db.models import Avg, F, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import FAQ, Article, ArticleAttachment, ArticleFeedback, Category
from .serializers import (
    ArticleAttachmentSerializer,
    ArticleListSerializer,
    ArticlePublicSerializer,
    ArticleSerializer,
    CategorySerializer,
    CategoryTreeSerializer,
    FAQPublicSerializer,
    FAQSerializer,
)


class PublicKBRateThrottle(AnonRateThrottle):
    """Rate limit for public knowledge base endpoints."""

    rate = "60/minute"


class FeedbackRateThrottle(AnonRateThrottle):
    """Rate limit for feedback submissions to prevent spam."""

    rate = "10/hour"


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing knowledge base categories.
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter by public status
        is_public = self.request.query_params.get("is_public")
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == "true")

        # Filter top-level only
        top_level = self.request.query_params.get("top_level")
        if top_level and top_level.lower() == "true":
            queryset = queryset.filter(parent__isnull=True)

        return queryset.order_by("order", "name")

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """Get categories as a nested tree structure."""
        categories = Category.objects.filter(
            is_active=True, parent__isnull=True
        ).order_by("order", "name")
        serializer = CategoryTreeSerializer(categories, many=True)
        return Response(serializer.data)


class ArticleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing knowledge base articles.
    """

    queryset = Article.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return ArticleListSerializer
        return ArticleSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related("category", "author")

        # Status filter
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Category filter
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)

        # Visibility filter
        visibility = self.request.query_params.get("visibility")
        if visibility:
            queryset = queryset.filter(visibility=visibility)

        # Featured filter
        is_featured = self.request.query_params.get("is_featured")
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == "true")

        # Search
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(summary__icontains=search)
                | Q(content__icontains=search)
                | Q(keywords__icontains=search)
            )

        return queryset.order_by("-is_pinned", "-is_featured", "-created_at")

    def perform_create(self, serializer):
        article = serializer.save(author=self.request.user)
        if article.status == "published" and not article.published_at:
            article.published_at = timezone.now()
            article.save()

    def perform_update(self, serializer):
        article = serializer.save(last_edited_by=self.request.user)
        if article.status == "published" and not article.published_at:
            article.published_at = timezone.now()
            article.save()

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish a draft article."""
        article = self.get_object()
        if article.status == "published":
            return Response(
                {"error": "Article is already published"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        article.status = "published"
        article.published_at = timezone.now()
        article.save()
        return Response({"message": "Article published"})

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        """Unpublish an article (back to draft)."""
        article = self.get_object()
        article.status = "draft"
        article.save()
        return Response({"message": "Article unpublished"})

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive an article."""
        article = self.get_object()
        article.status = "archived"
        article.save()
        return Response({"message": "Article archived"})

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Create a copy of the article."""
        article = self.get_object()

        new_article = Article.objects.create(
            title=f"{article.title} (Copy)",
            summary=article.summary,
            content=article.content,
            category=article.category,
            status="draft",
            visibility=article.visibility,
            author=request.user,
            tags=article.tags,
            keywords=article.keywords,
            allow_comments=article.allow_comments,
        )

        serializer = self.get_serializer(new_article)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def upload_attachment(self, request, pk=None):
        """Upload an attachment to the article."""
        article = self.get_object()
        file = request.FILES.get("file")

        if not file:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        attachment = ArticleAttachment.objects.create(
            article=article,
            file=file,
            name=file.name,
            file_size=file.size,
            mime_type=file.content_type,
            uploaded_by=request.user,
        )

        serializer = ArticleAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ArticleAttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing article attachments.
    """

    queryset = ArticleAttachment.objects.all()
    serializer_class = ArticleAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        article = self.request.query_params.get("article")
        if article:
            queryset = queryset.filter(article_id=article)

        return queryset


class FAQViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing FAQs.
    """

    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().select_related("category", "created_by")

        # Category filter
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)

        # Active filter
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Public filter
        is_public = self.request.query_params.get("is_public")
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == "true")

        # Search
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(question__icontains=search) | Q(answer__icontains=search)
            )

        return queryset.order_by("category", "order", "-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        """Change the order of a FAQ."""
        faq = self.get_object()
        new_order = request.data.get("order")

        if new_order is None:
            return Response(
                {"error": "order is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        faq.order = new_order
        faq.save()
        return Response({"message": "FAQ reordered"})


class PublicArticleView(APIView):
    """
    Public view for published articles.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PublicKBRateThrottle]

    def get(self, request, slug=None):
        if slug:
            # Get single article
            try:
                article = Article.objects.get(
                    slug=slug, status="published", visibility="public"
                )

                # Track view
                article.increment_view()

                serializer = ArticlePublicSerializer(article)
                return Response(serializer.data)
            except Article.DoesNotExist:
                return Response(
                    {"error": "Article not found"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            # List articles
            articles = Article.objects.filter(
                status="published", visibility="public"
            ).select_related("category", "author")

            # Category filter
            category = request.query_params.get("category")
            if category:
                articles = articles.filter(category__slug=category)

            # Search
            search = request.query_params.get("search")
            if search:
                articles = articles.filter(
                    Q(title__icontains=search)
                    | Q(summary__icontains=search)
                    | Q(content__icontains=search)
                )

            # Pagination with input validation
            try:
                limit = int(request.query_params.get("limit", 20))
                offset = int(request.query_params.get("offset", 0))
                # Enforce reasonable limits to prevent abuse
                limit = max(1, min(limit, 100))  # Between 1 and 100
                offset = max(0, offset)  # Non-negative
            except (ValueError, TypeError):
                return Response(
                    {"error": "Invalid limit or offset value"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            total = articles.count()
            articles = articles[offset : offset + limit]

            serializer = ArticleListSerializer(articles, many=True)
            return Response(
                {
                    "results": serializer.data,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                }
            )


class PublicCategoryView(APIView):
    """
    Public view for categories.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PublicKBRateThrottle]

    def get(self, request):
        categories = Category.objects.filter(
            is_active=True, is_public=True, parent__isnull=True
        ).order_by("order", "name")

        serializer = CategoryTreeSerializer(categories, many=True)
        return Response(serializer.data)


class PublicFAQView(APIView):
    """
    Public view for FAQs.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PublicKBRateThrottle]

    def get(self, request):
        faqs = (
            FAQ.objects.filter(is_active=True, is_public=True)
            .select_related("category")
            .order_by("category", "order")
        )

        # Category filter
        category = request.query_params.get("category")
        if category:
            faqs = faqs.filter(category__slug=category)

        # Search
        search = request.query_params.get("search")
        if search:
            faqs = faqs.filter(
                Q(question__icontains=search) | Q(answer__icontains=search)
            )

        serializer = FAQPublicSerializer(faqs, many=True)
        return Response(serializer.data)


class ArticleFeedbackView(APIView):
    """
    Submit feedback for an article.
    """

    permission_classes = [AllowAny]
    throttle_classes = [FeedbackRateThrottle]

    def post(self, request, article_id):
        try:
            article = Article.objects.get(id=article_id, status="published")
        except Article.DoesNotExist:
            return Response(
                {"error": "Article not found"}, status=status.HTTP_404_NOT_FOUND
            )

        feedback_type = request.data.get("feedback_type")
        if feedback_type not in ["helpful", "not_helpful"]:
            return Response(
                {"error": "Invalid feedback type"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check for existing feedback
        user = request.user if request.user.is_authenticated else None
        session_key = request.session.session_key or ""

        existing = ArticleFeedback.objects.filter(article=article)
        if user:
            existing = existing.filter(user=user)
        elif session_key:
            existing = existing.filter(session_key=session_key)

        if existing.exists():
            return Response(
                {"error": "Feedback already submitted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ArticleFeedback.objects.create(
            article=article,
            user=user,
            session_key=session_key,
            feedback_type=feedback_type,
            comment=request.data.get("comment", ""),
            email=request.data.get("email", ""),
        )

        return Response(
            {"message": "Feedback submitted"}, status=status.HTTP_201_CREATED
        )


class KBStatsView(APIView):
    """
    Get knowledge base statistics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_articles = Article.objects.count()
        published_articles = Article.objects.filter(status="published").count()
        draft_articles = Article.objects.filter(status="draft").count()
        total_categories = Category.objects.filter(is_active=True).count()
        total_faqs = FAQ.objects.filter(is_active=True).count()
        total_views = Article.objects.aggregate(total=Sum("view_count"))["total"] or 0

        # Calculate average helpfulness
        articles_with_feedback = Article.objects.filter(helpful_count__gt=0).annotate(
            helpfulness=(
                F("helpful_count")
                * 100.0
                / (F("helpful_count") + F("not_helpful_count"))
            )
        )
        avg_helpfulness = articles_with_feedback.aggregate(avg=Avg("helpfulness"))[
            "avg"
        ]

        # Get popular articles
        popular_articles = Article.objects.filter(status="published").order_by(
            "-view_count"
        )[:5]

        data = {
            "total_articles": total_articles,
            "published_articles": published_articles,
            "draft_articles": draft_articles,
            "total_categories": total_categories,
            "total_faqs": total_faqs,
            "total_views": total_views,
            "avg_helpfulness": round(avg_helpfulness, 1) if avg_helpfulness else None,
            "popular_articles": ArticleListSerializer(popular_articles, many=True).data,
        }

        return Response(data)


class SearchView(APIView):
    """
    Search across knowledge base content.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PublicKBRateThrottle]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response({"articles": [], "faqs": []})

        # Search articles
        articles = (
            Article.objects.filter(status="published", visibility="public")
            .filter(
                Q(title__icontains=query)
                | Q(summary__icontains=query)
                | Q(content__icontains=query)
                | Q(keywords__icontains=query)
                | Q(tags__icontains=query)
            )
            .select_related("category")[:10]
        )

        # Search FAQs
        faqs = (
            FAQ.objects.filter(is_active=True, is_public=True)
            .filter(Q(question__icontains=query) | Q(answer__icontains=query))
            .select_related("category")[:10]
        )

        return Response(
            {
                "articles": ArticleListSerializer(articles, many=True).data,
                "faqs": FAQPublicSerializer(faqs, many=True).data,
            }
        )
