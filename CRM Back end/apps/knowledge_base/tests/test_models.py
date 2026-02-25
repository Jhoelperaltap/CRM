"""
Tests for knowledge base models.
"""

import pytest

from apps.knowledge_base.models import (
    Article,
    ArticleAttachment,
    ArticleFeedback,
    ArticleView,
    Category,
    FAQ,
)
from tests.factories import (
    KBArticleFactory,
    KBCategoryFactory,
    KBFAQFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestCategory:
    """Tests for Category model."""

    def test_str_representation(self):
        category = KBCategoryFactory(name="Tax Services")
        assert str(category) == "Tax Services"

    def test_auto_slug_generation(self):
        category = Category.objects.create(name="New Category")
        assert category.slug == "new-category"

    def test_slug_unique(self):
        KBCategoryFactory(slug="unique-slug")
        category2 = KBCategoryFactory.build(slug="unique-slug")
        with pytest.raises(Exception):
            category2.save()

    def test_model_default_values(self):
        """Test the model's actual default values (not factory)."""
        category = Category.objects.create(name="Test", slug="test-slug")
        assert category.is_active is True
        assert category.is_public is True
        assert category.order == 0
        assert category.color == "#3b82f6"

    def test_factory_creates_valid_category(self):
        category = KBCategoryFactory()
        assert category.is_active is True
        assert category.is_public is True

    def test_parent_child_relationship(self):
        parent = KBCategoryFactory(name="Parent")
        child = KBCategoryFactory(name="Child", parent=parent)

        assert child.parent == parent
        assert child in parent.children.all()

    def test_full_path_property(self):
        parent = KBCategoryFactory(name="Parent")
        child = KBCategoryFactory(name="Child", parent=parent)

        assert parent.full_path == "Parent"
        assert child.full_path == "Parent > Child"

    def test_article_count_property(self):
        category = KBCategoryFactory()
        KBArticleFactory(category=category, status="published")
        KBArticleFactory(category=category, status="published")
        KBArticleFactory(category=category, status="draft")  # Should not count

        assert category.article_count == 2

    def test_ordering(self):
        cat1 = KBCategoryFactory(name="Z Category", order=10)
        cat2 = KBCategoryFactory(name="A Category", order=5)

        categories = list(Category.objects.filter(id__in=[cat1.id, cat2.id]))
        assert categories[0] == cat2
        assert categories[1] == cat1


@pytest.mark.django_db
class TestArticle:
    """Tests for Article model."""

    def test_str_representation(self):
        article = KBArticleFactory(title="How to File Taxes")
        assert str(article) == "How to File Taxes"

    def test_auto_slug_generation(self):
        article = Article.objects.create(
            title="My Article Title",
            content="Content here",
        )
        assert article.slug == "my-article-title"

    def test_model_default_values(self):
        """Test the model's actual default values (not factory)."""
        article = Article.objects.create(
            title="Test",
            slug="test-slug",
            content="Content",
        )
        assert article.status == "draft"
        assert article.visibility == "public"
        assert article.view_count == 0
        assert article.helpful_count == 0
        assert article.not_helpful_count == 0
        assert article.is_featured is False
        assert article.is_pinned is False
        assert article.allow_comments is True

    def test_factory_creates_published_article(self):
        """Factory creates articles with status=published by default."""
        article = KBArticleFactory()
        assert article.status == "published"
        assert article.visibility == "public"

    def test_status_choices(self):
        assert Article.Status.DRAFT == "draft"
        assert Article.Status.PUBLISHED == "published"
        assert Article.Status.ARCHIVED == "archived"

    def test_visibility_choices(self):
        assert Article.Visibility.PUBLIC == "public"
        assert Article.Visibility.INTERNAL == "internal"
        assert Article.Visibility.PORTAL == "portal"

    def test_increment_view(self):
        article = KBArticleFactory(view_count=5)
        article.increment_view()
        article.refresh_from_db()
        assert article.view_count == 6

    def test_helpfulness_score_no_feedback(self):
        article = KBArticleFactory(helpful_count=0, not_helpful_count=0)
        assert article.helpfulness_score is None

    def test_helpfulness_score_calculation(self):
        article = KBArticleFactory(helpful_count=8, not_helpful_count=2)
        assert article.helpfulness_score == 80.0

    def test_helpfulness_score_all_positive(self):
        article = KBArticleFactory(helpful_count=10, not_helpful_count=0)
        assert article.helpfulness_score == 100.0

    def test_related_articles_relationship(self):
        article1 = KBArticleFactory()
        article2 = KBArticleFactory()
        article1.related_articles.add(article2)

        assert article2 in article1.related_articles.all()
        # Asymmetric relationship
        assert article1 not in article2.related_articles.all()

    def test_category_relationship(self):
        category = KBCategoryFactory()
        article = KBArticleFactory(category=category)

        assert article.category == category
        assert article in category.articles.all()

    def test_author_relationship(self):
        user = UserFactory()
        article = KBArticleFactory(author=user)

        assert article.author == user
        assert article in user.kb_articles.all()

    def test_ordering(self):
        article1 = KBArticleFactory(is_pinned=False, is_featured=False)
        article2 = KBArticleFactory(is_pinned=True, is_featured=False)
        article3 = KBArticleFactory(is_pinned=False, is_featured=True)

        articles = list(Article.objects.filter(id__in=[article1.id, article2.id, article3.id]))
        # Pinned first, then featured
        assert articles[0] == article2
        assert articles[1] == article3


@pytest.mark.django_db
class TestArticleAttachment:
    """Tests for ArticleAttachment model."""

    def test_str_representation(self):
        article = KBArticleFactory()
        attachment = ArticleAttachment.objects.create(
            article=article,
            name="document.pdf",
            file="kb/attachments/document.pdf",
        )
        assert str(attachment) == "document.pdf"

    def test_article_relationship(self):
        article = KBArticleFactory()
        attachment = ArticleAttachment.objects.create(
            article=article,
            name="document.pdf",
            file="kb/attachments/document.pdf",
        )
        assert attachment.article == article
        assert attachment in article.attachments.all()


@pytest.mark.django_db
class TestArticleView:
    """Tests for ArticleView model."""

    def test_str_representation(self):
        article = KBArticleFactory(title="Tax Guide")
        view = ArticleView.objects.create(article=article)
        assert "Tax Guide" in str(view)

    def test_article_relationship(self):
        article = KBArticleFactory()
        view = ArticleView.objects.create(article=article)

        assert view.article == article
        assert view in article.views.all()

    def test_user_relationship(self):
        user = UserFactory()
        article = KBArticleFactory()
        view = ArticleView.objects.create(article=article, user=user)

        assert view.user == user


@pytest.mark.django_db
class TestArticleFeedback:
    """Tests for ArticleFeedback model."""

    def test_str_representation(self):
        article = KBArticleFactory(title="Tax Guide")
        feedback = ArticleFeedback.objects.create(
            article=article,
            feedback_type="helpful",
        )
        assert "Helpful" in str(feedback)
        assert "Tax Guide" in str(feedback)

    def test_feedback_types(self):
        assert ArticleFeedback.FeedbackType.HELPFUL == "helpful"
        assert ArticleFeedback.FeedbackType.NOT_HELPFUL == "not_helpful"

    def test_helpful_feedback_saves_correctly(self):
        article = KBArticleFactory()
        feedback = ArticleFeedback.objects.create(
            article=article,
            feedback_type="helpful",
        )
        assert feedback.pk is not None
        assert feedback.feedback_type == "helpful"
        assert feedback.article == article

    def test_not_helpful_feedback_saves_correctly(self):
        article = KBArticleFactory()
        feedback = ArticleFeedback.objects.create(
            article=article,
            feedback_type="not_helpful",
        )
        assert feedback.pk is not None
        assert feedback.feedback_type == "not_helpful"
        assert feedback.article == article

    def test_unique_user_feedback_constraint(self):
        user = UserFactory()
        article = KBArticleFactory()
        ArticleFeedback.objects.create(
            article=article,
            user=user,
            feedback_type="helpful",
        )
        with pytest.raises(Exception):
            ArticleFeedback.objects.create(
                article=article,
                user=user,
                feedback_type="not_helpful",
            )


@pytest.mark.django_db
class TestFAQ:
    """Tests for FAQ model."""

    def test_str_representation(self):
        faq = KBFAQFactory(question="What are your business hours?")
        assert "What are your business hours?" in str(faq)

    def test_truncated_str_for_long_questions(self):
        long_question = "Q" * 150
        faq = KBFAQFactory(question=long_question)
        assert len(str(faq)) <= 100

    def test_model_default_values(self):
        """Test the model's actual default values (not factory)."""
        faq = FAQ.objects.create(
            question="Test question?",
            answer="Test answer.",
        )
        assert faq.is_active is True
        assert faq.is_public is True
        assert faq.view_count == 0
        assert faq.order == 0

    def test_factory_creates_valid_faq(self):
        faq = KBFAQFactory()
        assert faq.is_active is True
        assert faq.is_public is True

    def test_category_relationship(self):
        category = KBCategoryFactory()
        faq = KBFAQFactory(category=category)

        assert faq.category == category
        assert faq in category.faqs.all()

    def test_created_by_relationship(self):
        user = UserFactory()
        faq = KBFAQFactory(created_by=user)

        assert faq.created_by == user
        assert faq in user.created_faqs.all()

    def test_ordering(self):
        category = KBCategoryFactory()
        faq1 = KBFAQFactory(category=category, order=10)
        faq2 = KBFAQFactory(category=category, order=5)

        faqs = list(FAQ.objects.filter(id__in=[faq1.id, faq2.id]))
        assert faqs[0] == faq2
        assert faqs[1] == faq1
