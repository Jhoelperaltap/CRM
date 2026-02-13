from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.models import Report, ReportFolder
from apps.reports.serializers import (
    ReportCreateUpdateSerializer,
    ReportDetailSerializer,
    ReportFolderCreateUpdateSerializer,
    ReportFolderSerializer,
    ReportListSerializer,
)
from apps.reports.services import execute_report, get_module_fields


class ReportFolderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = None
    queryset = ReportFolder.objects.annotate(_report_count=Count("reports"))

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ReportFolderCreateUpdateSerializer
        return ReportFolderSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Report.objects.select_related("folder", "owner").all()

        # Filters from query params
        name = self.request.query_params.get("search")
        if name:
            qs = qs.filter(name__icontains=name)

        report_type = self.request.query_params.get("report_type")
        if report_type:
            qs = qs.filter(report_type=report_type)

        primary_module = self.request.query_params.get("primary_module")
        if primary_module:
            qs = qs.filter(primary_module=primary_module)

        folder = self.request.query_params.get("folder")
        if folder:
            qs = qs.filter(folder_id=folder)

        owner = self.request.query_params.get("owner")
        if owner:
            qs = qs.filter(owner_id=owner)

        frequency = self.request.query_params.get("frequency")
        if frequency:
            qs = qs.filter(frequency=frequency)

        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ReportCreateUpdateSerializer
        if self.action == "retrieve":
            return ReportDetailSerializer
        return ReportListSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Track access
        Report.objects.filter(pk=instance.pk).update(last_accessed=timezone.now())
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def run(self, request, pk=None):
        """Execute the report and return paginated results."""
        report = self.get_object()
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))
        result = execute_report(report, page=page, page_size=page_size)
        return Response(result)


class ModuleFieldsView(APIView):
    """Return available fields for a given primary module (for report builder)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        module = request.query_params.get("module", "")
        fields = get_module_fields(module)
        return Response(fields)
