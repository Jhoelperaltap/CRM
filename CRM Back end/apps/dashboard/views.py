from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers import TaxCaseListSerializer
from apps.dashboard.models import (
    DashboardWidget,
    StickyNote,
    UserDashboardConfig,
    UserPreference,
)
from apps.dashboard.serializers import (
    DashboardWidgetSerializer,
    StickyNoteCreateSerializer,
    StickyNoteSerializer,
    UserDashboardConfigSerializer,
    UserDashboardConfigUpdateSerializer,
    UserPreferenceSerializer,
)
from apps.dashboard.services import (
    get_appointments_today,
    get_avg_waiting_for_documents_days,
    get_cases_by_fiscal_year,
    get_cases_by_preparer,
    get_cases_by_status,
    get_cases_by_type,
    get_dashboard_stats,
    get_missing_docs,
    get_monthly_filings,
    get_revenue_pipeline,
    get_tasks_by_user,
    get_upcoming_deadlines,
)


class DashboardView(APIView):
    """
    GET — returns all aggregated dashboard data.

    Optional query params: ``date_from``, ``date_to`` (ISO 8601 datetime).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = None
        date_to = None

        raw_from = request.query_params.get("date_from")
        raw_to = request.query_params.get("date_to")
        if raw_from:
            date_from = parse_datetime(raw_from)
        if raw_to:
            date_to = parse_datetime(raw_to)

        stats = get_dashboard_stats(date_from=date_from, date_to=date_to)
        cases_by_status = get_cases_by_status(date_from=date_from, date_to=date_to)
        revenue_pipeline = get_revenue_pipeline(date_from=date_from, date_to=date_to)
        cases_by_preparer = get_cases_by_preparer(date_from=date_from, date_to=date_to)
        cases_by_type = get_cases_by_type(date_from=date_from, date_to=date_to)
        monthly_filings = get_monthly_filings(date_from=date_from, date_to=date_to)
        upcoming_deadlines = TaxCaseListSerializer(
            get_upcoming_deadlines(), many=True
        ).data
        appointments_today = get_appointments_today()
        missing_docs = get_missing_docs()
        tasks_by_user = get_tasks_by_user()
        cases_by_fiscal_year = get_cases_by_fiscal_year()
        avg_waiting_docs = get_avg_waiting_for_documents_days()

        return Response(
            {
                "stats": stats,
                "cases_by_status": cases_by_status,
                "revenue_pipeline": revenue_pipeline,
                "cases_by_preparer": cases_by_preparer,
                "cases_by_type": cases_by_type,
                "monthly_filings": monthly_filings,
                "upcoming_deadlines": upcoming_deadlines,
                "appointments_today": appointments_today,
                "missing_docs": missing_docs,
                "tasks_by_user": tasks_by_user,
                "cases_by_fiscal_year": cases_by_fiscal_year,
                "avg_waiting_docs": avg_waiting_docs,
            },
            status=status.HTTP_200_OK,
        )


class DashboardConfigView(APIView):
    """
    GET  — returns user's widget config (or default layout).
    PUT  — bulk-update the user's widget layout.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        configs = (
            UserDashboardConfig.objects.filter(user=request.user)
            .select_related("widget")
            .order_by("position")
        )

        if not configs.exists():
            # Return default layout from system widgets
            widgets = DashboardWidget.objects.filter(default_enabled=True)
            serializer = DashboardWidgetSerializer(widgets, many=True)
            return Response(
                {"widgets": serializer.data, "is_default": True},
                status=status.HTTP_200_OK,
            )

        serializer = UserDashboardConfigSerializer(configs, many=True)
        return Response(
            {"widgets": serializer.data, "is_default": False},
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        serializer = UserDashboardConfigUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        configs = serializer.save(user=request.user)
        return Response(
            UserDashboardConfigSerializer(configs, many=True).data,
            status=status.HTTP_200_OK,
        )


class DashboardWidgetListView(ListAPIView):
    """List all available system widgets."""

    permission_classes = [IsAuthenticated]
    serializer_class = DashboardWidgetSerializer
    queryset = DashboardWidget.objects.all()
    pagination_class = None


class UserPreferenceView(APIView):
    """
    GET — returns the current user's preferences (creates defaults if none).
    PUT — updates the current user's preferences.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(prefs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        prefs, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class StickyNoteViewSet(viewsets.ModelViewSet):
    """
    CRUD for user's sticky notes.
    Users can only see and manage their own notes.
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == "create":
            return StickyNoteCreateSerializer
        return StickyNoteSerializer

    def get_queryset(self):
        qs = StickyNote.objects.filter(user=self.request.user)

        # Filter by completion status
        show_completed = self.request.query_params.get("show_completed", "true")
        if show_completed.lower() == "false":
            qs = qs.filter(is_completed=False)

        return qs
