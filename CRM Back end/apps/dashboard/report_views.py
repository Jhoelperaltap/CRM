from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.report_services import (
    export_to_csv,
    get_case_report,
    get_contact_acquisition,
    get_preparer_performance,
    get_revenue_report,
)


class RevenueReportView(APIView):
    """Revenue report with optional CSV export."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = parse_datetime(request.query_params.get("date_from", "")) or None
        date_to = parse_datetime(request.query_params.get("date_to", "")) or None
        group_by = request.query_params.get("group_by", "monthly")
        filters = {
            "case_type": request.query_params.get("case_type"),
            "preparer": request.query_params.get("preparer"),
            "status": request.query_params.get("status"),
        }

        data = get_revenue_report(date_from, date_to, group_by, filters)

        if request.query_params.get("export") == "csv":
            return export_to_csv(
                data["rows"],
                ["period", "estimated", "actual", "count"],
                "revenue_report.csv",
            )

        return Response(data)


class CaseReportView(APIView):
    """Case analytics with optional CSV export."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = parse_datetime(request.query_params.get("date_from", "")) or None
        date_to = parse_datetime(request.query_params.get("date_to", "")) or None
        filters = {
            "case_type": request.query_params.get("case_type"),
            "preparer": request.query_params.get("preparer"),
        }

        data = get_case_report(date_from, date_to, filters)

        if request.query_params.get("export") == "csv":
            return export_to_csv(
                data["status_breakdown"],
                ["status", "count"],
                "case_report.csv",
            )

        return Response(data)


class PreparerReportView(APIView):
    """Preparer performance with optional CSV export."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = parse_datetime(request.query_params.get("date_from", "")) or None
        date_to = parse_datetime(request.query_params.get("date_to", "")) or None

        data = get_preparer_performance(date_from, date_to)

        if request.query_params.get("export") == "csv":
            return export_to_csv(
                data,
                [
                    "preparer_name",
                    "assigned",
                    "completed",
                    "completion_rate",
                    "revenue_estimated",
                    "revenue_actual",
                ],
                "preparer_report.csv",
            )

        return Response(data)


class ContactReportView(APIView):
    """Contact acquisition report with optional CSV export."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = parse_datetime(request.query_params.get("date_from", "")) or None
        date_to = parse_datetime(request.query_params.get("date_to", "")) or None

        data = get_contact_acquisition(date_from, date_to)

        if request.query_params.get("export") == "csv":
            return export_to_csv(
                data["by_month"],
                ["month", "count"],
                "contact_acquisition.csv",
            )

        return Response(data)
