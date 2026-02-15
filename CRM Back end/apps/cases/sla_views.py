from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .sla_models import SLA, CaseSLAStatus, EscalationRule, SLABreach
from .sla_serializers import (
    CaseSLAStatusSerializer,
    EscalationRuleSerializer,
    PauseSLASerializer,
    SLABreachSerializer,
    SLAListSerializer,
    SLAMetricsSerializer,
    SLASerializer,
)
from .sla_services import check_sla_status, get_sla_metrics


class SLAViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing SLA configurations.
    """

    queryset = SLA.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return SLAListSerializer
        return SLASerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        """Set this SLA as the default."""
        sla = self.get_object()
        SLA.objects.filter(is_default=True).exclude(pk=sla.pk).update(is_default=False)
        sla.is_default = True
        sla.save()
        return Response({"message": "SLA set as default"})

    @action(detail=True, methods=["get"])
    def escalation_rules(self, request, pk=None):
        """Get escalation rules for this SLA."""
        sla = self.get_object()
        rules = sla.escalation_rules.all().order_by("order")
        serializer = EscalationRuleSerializer(rules, many=True)
        return Response(serializer.data)


class EscalationRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing escalation rules.
    """

    queryset = EscalationRule.objects.all()
    serializer_class = EscalationRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by SLA
        sla_id = self.request.query_params.get("sla")
        if sla_id:
            queryset = queryset.filter(sla_id=sla_id)

        return queryset.order_by("sla", "order")

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        """Change the order of a rule."""
        rule = self.get_object()
        new_order = request.data.get("order")

        if new_order is None:
            return Response(
                {"error": "order is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        rule.order = new_order
        rule.save()

        return Response({"message": "Rule reordered"})


class SLABreachViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing SLA breaches.
    """

    queryset = SLABreach.objects.all()
    serializer_class = SLABreachSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().select_related("case", "sla", "assigned_to")

        # Filter by breach type
        breach_type = self.request.query_params.get("breach_type")
        if breach_type:
            queryset = queryset.filter(breach_type=breach_type)

        # Filter by resolved status
        is_resolved = self.request.query_params.get("is_resolved")
        if is_resolved is not None:
            queryset = queryset.filter(is_resolved=is_resolved.lower() == "true")

        # Filter by assigned user
        assigned_to = self.request.query_params.get("assigned_to")
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(breach_time__gte=start_date)
        if end_date:
            queryset = queryset.filter(breach_time__lte=end_date)

        return queryset

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Acknowledge a breach."""
        breach = self.get_object()

        if breach.escalation_acknowledged:
            return Response(
                {"error": "Breach already acknowledged"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        breach.escalation_acknowledged = True
        breach.escalation_acknowledged_by = request.user
        breach.escalation_acknowledged_at = timezone.now()
        breach.save()

        return Response({"message": "Breach acknowledged"})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Mark a breach as resolved."""
        breach = self.get_object()

        if breach.is_resolved:
            return Response(
                {"error": "Breach already resolved"}, status=status.HTTP_400_BAD_REQUEST
            )

        breach.is_resolved = True
        breach.resolved_at = timezone.now()
        breach.resolution_notes = request.data.get("notes", "")
        breach.save()

        return Response({"message": "Breach resolved"})


class CaseSLAStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing case SLA statuses.
    """

    queryset = CaseSLAStatus.objects.all()
    serializer_class = CaseSLAStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().select_related("case", "sla")

        # Filter by status
        response_status = self.request.query_params.get("response_status")
        if response_status:
            queryset = queryset.filter(response_status=response_status)

        resolution_status = self.request.query_params.get("resolution_status")
        if resolution_status:
            queryset = queryset.filter(resolution_status=resolution_status)

        # Filter by breached
        breached = self.request.query_params.get("breached")
        if breached is not None:
            is_breached = breached.lower() == "true"
            from django.db.models import Q

            if is_breached:
                queryset = queryset.filter(
                    Q(response_breached=True) | Q(resolution_breached=True)
                )
            else:
                queryset = queryset.filter(
                    response_breached=False, resolution_breached=False
                )

        # Filter by paused
        is_paused = self.request.query_params.get("is_paused")
        if is_paused is not None:
            queryset = queryset.filter(is_paused=is_paused.lower() == "true")

        return queryset

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause SLA tracking for a case."""
        sla_status = self.get_object()
        serializer = PauseSLASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sla_status.pause(reason=serializer.validated_data.get("reason", ""))

        return Response({"message": "SLA paused", "paused_at": sla_status.paused_at})

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume SLA tracking for a case."""
        sla_status = self.get_object()

        if not sla_status.is_paused:
            return Response(
                {"error": "SLA is not paused"}, status=status.HTTP_400_BAD_REQUEST
            )

        sla_status.resume()

        return Response(
            {
                "message": "SLA resumed",
                "response_target": sla_status.response_target,
                "resolution_target": sla_status.resolution_target,
            }
        )

    @action(detail=True, methods=["get"])
    def refresh(self, request, pk=None):
        """Refresh and return current SLA status."""
        sla_status = self.get_object()
        status_info = check_sla_status(sla_status.case)

        if status_info:
            return Response(status_info)
        return Response(
            {"error": "No SLA status found"}, status=status.HTTP_404_NOT_FOUND
        )


class SLAMetricsView(APIView):
    """
    Get SLA performance metrics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        assigned_to = request.query_params.get("assigned_to")

        metrics = get_sla_metrics(
            start_date=start_date, end_date=end_date, assigned_to=assigned_to
        )

        serializer = SLAMetricsSerializer(metrics)
        return Response(serializer.data)


class SLADashboardView(APIView):
    """
    Get SLA dashboard data.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q

        # Cases at risk (within 2 hours of breach)
        at_risk = CaseSLAStatus.objects.filter(
            Q(response_status="at_risk") | Q(resolution_status="at_risk"),
            is_paused=False,
        ).count()

        # Currently breached
        breached = CaseSLAStatus.objects.filter(
            Q(response_status="breached") | Q(resolution_status="breached"),
            is_paused=False,
        ).count()

        # Unacknowledged breaches
        unacknowledged = SLABreach.objects.filter(
            escalation_sent=True, escalation_acknowledged=False, is_resolved=False
        ).count()

        # Recent breaches
        recent_breaches = (
            SLABreach.objects.filter(is_resolved=False)
            .select_related("case", "assigned_to")
            .order_by("-breach_time")[:10]
        )

        # Cases at risk details
        at_risk_cases = (
            CaseSLAStatus.objects.filter(
                Q(response_status="at_risk") | Q(resolution_status="at_risk"),
                is_paused=False,
            )
            .select_related("case", "sla")
            .order_by("response_target")[:10]
        )

        return Response(
            {
                "summary": {
                    "at_risk": at_risk,
                    "breached": breached,
                    "unacknowledged": unacknowledged,
                },
                "recent_breaches": SLABreachSerializer(recent_breaches, many=True).data,
                "at_risk_cases": CaseSLAStatusSerializer(at_risk_cases, many=True).data,
            }
        )
