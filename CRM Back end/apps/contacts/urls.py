from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.contacts.views import (
    ContactTagAssignmentViewSet,
    ContactTagViewSet,
    ContactViewSet,
)

router = DefaultRouter()
router.register("tags", ContactTagViewSet, basename="contact-tags")
router.register(
    "tag-assignments", ContactTagAssignmentViewSet, basename="contact-tag-assignments"
)
router.register("", ContactViewSet, basename="contacts")

urlpatterns = [
    path("", include(router.urls)),
]
