from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Department
from apps.users.permissions import IsAdminRole
from apps.users.serializers_department import (
    DepartmentCreateUpdateSerializer,
    DepartmentSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for departments.

    - **list / retrieve**: any authenticated user.
    - **create / update / destroy**: admin role only.
    """

    queryset = Department.objects.all()
    pagination_class = None  # Departments are a small fixed set

    def get_queryset(self):
        qs = Department.objects.annotate(user_count=Count("users"))
        if self.action == "list":
            # Optionally filter by active status
            is_active = self.request.query_params.get("is_active")
            if is_active is not None:
                qs = qs.filter(is_active=is_active.lower() == "true")
        return qs.order_by("order", "name")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DepartmentCreateUpdateSerializer
        return DepartmentSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]

    @action(detail=False, methods=["post"], url_path="seed")
    def seed_defaults(self, request):
        """
        Create default departments if they don't exist.
        Admin only.
        """
        DEFAULT_DEPARTMENTS = [
            {
                "name": "Accounting",
                "code": "ACCT",
                "color": "#3B82F6",
                "icon": "Calculator",
                "order": 1,
            },
            {
                "name": "Payroll",
                "code": "PAY",
                "color": "#10B981",
                "icon": "DollarSign",
                "order": 2,
            },
            {
                "name": "Billing",
                "code": "BILL",
                "color": "#F59E0B",
                "icon": "Receipt",
                "order": 3,
            },
            {
                "name": "Audit",
                "code": "AUD",
                "color": "#EF4444",
                "icon": "FileSearch",
                "order": 4,
            },
            {
                "name": "Representation",
                "code": "REP",
                "color": "#8B5CF6",
                "icon": "Scale",
                "order": 5,
            },
            {
                "name": "Client Visit",
                "code": "VISIT",
                "color": "#06B6D4",
                "icon": "Users",
                "order": 6,
            },
        ]

        created = []
        for dept_data in DEFAULT_DEPARTMENTS:
            dept, was_created = Department.objects.get_or_create(
                code=dept_data["code"],
                defaults=dept_data,
            )
            if was_created:
                created.append(dept.name)

        return Response(
            {
                "message": f"Created {len(created)} departments",
                "created": created,
            }
        )
