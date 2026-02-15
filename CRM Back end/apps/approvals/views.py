from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.approvals.models import Approval
from apps.approvals.serializers import (
    ApprovalCreateUpdateSerializer,
    ApprovalDetailSerializer,
    ApprovalListSerializer,
)


class ApprovalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Approval.objects.select_related("created_by").prefetch_related(
            "rules", "rules__owner_profiles", "rules__approvers", "actions"
        )

        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))

        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module=module)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ApprovalCreateUpdateSerializer
        if self.action == "retrieve":
            return ApprovalDetailSerializer
        return ApprovalListSerializer
