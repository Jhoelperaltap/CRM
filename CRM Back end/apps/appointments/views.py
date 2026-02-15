from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.appointments.filters import AppointmentFilter
from apps.appointments.models import Appointment, AppointmentPage
from apps.appointments.serializers import (
    AppointmentCalendarSerializer,
    AppointmentCreateUpdateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    AppointmentPageCreateUpdateSerializer,
    AppointmentPageDetailSerializer,
    AppointmentPageListSerializer,
    AppointmentQuickCreateSerializer,
)
from apps.users.permissions import ModulePermission


class AppointmentViewSet(viewsets.ModelViewSet):
    """CRUD for appointments."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "appointments"
    filterset_class = AppointmentFilter
    search_fields = ["title", "contact__first_name", "contact__last_name"]
    ordering_fields = ["start_datetime", "end_datetime", "status", "created_at"]
    ordering = ["-start_datetime"]

    def get_queryset(self):
        return Appointment.objects.select_related(
            "contact", "assigned_to", "created_by", "case"
        ).all()

    def get_serializer_class(self):
        if self.action == "list":
            return AppointmentListSerializer
        if self.action in ("create", "update", "partial_update"):
            return AppointmentCreateUpdateSerializer
        if self.action == "calendar":
            return AppointmentCalendarSerializer
        if self.action == "quick_create":
            return AppointmentQuickCreateSerializer
        return AppointmentDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="calendar")
    def calendar(self, request):
        """
        Flat list of appointments for calendar rendering.

        Query params:
        - start_date: ISO date string (required)
        - end_date: ISO date string (required)
        - assigned_to: comma-separated UUIDs (optional)
        """
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not start_date or not end_date:
            return Response(
                {"detail": "start_date and end_date are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = self.get_queryset().filter(
            start_datetime__date__lte=end_date,
            end_datetime__date__gte=start_date,
        )

        # Filter by assigned_to (comma-separated UUIDs)
        assigned_to = request.query_params.get("assigned_to")
        if assigned_to:
            user_ids = [uid.strip() for uid in assigned_to.split(",") if uid.strip()]
            qs = qs.filter(assigned_to__id__in=user_ids)

        qs = qs.order_by("start_datetime")
        serializer = AppointmentCalendarSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="quick-create")
    def quick_create(self, request):
        """Create an appointment with minimal fields."""
        serializer = AppointmentQuickCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AppointmentPageViewSet(viewsets.ModelViewSet):
    """CRUD for public appointment booking pages."""

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = AppointmentPage.objects.select_related(
            "meet_with", "assigned_to", "created_by"
        ).all()

        page_type = self.request.query_params.get("page_type")
        if page_type:
            qs = qs.filter(page_type=page_type)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)

        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AppointmentPageCreateUpdateSerializer
        if self.action == "retrieve":
            return AppointmentPageDetailSerializer
        return AppointmentPageListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
