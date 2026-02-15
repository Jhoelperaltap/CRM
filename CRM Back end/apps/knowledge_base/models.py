"""
Knowledge Base models for FAQ and help articles.
"""

from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Category(TimeStampedModel):
    """
    Category for organizing knowledge base articles.
    Supports hierarchical structure with parent categories.
    """

    name = models.CharField(_("name"), max_length=100)
    slug = models.SlugField(_("slug"), max_length=120, unique=True)
    description = models.TextField(_("description"), blank=True, default="")
    icon = models.CharField(_("icon"), max_length=50, blank=True, default="")
    color = models.CharField(_("color"), max_length=20, blank=True, default="#3b82f6")

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name=_("parent category"),
    )

    order = models.PositiveIntegerField(_("order"), default=0)
    is_active = models.BooleanField(_("active"), default=True)
    is_public = models.BooleanField(
        _("public"),
        default=True,
        help_text=_("Public categories are visible in the customer portal"),
    )

    class Meta:
        db_table = "kb_categories"
        ordering = ["order", "name"]
        verbose_name = _("category")
        verbose_name_plural = _("categories")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def article_count(self):
        return self.articles.filter(status="published").count()

    @property
    def full_path(self):
        """Return the full category path (e.g., 'Parent > Child')."""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name


class Article(TimeStampedModel):
    """
    Knowledge base article with rich content.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        PUBLISHED = "published", _("Published")
        ARCHIVED = "archived", _("Archived")

    class Visibility(models.TextChoices):
        PUBLIC = "public", _("Public - Visible to all")
        INTERNAL = "internal", _("Internal - Staff only")
        PORTAL = "portal", _("Portal - Logged-in users only")

    title = models.CharField(_("title"), max_length=255)
    slug = models.SlugField(_("slug"), max_length=280, unique=True)
    summary = models.TextField(
        _("summary"),
        max_length=500,
        blank=True,
        default="",
        help_text=_("Brief summary for search results and previews"),
    )
    content = models.TextField(_("content"))

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="articles",
        verbose_name=_("category"),
    )

    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    visibility = models.CharField(
        _("visibility"),
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )

    # Metadata
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="kb_articles",
        verbose_name=_("author"),
    )
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="edited_kb_articles",
        verbose_name=_("last edited by"),
    )

    # SEO and discovery
    tags = models.JSONField(_("tags"), default=list, blank=True)
    keywords = models.TextField(
        _("keywords"),
        blank=True,
        default="",
        help_text=_("Comma-separated keywords for search"),
    )

    # Tracking
    view_count = models.PositiveIntegerField(_("view count"), default=0)
    helpful_count = models.PositiveIntegerField(_("helpful count"), default=0)
    not_helpful_count = models.PositiveIntegerField(_("not helpful count"), default=0)

    # Feature flags
    is_featured = models.BooleanField(_("featured"), default=False)
    is_pinned = models.BooleanField(_("pinned"), default=False)
    allow_comments = models.BooleanField(_("allow comments"), default=True)

    # Publishing
    published_at = models.DateTimeField(_("published at"), null=True, blank=True)
    expires_at = models.DateTimeField(_("expires at"), null=True, blank=True)

    # Related articles
    related_articles = models.ManyToManyField(
        "self",
        blank=True,
        symmetrical=False,
        verbose_name=_("related articles"),
    )

    class Meta:
        db_table = "kb_articles"
        ordering = ["-is_pinned", "-is_featured", "-created_at"]
        verbose_name = _("article")
        verbose_name_plural = _("articles")
        indexes = [
            models.Index(fields=["status", "visibility"]),
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def increment_view(self):
        """Increment view count."""
        self.view_count += 1
        self.save(update_fields=["view_count"])

    @property
    def helpfulness_score(self):
        """Calculate helpfulness percentage."""
        total = self.helpful_count + self.not_helpful_count
        if total == 0:
            return None
        return round((self.helpful_count / total) * 100, 1)


class ArticleAttachment(TimeStampedModel):
    """
    File attachment for knowledge base articles.
    """

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name=_("article"),
    )
    file = models.FileField(_("file"), upload_to="kb/attachments/%Y/%m/")
    name = models.CharField(_("name"), max_length=255)
    file_size = models.PositiveIntegerField(_("file size"), default=0)
    mime_type = models.CharField(_("MIME type"), max_length=100, blank=True)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_("uploaded by"),
    )

    class Meta:
        db_table = "kb_article_attachments"
        ordering = ["name"]
        verbose_name = _("attachment")
        verbose_name_plural = _("attachments")

    def __str__(self):
        return self.name


class ArticleView(TimeStampedModel):
    """
    Track article views for analytics.
    """

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="views",
        verbose_name=_("article"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("user"),
    )
    session_key = models.CharField(_("session key"), max_length=40, blank=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True, default="")
    referrer = models.URLField(_("referrer"), max_length=500, blank=True, default="")

    # Search context
    search_query = models.CharField(
        _("search query"),
        max_length=255,
        blank=True,
        default="",
        help_text=_("Search query that led to this article"),
    )

    class Meta:
        db_table = "kb_article_views"
        ordering = ["-created_at"]
        verbose_name = _("article view")
        verbose_name_plural = _("article views")

    def __str__(self):
        return f"View: {self.article.title}"


class ArticleFeedback(TimeStampedModel):
    """
    User feedback on article helpfulness.
    """

    class FeedbackType(models.TextChoices):
        HELPFUL = "helpful", _("Helpful")
        NOT_HELPFUL = "not_helpful", _("Not Helpful")

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="feedback",
        verbose_name=_("article"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("user"),
    )
    session_key = models.CharField(_("session key"), max_length=40, blank=True)

    feedback_type = models.CharField(
        _("feedback type"),
        max_length=20,
        choices=FeedbackType.choices,
    )
    comment = models.TextField(_("comment"), blank=True, default="")

    # Contact info for follow-up (optional)
    email = models.EmailField(_("email"), blank=True, default="")

    class Meta:
        db_table = "kb_article_feedback"
        ordering = ["-created_at"]
        verbose_name = _("article feedback")
        verbose_name_plural = _("article feedback")
        constraints = [
            models.UniqueConstraint(
                fields=["article", "user"],
                name="unique_user_feedback",
                condition=models.Q(user__isnull=False),
            ),
        ]

    def __str__(self):
        return f"{self.get_feedback_type_display()}: {self.article.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Update article counts
        if is_new:
            if self.feedback_type == self.FeedbackType.HELPFUL:
                self.article.helpful_count += 1
            else:
                self.article.not_helpful_count += 1
            self.article.save(update_fields=["helpful_count", "not_helpful_count"])


class FAQ(TimeStampedModel):
    """
    Frequently Asked Questions - simple Q&A format.
    """

    question = models.CharField(_("question"), max_length=500)
    answer = models.TextField(_("answer"))

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="faqs",
        verbose_name=_("category"),
    )

    order = models.PositiveIntegerField(_("order"), default=0)
    is_active = models.BooleanField(_("active"), default=True)
    is_public = models.BooleanField(_("public"), default=True)

    view_count = models.PositiveIntegerField(_("view count"), default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_faqs",
        verbose_name=_("created by"),
    )

    class Meta:
        db_table = "kb_faqs"
        ordering = ["category", "order", "-created_at"]
        verbose_name = _("FAQ")
        verbose_name_plural = _("FAQs")

    def __str__(self):
        return self.question[:100]
