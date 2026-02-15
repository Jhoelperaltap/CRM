"""
URL routing for Activity Timeline and Comments.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.activities.views import ActivityViewSet, CommentViewSet

router = DefaultRouter()
router.register(r"activities", ActivityViewSet, basename="activity")
router.register(r"comments", CommentViewSet, basename="comment")

app_name = "activities"

urlpatterns = [
    path("", include(router.urls)),
]
