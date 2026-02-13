from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.reports.views import ModuleFieldsView, ReportFolderViewSet, ReportViewSet

router = DefaultRouter()
router.register("folders", ReportFolderViewSet, basename="report-folder")
router.register("", ReportViewSet, basename="report")

urlpatterns = [
    path("module-fields/", ModuleFieldsView.as_view(), name="module-fields"),
] + router.urls
