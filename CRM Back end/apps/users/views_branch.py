from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.branch_models import Branch
from apps.users.permissions import IsAdminRole
from apps.users.serializers_branch import (
    BranchCreateUpdateSerializer,
    BranchDetailSerializer,
    BranchListSerializer,
)


class BranchViewSet(viewsets.ModelViewSet):
    """CRUD for office branches. Admin only."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Branch.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return BranchListSerializer
        if self.action in ("create", "update", "partial_update"):
            return BranchCreateUpdateSerializer
        return BranchDetailSerializer
