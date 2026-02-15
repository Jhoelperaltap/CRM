from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"playbooks", views.PlaybookViewSet, basename="playbook")
router.register(r"steps", views.PlaybookStepViewSet, basename="step")
router.register(r"executions", views.PlaybookExecutionViewSet, basename="execution")
router.register(
    r"step-executions", views.PlaybookStepExecutionViewSet, basename="step-execution"
)
router.register(r"templates", views.PlaybookTemplateViewSet, basename="template")

urlpatterns = [
    path("", include(router.urls)),
]
