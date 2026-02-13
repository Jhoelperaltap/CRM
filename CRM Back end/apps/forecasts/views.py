from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.forecasts.models import ForecastEntry, SalesQuota
from apps.forecasts.serializers import (
    ForecastEntrySerializer,
    SalesQuotaBulkSerializer,
    SalesQuotaSerializer,
)
from apps.forecasts.services import (
    bulk_set_quotas,
    get_member_quarter_detail,
    get_quarter_summary,
    get_team_user_ids,
    get_totals,
)

User = get_user_model()


class QuotaListView(APIView):
    """List quotas with optional filters: fiscal_year, quarter, user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SalesQuota.objects.select_related("user", "set_by").all()
        fy = request.query_params.get("fiscal_year")
        if fy:
            qs = qs.filter(fiscal_year=int(fy))
        q = request.query_params.get("quarter")
        if q:
            qs = qs.filter(quarter=int(q))
        user_id = request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        serializer = SalesQuotaSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SalesQuotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(set_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuotaBulkSetView(APIView):
    """Bulk set/update quotas for a team."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SalesQuotaBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = bulk_set_quotas(
            items=serializer.validated_data["quotas"],
            set_by=request.user,
            notify=serializer.validated_data["notify_by_email"],
        )
        return Response(
            SalesQuotaSerializer(results, many=True).data,
            status=status.HTTP_200_OK,
        )


class ForecastEntryListView(APIView):
    """List / create forecast entries."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ForecastEntry.objects.select_related("user").all()
        fy = request.query_params.get("fiscal_year")
        if fy:
            qs = qs.filter(fiscal_year=int(fy))
        q = request.query_params.get("quarter")
        if q:
            qs = qs.filter(quarter=int(q))
        user_id = request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        serializer = ForecastEntrySerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ForecastEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ForecastEntryDetailView(APIView):
    """Update a forecast entry."""

    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            entry = ForecastEntry.objects.get(pk=pk)
        except ForecastEntry.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ForecastEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            entry = ForecastEntry.objects.get(pk=pk)
        except ForecastEntry.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForecastSummaryView(APIView):
    """Aggregated quarterly summary for the user's team or specific users."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        fy = int(request.query_params.get("fiscal_year", date.today().year))
        user_ids = get_team_user_ids(request.user)

        quarters = []
        for q in range(1, 5):
            quarters.append(get_quarter_summary(user_ids, fy, q))

        totals = get_totals(user_ids, fy)

        return Response(
            {
                "fiscal_year": fy,
                "quarters": quarters,
                "totals": totals,
            }
        )


class ForecastTeamDetailView(APIView):
    """Per-member breakdown for a given quarter (expandable rows in table)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        fy = int(request.query_params.get("fiscal_year", date.today().year))
        q = int(request.query_params.get("quarter", 1))
        user_ids = get_team_user_ids(request.user)
        members = User.objects.filter(id__in=user_ids, is_active=True)

        data = []
        for member in members:
            data.append(get_member_quarter_detail(member, fy, q))

        return Response(data)


class TeamUsersView(APIView):
    """List of team members (subordinates via role hierarchy) for dropdowns."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_ids = get_team_user_ids(request.user)
        members = User.objects.filter(id__in=user_ids, is_active=True).values(
            "id", "email", "first_name", "last_name"
        )
        data = [
            {
                "id": str(m["id"]),
                "email": m["email"],
                "full_name": f'{m["first_name"]} {m["last_name"]}'.strip()
                or m["email"],
            }
            for m in members
        ]
        return Response(data)
