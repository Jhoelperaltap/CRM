"""
Tests for knowledge base API views.
"""

import pytest
from rest_framework import status

from apps.knowledge_base.models import FAQ, Article, ArticleFeedback
from tests.factories import (
    KBArticleFactory,
    KBCategoryFactory,
    KBFAQFactory,
)

BASE_URL = "/api/v1/knowledge-base/"


@pytest.mark.django_db
class TestCategoryViewSet:
    """Tests for CategoryViewSet."""

    def test_list_categories(self, admin_client):
        KBCategoryFactory(name="Category 1")
        KBCategoryFactory(name="Category 2")

        resp = admin_client.get(f"{BASE_URL}categories/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        assert len(resp.data["results"]) == 2

    def test_create_category(self, admin_client):
        resp = admin_client.post(
            f"{BASE_URL}categories/",
            {
                "name": "New Category",
                "slug": "new-category",
                "description": "A new category",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Category"

    def test_update_category(self, admin_client):
        category = KBCategoryFactory()

        resp = admin_client.patch(
            f"{BASE_URL}categories/{category.id}/",
            {"name": "Updated Name"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Updated Name"

    def test_delete_category(self, admin_client):
        category = KBCategoryFactory()

        resp = admin_client.delete(f"{BASE_URL}categories/{category.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_active(self, admin_client):
        KBCategoryFactory(is_active=True)
        KBCategoryFactory(is_active=False)

        resp = admin_client.get(f"{BASE_URL}categories/?is_active=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_public(self, admin_client):
        KBCategoryFactory(is_public=True)
        KBCategoryFactory(is_public=False)

        resp = admin_client.get(f"{BASE_URL}categories/?is_public=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_top_level_only(self, admin_client):
        parent = KBCategoryFactory()
        KBCategoryFactory(parent=parent)  # Child

        resp = admin_client.get(f"{BASE_URL}categories/?top_level=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_tree_action(self, admin_client):
        parent = KBCategoryFactory(is_active=True)
        KBCategoryFactory(parent=parent, is_active=True)

        resp = admin_client.get(f"{BASE_URL}categories/tree/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1  # Only top-level

    def test_unauthenticated_access_denied(self, api_client):
        resp = api_client.get(f"{BASE_URL}categories/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestArticleViewSet:
    """Tests for ArticleViewSet."""

    def test_list_articles(self, admin_client, admin_user):
        KBArticleFactory(author=admin_user)
        KBArticleFactory(author=admin_user)

        resp = admin_client.get(f"{BASE_URL}articles/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        assert len(resp.data["results"]) == 2

    def test_create_article(self, admin_client):
        category = KBCategoryFactory()

        resp = admin_client.post(
            f"{BASE_URL}articles/",
            {
                "title": "New Article",
                "slug": "new-article",
                "content": "Article content here",
                "category": str(category.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "New Article"

    def test_create_article_sets_author(self, admin_client, admin_user):
        resp = admin_client.post(
            f"{BASE_URL}articles/",
            {
                "title": "My Article",
                "slug": "my-article",
                "content": "Content",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        article = Article.objects.get(id=resp.data["id"])
        assert article.author == admin_user

    def test_update_article(self, admin_client, admin_user):
        article = KBArticleFactory(author=admin_user)

        resp = admin_client.patch(
            f"{BASE_URL}articles/{article.id}/",
            {"title": "Updated Title"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Updated Title"

    def test_update_article_sets_last_edited_by(self, admin_client, admin_user):
        article = KBArticleFactory()

        resp = admin_client.patch(
            f"{BASE_URL}articles/{article.id}/",
            {"title": "Edited"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        article.refresh_from_db()
        assert article.last_edited_by == admin_user

    def test_delete_article(self, admin_client, admin_user):
        article = KBArticleFactory(author=admin_user)

        resp = admin_client.delete(f"{BASE_URL}articles/{article.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_status(self, admin_client, admin_user):
        KBArticleFactory(author=admin_user, status="draft")
        KBArticleFactory(author=admin_user, status="published")

        resp = admin_client.get(f"{BASE_URL}articles/?status=draft")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_category(self, admin_client, admin_user):
        category = KBCategoryFactory()
        KBArticleFactory(author=admin_user, category=category)
        KBArticleFactory(author=admin_user)

        resp = admin_client.get(f"{BASE_URL}articles/?category={category.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_visibility(self, admin_client, admin_user):
        KBArticleFactory(author=admin_user, visibility="public")
        KBArticleFactory(author=admin_user, visibility="internal")

        resp = admin_client.get(f"{BASE_URL}articles/?visibility=internal")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_featured(self, admin_client, admin_user):
        KBArticleFactory(author=admin_user, is_featured=True)
        KBArticleFactory(author=admin_user, is_featured=False)

        resp = admin_client.get(f"{BASE_URL}articles/?is_featured=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_search_articles(self, admin_client, admin_user):
        # Use unique search term to avoid interference from other tests
        unique_term = "UniqueSearchTerm12345"
        KBArticleFactory(author=admin_user, title=f"{unique_term} Filing Guide")
        KBArticleFactory(author=admin_user, title="Business Setup")

        resp = admin_client.get(f"{BASE_URL}articles/?search={unique_term}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_publish_action(self, admin_client, admin_user):
        article = KBArticleFactory(author=admin_user, status="draft")

        resp = admin_client.post(f"{BASE_URL}articles/{article.id}/publish/")
        assert resp.status_code == status.HTTP_200_OK

        article.refresh_from_db()
        assert article.status == "published"
        assert article.published_at is not None

    def test_publish_already_published(self, admin_client, admin_user):
        article = KBArticleFactory(author=admin_user, status="published")

        resp = admin_client.post(f"{BASE_URL}articles/{article.id}/publish/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unpublish_action(self, admin_client, admin_user):
        article = KBArticleFactory(author=admin_user, status="published")

        resp = admin_client.post(f"{BASE_URL}articles/{article.id}/unpublish/")
        assert resp.status_code == status.HTTP_200_OK

        article.refresh_from_db()
        assert article.status == "draft"

    def test_archive_action(self, admin_client, admin_user):
        article = KBArticleFactory(author=admin_user, status="published")

        resp = admin_client.post(f"{BASE_URL}articles/{article.id}/archive/")
        assert resp.status_code == status.HTTP_200_OK

        article.refresh_from_db()
        assert article.status == "archived"

    def test_duplicate_action(self, admin_client, admin_user):
        article = KBArticleFactory(
            author=admin_user,
            title="Original Article",
            status="published",
        )

        resp = admin_client.post(f"{BASE_URL}articles/{article.id}/duplicate/")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Original Article (Copy)"
        assert resp.data["status"] == "draft"


@pytest.mark.django_db
class TestFAQViewSet:
    """Tests for FAQViewSet."""

    def test_list_faqs(self, admin_client, admin_user):
        KBFAQFactory(created_by=admin_user)
        KBFAQFactory(created_by=admin_user)

        resp = admin_client.get(f"{BASE_URL}faqs/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        assert len(resp.data["results"]) == 2

    def test_create_faq(self, admin_client):
        resp = admin_client.post(
            f"{BASE_URL}faqs/",
            {
                "question": "What are your hours?",
                "answer": "We are open 9-5 M-F.",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["question"] == "What are your hours?"

    def test_create_faq_sets_created_by(self, admin_client, admin_user):
        resp = admin_client.post(
            f"{BASE_URL}faqs/",
            {
                "question": "Question?",
                "answer": "Answer.",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        faq = FAQ.objects.get(id=resp.data["id"])
        assert faq.created_by == admin_user

    def test_update_faq(self, admin_client, admin_user):
        faq = KBFAQFactory(created_by=admin_user)

        resp = admin_client.patch(
            f"{BASE_URL}faqs/{faq.id}/",
            {"answer": "Updated answer."},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["answer"] == "Updated answer."

    def test_delete_faq(self, admin_client, admin_user):
        faq = KBFAQFactory(created_by=admin_user)

        resp = admin_client.delete(f"{BASE_URL}faqs/{faq.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_category(self, admin_client, admin_user):
        category = KBCategoryFactory()
        KBFAQFactory(created_by=admin_user, category=category)
        KBFAQFactory(created_by=admin_user)

        resp = admin_client.get(f"{BASE_URL}faqs/?category={category.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_active(self, admin_client, admin_user):
        KBFAQFactory(created_by=admin_user, is_active=True)
        KBFAQFactory(created_by=admin_user, is_active=False)

        resp = admin_client.get(f"{BASE_URL}faqs/?is_active=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_public(self, admin_client, admin_user):
        KBFAQFactory(created_by=admin_user, is_public=True)
        KBFAQFactory(created_by=admin_user, is_public=False)

        resp = admin_client.get(f"{BASE_URL}faqs/?is_public=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_search_faqs(self, admin_client, admin_user):
        KBFAQFactory(created_by=admin_user, question="How do I pay?")
        KBFAQFactory(created_by=admin_user, question="What services do you offer?")

        resp = admin_client.get(f"{BASE_URL}faqs/?search=pay")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_reorder_action(self, admin_client, admin_user):
        faq = KBFAQFactory(created_by=admin_user, order=0)

        resp = admin_client.post(
            f"{BASE_URL}faqs/{faq.id}/reorder/",
            {"order": 5},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        faq.refresh_from_db()
        assert faq.order == 5

    def test_reorder_without_order_fails(self, admin_client, admin_user):
        faq = KBFAQFactory(created_by=admin_user)

        resp = admin_client.post(
            f"{BASE_URL}faqs/{faq.id}/reorder/",
            {},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPublicArticleView:
    """Tests for PublicArticleView."""

    def test_list_public_articles(self, api_client):
        KBArticleFactory(status="published", visibility="public")
        KBArticleFactory(status="published", visibility="public")
        KBArticleFactory(status="draft", visibility="public")  # Should not appear
        KBArticleFactory(status="published", visibility="internal")  # Should not appear

        resp = api_client.get(f"{BASE_URL}public/articles/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total"] == 2
        assert len(resp.data["results"]) == 2

    def test_get_single_public_article(self, api_client):
        KBArticleFactory(
            status="published",
            visibility="public",
            slug="test-article",
        )

        resp = api_client.get(f"{BASE_URL}public/articles/test-article/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["slug"] == "test-article"

    def test_get_article_increments_view_count(self, api_client):
        article = KBArticleFactory(
            status="published",
            visibility="public",
            slug="viewed-article",
            view_count=5,
        )

        resp = api_client.get(f"{BASE_URL}public/articles/viewed-article/")
        assert resp.status_code == status.HTTP_200_OK

        article.refresh_from_db()
        assert article.view_count == 6

    def test_get_nonexistent_article(self, api_client):
        resp = api_client.get(f"{BASE_URL}public/articles/nonexistent/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_filter_by_category(self, api_client):
        category = KBCategoryFactory(slug="tax")
        KBArticleFactory(status="published", visibility="public", category=category)
        KBArticleFactory(status="published", visibility="public")

        resp = api_client.get(f"{BASE_URL}public/articles/?category=tax")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total"] == 1

    def test_search_public_articles(self, api_client):
        KBArticleFactory(status="published", visibility="public", title="Tax Filing")
        KBArticleFactory(status="published", visibility="public", title="Business Tips")

        resp = api_client.get(f"{BASE_URL}public/articles/?search=tax")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total"] == 1

    def test_pagination(self, api_client):
        for _ in range(25):
            KBArticleFactory(status="published", visibility="public")

        resp = api_client.get(f"{BASE_URL}public/articles/?limit=10&offset=0")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total"] == 25
        assert len(resp.data["results"]) == 10
        assert resp.data["limit"] == 10
        assert resp.data["offset"] == 0


@pytest.mark.django_db
class TestPublicCategoryView:
    """Tests for PublicCategoryView."""

    def test_list_public_categories(self, api_client):
        KBCategoryFactory(is_active=True, is_public=True)
        KBCategoryFactory(is_active=True, is_public=True)
        KBCategoryFactory(is_active=False, is_public=True)  # Should not appear
        KBCategoryFactory(is_active=True, is_public=False)  # Should not appear

        resp = api_client.get(f"{BASE_URL}public/categories/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_only_top_level_returned(self, api_client):
        parent = KBCategoryFactory(is_active=True, is_public=True)
        KBCategoryFactory(is_active=True, is_public=True, parent=parent)

        resp = api_client.get(f"{BASE_URL}public/categories/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1


@pytest.mark.django_db
class TestPublicFAQView:
    """Tests for PublicFAQView."""

    def test_list_public_faqs(self, api_client):
        KBFAQFactory(is_active=True, is_public=True)
        KBFAQFactory(is_active=True, is_public=True)
        KBFAQFactory(is_active=False, is_public=True)  # Should not appear
        KBFAQFactory(is_active=True, is_public=False)  # Should not appear

        resp = api_client.get(f"{BASE_URL}public/faqs/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_filter_by_category(self, api_client):
        category = KBCategoryFactory(slug="tax-faqs")
        KBFAQFactory(is_active=True, is_public=True, category=category)
        KBFAQFactory(is_active=True, is_public=True)

        resp = api_client.get(f"{BASE_URL}public/faqs/?category=tax-faqs")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_search_public_faqs(self, api_client):
        # Use unique search term to avoid interference from other tests
        unique_term = "UniquePaymentTerm98765"
        KBFAQFactory(
            is_active=True, is_public=True, question=f"How do I {unique_term}?"
        )
        KBFAQFactory(is_active=True, is_public=True, question="What services?")

        resp = api_client.get(f"{BASE_URL}public/faqs/?search={unique_term}")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1


@pytest.mark.django_db
class TestArticleFeedbackView:
    """Tests for ArticleFeedbackView.

    Note: Using authenticated_client to bypass AnonRateThrottle.
    The feedback endpoint uses AllowAny permission, so authenticated users
    can still submit feedback.
    """

    def test_submit_helpful_feedback(self, authenticated_client):
        article = KBArticleFactory(
            status="published",
            helpful_count=0,
            not_helpful_count=0,
        )

        resp = authenticated_client.post(
            f"{BASE_URL}public/articles/{article.id}/feedback/",
            {"feedback_type": "helpful"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_submit_not_helpful_feedback(self, authenticated_client):
        article = KBArticleFactory(
            status="published",
            helpful_count=0,
            not_helpful_count=0,
        )

        resp = authenticated_client.post(
            f"{BASE_URL}public/articles/{article.id}/feedback/",
            {"feedback_type": "not_helpful"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_invalid_feedback_type(self, authenticated_client):
        article = KBArticleFactory(status="published")

        resp = authenticated_client.post(
            f"{BASE_URL}public/articles/{article.id}/feedback/",
            {"feedback_type": "invalid"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_feedback_nonexistent_article(self, authenticated_client):
        import uuid

        fake_id = uuid.uuid4()
        resp = authenticated_client.post(
            f"{BASE_URL}public/articles/{fake_id}/feedback/",
            {"feedback_type": "helpful"},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_feedback_with_comment(self, authenticated_client):
        article = KBArticleFactory(status="published")

        resp = authenticated_client.post(
            f"{BASE_URL}public/articles/{article.id}/feedback/",
            {
                "feedback_type": "not_helpful",
                "comment": "Missing information about tax deadlines.",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        feedback = ArticleFeedback.objects.get(article=article)
        assert feedback.comment == "Missing information about tax deadlines."


@pytest.mark.django_db
class TestKBStatsView:
    """Tests for KBStatsView."""

    def test_get_stats(self, admin_client, admin_user):
        KBArticleFactory(author=admin_user, status="published")
        KBArticleFactory(author=admin_user, status="published")
        KBArticleFactory(author=admin_user, status="draft")
        KBCategoryFactory(is_active=True)
        KBFAQFactory(is_active=True, created_by=admin_user)

        resp = admin_client.get(f"{BASE_URL}stats/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_articles"] == 3
        assert resp.data["published_articles"] == 2
        assert resp.data["draft_articles"] == 1
        assert resp.data["total_categories"] >= 1
        assert resp.data["total_faqs"] >= 1

    def test_stats_includes_popular_articles(self, admin_client, admin_user):
        KBArticleFactory(author=admin_user, status="published", view_count=100)
        KBArticleFactory(author=admin_user, status="published", view_count=50)

        resp = admin_client.get(f"{BASE_URL}stats/")
        assert resp.status_code == status.HTTP_200_OK
        assert "popular_articles" in resp.data
        assert len(resp.data["popular_articles"]) == 2

    def test_unauthenticated_cannot_access_stats(self, api_client):
        resp = api_client.get(f"{BASE_URL}stats/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSearchView:
    """Tests for SearchView."""

    def test_search_finds_articles(self, api_client):
        KBArticleFactory(
            status="published",
            visibility="public",
            title="Tax Filing Guide",
        )
        KBArticleFactory(
            status="published",
            visibility="public",
            title="Business Setup",
        )

        resp = api_client.get(f"{BASE_URL}search/?q=tax")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["articles"]) >= 1
        titles = [a["title"] for a in resp.data["articles"]]
        assert "Tax Filing Guide" in titles

    def test_search_finds_faqs(self, api_client):
        KBFAQFactory(
            is_active=True,
            is_public=True,
            question="How do I file taxes?",
        )
        KBFAQFactory(
            is_active=True,
            is_public=True,
            question="What services do you offer?",
        )

        resp = api_client.get(f"{BASE_URL}search/?q=taxes")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["faqs"]) == 1

    def test_search_both_articles_and_faqs(self, api_client):
        KBArticleFactory(
            status="published",
            visibility="public",
            title="Tax Guide",
        )
        KBFAQFactory(
            is_active=True,
            is_public=True,
            question="Tax deadline?",
        )

        resp = api_client.get(f"{BASE_URL}search/?q=tax")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["articles"]) == 1
        assert len(resp.data["faqs"]) == 1

    def test_search_too_short_query(self, api_client):
        resp = api_client.get(f"{BASE_URL}search/?q=a")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["articles"] == []
        assert resp.data["faqs"] == []

    def test_search_empty_query(self, api_client):
        resp = api_client.get(f"{BASE_URL}search/?q=")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["articles"] == []
        assert resp.data["faqs"] == []

    def test_search_excludes_draft_articles(self, api_client):
        KBArticleFactory(status="draft", visibility="public", title="Draft Tax")
        KBArticleFactory(status="published", visibility="public", title="Published Tax")

        resp = api_client.get(f"{BASE_URL}search/?q=tax")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["articles"]) == 1

    def test_search_excludes_internal_articles(self, api_client):
        KBArticleFactory(
            status="published", visibility="internal", title="Internal Tax"
        )
        KBArticleFactory(status="published", visibility="public", title="Public Tax")

        resp = api_client.get(f"{BASE_URL}search/?q=tax")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["articles"]) == 1


@pytest.mark.django_db
class TestArticleAttachmentViewSet:
    """Tests for ArticleAttachmentViewSet."""

    def test_list_attachments(self, admin_client, admin_user):
        from apps.knowledge_base.models import ArticleAttachment

        article = KBArticleFactory(author=admin_user)
        ArticleAttachment.objects.create(
            article=article,
            name="doc1.pdf",
            file="kb/attachments/doc1.pdf",
        )
        ArticleAttachment.objects.create(
            article=article,
            name="doc2.pdf",
            file="kb/attachments/doc2.pdf",
        )

        resp = admin_client.get(f"{BASE_URL}attachments/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        assert len(resp.data["results"]) == 2

    def test_filter_by_article(self, admin_client, admin_user):
        from apps.knowledge_base.models import ArticleAttachment

        article1 = KBArticleFactory(author=admin_user)
        article2 = KBArticleFactory(author=admin_user)
        ArticleAttachment.objects.create(
            article=article1,
            name="doc1.pdf",
            file="kb/attachments/doc1.pdf",
        )
        ArticleAttachment.objects.create(
            article=article2,
            name="doc2.pdf",
            file="kb/attachments/doc2.pdf",
        )

        resp = admin_client.get(f"{BASE_URL}attachments/?article={article1.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
