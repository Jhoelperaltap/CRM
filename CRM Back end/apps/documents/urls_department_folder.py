from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.documents.views_department_folder import DepartmentClientFolderViewSet

app_name = "department_folders"

router = DefaultRouter()
router.register("", DepartmentClientFolderViewSet, basename="department-folder")

urlpatterns = [
    path("", include(router.urls)),
]
