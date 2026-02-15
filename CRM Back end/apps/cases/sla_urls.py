from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .sla_views import (
    CaseSLAStatusViewSet,
    EscalationRuleViewSet,
    SLABreachViewSet,
    SLADashboardView,
    SLAMetricsView,
    SLAViewSet,
)

router = DefaultRouter()
router.register(r"slas", SLAViewSet, basename="sla")
router.register(r"escalation-rules", EscalationRuleViewSet, basename="escalation-rule")
router.register(r"breaches", SLABreachViewSet, basename="sla-breach")
router.register(r"case-status", CaseSLAStatusViewSet, basename="case-sla-status")

urlpatterns = [
    path("", include(router.urls)),
    path("metrics/", SLAMetricsView.as_view(), name="sla-metrics"),
    path("dashboard/", SLADashboardView.as_view(), name="sla-dashboard"),
]
