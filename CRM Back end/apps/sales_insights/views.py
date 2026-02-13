from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sales_insights.services import (
    get_activities_added,
    get_activities_completed,
    get_activity_efficiency,
    get_cases_added,
    get_closed_vs_goals,
    get_funnel_progression,
    get_lost_deals,
    get_pipeline_activity,
    get_pipeline_value,
    get_product_pipeline,
    get_product_revenue,
    get_sales_cycle_duration,
)


class _BaseInsightView(APIView):
    """Base class that extracts common query params."""

    permission_classes = [IsAuthenticated]

    def _params(self, request):
        date_from = parse_date(request.query_params.get("date_from", ""))
        date_to = parse_date(request.query_params.get("date_to", ""))
        group_by = request.query_params.get("group_by", "monthly")
        user_id = request.query_params.get("user") or None
        case_type = request.query_params.get("case_type") or None
        return date_from, date_to, group_by, user_id, case_type


# ---------------------------------------------------------------------------
# Activity Reports
# ---------------------------------------------------------------------------
class ActivitiesAddedView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, group_by, user_id, _ = self._params(request)
        data = get_activities_added(date_from, date_to, group_by, user_id)
        return Response(data)


class ActivitiesCompletedView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, group_by, user_id, _ = self._params(request)
        data = get_activities_completed(date_from, date_to, group_by, user_id)
        return Response(data)


class ActivityEfficiencyView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, _, user_id, _ = self._params(request)
        data = get_activity_efficiency(date_from, date_to, user_id)
        return Response(data)


# ---------------------------------------------------------------------------
# Pipeline Performance
# ---------------------------------------------------------------------------
class CasesAddedView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, group_by, user_id, case_type = self._params(request)
        data = get_cases_added(date_from, date_to, group_by, user_id, case_type)
        return Response(data)


class PipelineValueView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, _, user_id, case_type = self._params(request)
        data = get_pipeline_value(date_from, date_to, user_id, case_type)
        return Response(data)


class PipelineActivityView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, group_by, user_id, _ = self._params(request)
        data = get_pipeline_activity(date_from, date_to, group_by, user_id)
        return Response(data)


class FunnelProgressionView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, _, user_id, case_type = self._params(request)
        data = get_funnel_progression(date_from, date_to, user_id, case_type)
        return Response(data)


class ProductPipelineView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, _, user_id, _ = self._params(request)
        data = get_product_pipeline(date_from, date_to, user_id)
        return Response(data)


# ---------------------------------------------------------------------------
# Sales Results
# ---------------------------------------------------------------------------
class ClosedVsGoalsView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, group_by, user_id, _ = self._params(request)
        data = get_closed_vs_goals(date_from, date_to, group_by, user_id)
        return Response(data)


class ProductRevenueView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, _, user_id, _ = self._params(request)
        data = get_product_revenue(date_from, date_to, user_id)
        return Response(data)


class SalesCycleDurationView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, _, user_id, _ = self._params(request)
        data = get_sales_cycle_duration(date_from, date_to, user_id)
        return Response(data)


class LostDealsView(_BaseInsightView):
    def get(self, request):
        date_from, date_to, group_by, user_id, _ = self._params(request)
        data = get_lost_deals(date_from, date_to, group_by, user_id)
        return Response(data)
