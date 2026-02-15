from django.db.models import Count, Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.contacts.models import Contact
from apps.corporations.models import Corporation
from apps.documents.models import DepartmentClientFolder
from apps.documents.serializers_department_folder import (
    DepartmentClientFolderCreateSerializer,
    DepartmentClientFolderDetailSerializer,
    DepartmentClientFolderListSerializer,
    DepartmentClientFolderTreeSerializer,
    DepartmentClientFolderUpdateSerializer,
    InitializeFoldersSerializer,
)
from apps.users.models import Department

DEFAULT_FOLDER_NAMES = [
    "Tax Returns",
    "Correspondence",
    "Forms",
    "Supporting Documents",
]


class DepartmentClientFolderViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for department client folders.

    Supports filtering by:
    - department: UUID of the department
    - contact: UUID of the contact
    - corporation: UUID of the corporation
    - parent: UUID of parent folder (use 'root' for root folders)
    """

    queryset = DepartmentClientFolder.objects.select_related(
        "department", "contact", "corporation", "created_by"
    ).all()

    def get_queryset(self):
        qs = DepartmentClientFolder.objects.select_related(
            "department", "contact", "corporation", "created_by"
        ).annotate(
            document_count=Count("documents"),
            children_count=Count("children"),
        )

        # Filter by department
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)

        # Filter by client
        contact = self.request.query_params.get("contact")
        if contact:
            qs = qs.filter(contact_id=contact)

        corporation = self.request.query_params.get("corporation")
        if corporation:
            qs = qs.filter(corporation_id=corporation)

        # Filter by parent (use 'root' for root-level folders)
        parent = self.request.query_params.get("parent")
        if parent == "root":
            qs = qs.filter(parent__isnull=True)
        elif parent:
            qs = qs.filter(parent_id=parent)

        # Permission filtering: non-admins can only see their department's folders
        user = self.request.user
        if not user.is_admin and user.department_id:
            qs = qs.filter(department_id=user.department_id)

        return qs.order_by("name")

    def get_serializer_class(self):
        if self.action == "create":
            return DepartmentClientFolderCreateSerializer
        if self.action in ("update", "partial_update"):
            return DepartmentClientFolderUpdateSerializer
        if self.action in ("tree", "client_tree"):
            return DepartmentClientFolderTreeSerializer
        if self.action == "retrieve":
            return DepartmentClientFolderDetailSerializer
        return DepartmentClientFolderListSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Prevent deletion of default folders
        if instance.is_default:
            return Response(
                {"detail": "Default folders cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for documents in this folder
        if instance.documents.exists():
            return Response(
                {
                    "detail": "Cannot delete folder with documents. Move or delete documents first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for child folders
        if instance.children.exists():
            return Response(
                {
                    "detail": "Cannot delete folder with subfolders. Delete subfolders first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        """
        Return folder tree for a specific client.
        Requires either contact or corporation query parameter.
        """
        contact = request.query_params.get("contact")
        corporation = request.query_params.get("corporation")

        if not contact and not corporation:
            return Response(
                {"detail": "Either contact or corporation parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get root folders (no parent)
        qs = (
            DepartmentClientFolder.objects.filter(parent__isnull=True)
            .select_related("department")
            .annotate(
                document_count=Count("documents"),
            )
            .prefetch_related(
                Prefetch(
                    "children",
                    queryset=DepartmentClientFolder.objects.annotate(
                        document_count=Count("documents"),
                    ).prefetch_related(
                        Prefetch(
                            "children",
                            queryset=DepartmentClientFolder.objects.annotate(
                                document_count=Count("documents"),
                            ),
                        )
                    ),
                )
            )
        )

        if contact:
            qs = qs.filter(contact_id=contact)
        if corporation:
            qs = qs.filter(corporation_id=corporation)

        # Permission filtering
        user = request.user
        if not user.is_admin and user.department_id:
            qs = qs.filter(department_id=user.department_id)

        serializer = DepartmentClientFolderTreeSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="client-tree")
    def client_tree(self, request):
        """
        Return folder tree grouped by department for a client.
        More organized view showing department -> folders hierarchy.
        """
        contact = request.query_params.get("contact")
        corporation = request.query_params.get("corporation")

        if not contact and not corporation:
            return Response(
                {"detail": "Either contact or corporation parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get all departments that have folders for this client
        dept_filter = (
            {"client_folders__contact_id": contact}
            if contact
            else {"client_folders__corporation_id": corporation}
        )

        departments = (
            Department.objects.filter(is_active=True, **dept_filter)
            .distinct()
            .order_by("order", "name")
        )

        # Permission filtering
        user = request.user
        if not user.is_admin and user.department_id:
            departments = departments.filter(id=user.department_id)

        result = []
        for dept in departments:
            # Get root folders for this department and client
            folder_qs = (
                DepartmentClientFolder.objects.filter(
                    department=dept,
                    parent__isnull=True,
                )
                .annotate(
                    document_count=Count("documents"),
                )
                .prefetch_related(
                    Prefetch(
                        "children",
                        queryset=DepartmentClientFolder.objects.annotate(
                            document_count=Count("documents"),
                        ),
                    )
                )
            )

            if contact:
                folder_qs = folder_qs.filter(contact_id=contact)
            if corporation:
                folder_qs = folder_qs.filter(corporation_id=corporation)

            folders = DepartmentClientFolderTreeSerializer(folder_qs, many=True).data

            result.append(
                {
                    "id": str(dept.id),
                    "name": dept.name,
                    "code": dept.code,
                    "color": dept.color,
                    "icon": dept.icon,
                    "folders": folders,
                }
            )

        return Response(result)

    @action(detail=False, methods=["post"], url_path="initialize")
    def initialize(self, request):
        """
        Create default folder structure for a client across all departments.
        Optionally specify a single department to initialize.
        """
        serializer = InitializeFoldersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contact_id = serializer.validated_data.get("contact")
        corporation_id = serializer.validated_data.get("corporation")
        department_id = serializer.validated_data.get("department")

        # Validate client exists
        contact = None
        corporation = None
        if contact_id:
            try:
                contact = Contact.objects.get(id=contact_id)
            except Contact.DoesNotExist:
                return Response(
                    {"detail": "Contact not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        if corporation_id:
            try:
                corporation = Corporation.objects.get(id=corporation_id)
            except Corporation.DoesNotExist:
                return Response(
                    {"detail": "Corporation not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Get departments to initialize
        if department_id:
            departments = Department.objects.filter(id=department_id, is_active=True)
        else:
            departments = Department.objects.filter(is_active=True)

        created_count = 0
        for dept in departments:
            for folder_name in DEFAULT_FOLDER_NAMES:
                folder, was_created = DepartmentClientFolder.objects.get_or_create(
                    department=dept,
                    contact=contact,
                    corporation=corporation,
                    name=folder_name,
                    parent=None,
                    defaults={
                        "is_default": True,
                        "created_by": request.user,
                    },
                )
                if was_created:
                    created_count += 1

        return Response(
            {
                "message": f"Initialized {created_count} folders",
                "created_count": created_count,
            }
        )
