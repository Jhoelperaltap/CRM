from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    ArticleViewSet,
    ArticleAttachmentViewSet,
    FAQViewSet,
    PublicArticleView,
    PublicCategoryView,
    PublicFAQView,
    ArticleFeedbackView,
    KBStatsView,
    SearchView,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="kb-category")
router.register(r"articles", ArticleViewSet, basename="kb-article")
router.register(r"attachments", ArticleAttachmentViewSet, basename="kb-attachment")
router.register(r"faqs", FAQViewSet, basename="kb-faq")

urlpatterns = [
    path("", include(router.urls)),
    path("stats/", KBStatsView.as_view(), name="kb-stats"),
    path("search/", SearchView.as_view(), name="kb-search"),
    # Public endpoints
    path(
        "public/categories/", PublicCategoryView.as_view(), name="kb-public-categories"
    ),
    path("public/articles/", PublicArticleView.as_view(), name="kb-public-articles"),
    path(
        "public/articles/<slug:slug>/",
        PublicArticleView.as_view(),
        name="kb-public-article-detail",
    ),
    path("public/faqs/", PublicFAQView.as_view(), name="kb-public-faqs"),
    path(
        "public/articles/<uuid:article_id>/feedback/",
        ArticleFeedbackView.as_view(),
        name="kb-article-feedback",
    ),
]
