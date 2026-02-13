from rest_framework.routers import DefaultRouter

from apps.cases.checklist_views import ChecklistTemplateViewSet

router = DefaultRouter()
router.register(
    r"checklist-templates", ChecklistTemplateViewSet, basename="checklist-templates"
)

urlpatterns = router.urls
