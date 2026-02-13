from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsAdminRole
from apps.business_hours.models import BusinessHours
from apps.business_hours.serializers import (
    BusinessHoursCreateUpdateSerializer,
    BusinessHoursDetailSerializer,
    BusinessHoursListSerializer,
)


class BusinessHoursViewSet(viewsets.ModelViewSet):
    """
    CRUD for Business Hours configurations.

    Endpoints
    ---------
    GET    /                list (paginated)
    POST   /                create
    GET    /{id}/           retrieve
    PUT    /{id}/           full update
    PATCH  /{id}/           partial update
    DELETE /{id}/           destroy
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    search_fields = ["name"]
    ordering_fields = ["name", "is_default", "created_at"]
    ordering = ["-is_default", "name"]

    def get_queryset(self):
        return (
            BusinessHours.objects.prefetch_related(
                "working_days__intervals",
                "holidays",
            )
            .annotate(
                working_day_count=Count("working_days", distinct=True),
                holiday_count=Count("holidays", distinct=True),
            )
        )

    def get_serializer_class(self):
        if self.action == "list":
            return BusinessHoursListSerializer
        if self.action in ("create", "update", "partial_update"):
            return BusinessHoursCreateUpdateSerializer
        return BusinessHoursDetailSerializer
