from rest_framework.routers import DefaultRouter

from apps.workflows.views import WorkflowExecutionLogViewSet, WorkflowRuleViewSet

router = DefaultRouter()
router.register(r"workflows", WorkflowRuleViewSet, basename="workflow-rules")
router.register(r"workflow-logs", WorkflowExecutionLogViewSet, basename="workflow-logs")

urlpatterns = router.urls
