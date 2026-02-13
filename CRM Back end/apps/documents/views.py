import mimetypes

from django.db.models import Count, Q
from django.http import FileResponse
from django.views.decorators.clickjacking import xframe_options_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from apps.core.throttling import FileUploadRateThrottle, BulkOperationRateThrottle
from apps.documents.filters import DocumentFilter, DocumentLinkFilter
from apps.documents.models import (
    Document,
    DocumentAccessLog,
    DocumentDownloadToken,
    DocumentFolder,
    DocumentLink,
    DocumentTag,
)
from apps.documents.serializers import (
    DocumentCreateUpdateSerializer,
    DocumentDetailSerializer,
    DocumentFolderCreateUpdateSerializer,
    DocumentFolderListSerializer,
    DocumentFolderTreeSerializer,
    DocumentLinkCreateUpdateSerializer,
    DocumentLinkDetailSerializer,
    DocumentLinkListSerializer,
    DocumentListSerializer,
    DocumentTagCreateUpdateSerializer,
    DocumentTagSerializer,
)
from apps.users.permissions import ModulePermission


# ---------------------------------------------------------------------------
# DocumentFolder
# ---------------------------------------------------------------------------
class DocumentFolderViewSet(viewsets.ModelViewSet):
    """CRUD for document folders plus a recursive tree endpoint."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "documents"

    def get_queryset(self):
        return DocumentFolder.objects.annotate(
            document_count=Count("documents"),
            children_count=Count("children"),
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DocumentFolderCreateUpdateSerializer
        return DocumentFolderListSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        if instance.is_default:
            return Response(
                {"detail": "System folders cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        """Return the full folder tree starting from root folders."""
        roots = (
            DocumentFolder.objects.filter(parent__isnull=True)
            .annotate(document_count=Count("documents"))
            .prefetch_related("children")
        )
        serializer = DocumentFolderTreeSerializer(roots, many=True, context={"request": request})
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# DocumentTag
# ---------------------------------------------------------------------------
class DocumentTagViewSet(viewsets.ModelViewSet):
    """CRUD for document tags.  Shows shared + current user's personal tags."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "documents"

    def get_queryset(self):
        user = self.request.user
        return DocumentTag.objects.filter(
            Q(tag_type=DocumentTag.TagType.SHARED) | Q(owner=user)
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DocumentTagCreateUpdateSerializer
        return DocumentTagSerializer

    def perform_create(self, serializer):
        tag_type = serializer.validated_data.get("tag_type", DocumentTag.TagType.SHARED)
        owner = self.request.user if tag_type == DocumentTag.TagType.PERSONAL else None
        serializer.save(owner=owner)


# ---------------------------------------------------------------------------
# DocumentLink
# ---------------------------------------------------------------------------
class DocumentLinkViewSet(viewsets.ModelViewSet):
    """CRUD for external URL references."""

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "documents"
    filterset_class = DocumentLinkFilter
    search_fields = ["title", "url", "description"]
    ordering_fields = ["title", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return DocumentLink.objects.select_related(
            "folder", "contact", "corporation", "case", "created_by"
        ).prefetch_related("tags")

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentLinkListSerializer
        if self.action in ("create", "update", "partial_update"):
            return DocumentLinkCreateUpdateSerializer
        return DocumentLinkDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---------------------------------------------------------------------------
# Document (updated)
# ---------------------------------------------------------------------------
class DocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD + download for documents.

    Security: File uploads are rate limited to prevent resource exhaustion.
    """

    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "documents"
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_class = DocumentFilter
    search_fields = ["title", "description"]
    ordering_fields = ["title", "doc_type", "status", "file_size", "created_at"]
    ordering = ["-created_at"]

    def get_throttles(self):
        """Apply file upload throttle only for create/update actions."""
        if self.action in ("create", "update", "partial_update"):
            return [FileUploadRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        return (
            Document.objects.select_related(
                "contact", "corporation", "case", "uploaded_by", "folder"
            )
            .prefetch_related("tags")
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        if self.action in ("create", "update", "partial_update"):
            return DocumentCreateUpdateSerializer
        return DocumentDetailSerializer

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get("file")
        extra = {"uploaded_by": self.request.user}
        if uploaded_file:
            extra["file_size"] = uploaded_file.size
            extra["mime_type"] = (
                uploaded_file.content_type
                or mimetypes.guess_type(uploaded_file.name)[0]
                or "application/octet-stream"
            )
        serializer.save(**extra)

    # ---- custom actions --------------------------------------------------

    @action(detail=True, methods=["post"], url_path="download-token")
    def download_token(self, request, pk=None):
        """Generate a secure, single-use download token for this document.

        SECURITY: This replaces the insecure pattern of passing JWT tokens in URLs.
        The generated token:
        - Expires in 5 minutes
        - Can only be used once
        - Is tied to this specific document and user
        """
        document = self.get_object()
        token = DocumentDownloadToken.create_token(
            document=document,
            user=request.user,
        )
        return Response({
            "token": token.token,
            "expires_at": token.expires_at.isoformat(),
            "download_url": f"/api/v1/documents/{document.id}/download/?token={token.token}",
        })

    @method_decorator(xframe_options_exempt)
    @action(detail=True, methods=["get"], url_path="download", permission_classes=[AllowAny])
    def download(self, request, pk=None):
        """Stream the file as a download or inline view.

        Query params:
            inline: If 'true', display inline (for PDF/image viewing) instead of forcing download.
            token: Secure download token (NOT JWT - use download-token endpoint to generate)

        SECURITY: This endpoint uses single-use, short-lived download tokens instead of
        JWT access tokens to prevent token exposure in URLs, logs, and browser history.
        """
        # First try normal authentication (Authorization header)
        user = request.user if request.user and request.user.is_authenticated else None

        # If not authenticated via header, check for download token
        if not user:
            token_str = request.query_params.get("token")
            if not token_str:
                return Response(
                    {"detail": "Authentication required. Use download-token endpoint to get a secure token."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Validate download token
            try:
                download_token = DocumentDownloadToken.objects.select_related(
                    "document", "user"
                ).get(token=token_str)
            except DocumentDownloadToken.DoesNotExist:
                return Response(
                    {"detail": "Invalid download token."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Check if token is valid
            if not download_token.is_valid():
                return Response(
                    {"detail": "Download token has expired or already been used."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Verify token is for this document
            if str(download_token.document_id) != str(pk):
                return Response(
                    {"detail": "Token is not valid for this document."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Mark token as used
            download_token.mark_used(ip_address=request.META.get("REMOTE_ADDR"))
            user = download_token.user
            document = download_token.document
        else:
            # Get document for authenticated users
            try:
                document = Document.objects.get(pk=pk)
            except Document.DoesNotExist:
                return Response(
                    {"detail": "Document not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        inline_view = request.query_params.get("inline", "").lower() == "true"
        DocumentAccessLog.objects.create(
            document=document,
            user=user,
            action=DocumentAccessLog.Action.VIEW if inline_view else DocumentAccessLog.Action.DOWNLOAD,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        if not document.file:
            return Response(
                {"detail": "No file attached to this document."},
                status=status.HTTP_404_NOT_FOUND,
            )
        response = FileResponse(
            document.file.open("rb"),
            content_type=document.mime_type or "application/octet-stream",
        )
        filename = document.file.name.split("/")[-1]
        if inline_view:
            response["Content-Disposition"] = f'inline; filename="{filename}"'
        else:
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
        # Allow embedding in iframes (for PDF preview)
        response["X-Frame-Options"] = "SAMEORIGIN"
        response["Content-Security-Policy"] = "frame-ancestors 'self' http://localhost:* https://localhost:*"
        return response

    @action(detail=True, methods=["get"], url_path="versions")
    def versions(self, request, pk=None):
        """List all versions of this document."""
        document = self.get_object()
        root = document
        while root.parent_document_id:
            root = root.parent_document
        all_versions = [root]
        queue = list(root.versions.all())
        while queue:
            ver = queue.pop(0)
            all_versions.append(ver)
            queue.extend(ver.versions.all())
        all_versions.sort(key=lambda d: d.version)
        serializer = DocumentListSerializer(all_versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="access-logs")
    def access_logs(self, request, pk=None):
        """List access logs for this document."""
        document = self.get_object()
        logs = document.access_logs.select_related("user").all()
        page = self.paginate_queryset(logs)
        data = [
            {
                "id": str(log.id),
                "user": log.user.get_full_name() if log.user else None,
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in (page or logs)
        ]
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)

    @action(
        detail=True,
        methods=["post"],
        url_path="new-version",
        parser_classes=[MultiPartParser, FormParser],
    )
    def new_version(self, request, pk=None):
        """Upload a new version of an existing document."""
        parent = self.get_object()
        serializer = DocumentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = request.FILES.get("file")
        extra = {
            "uploaded_by": request.user,
            "parent_document": parent,
            "version": parent.version + 1,
            "contact": parent.contact,
            "corporation": parent.corporation,
            "case": parent.case,
        }
        if uploaded_file:
            extra["file_size"] = uploaded_file.size
            extra["mime_type"] = (
                uploaded_file.content_type
                or mimetypes.guess_type(uploaded_file.name)[0]
                or "application/octet-stream"
            )
        doc = serializer.save(**extra)
        return Response(
            DocumentDetailSerializer(doc).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-upload",
        parser_classes=[MultiPartParser, FormParser],
    )
    def bulk_upload(self, request):
        """Accept multiple files and create one Document per file."""
        files = request.FILES.getlist("files")
        if not files:
            return Response(
                {"detail": "No files provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        folder_id = request.data.get("folder") or None
        doc_type = request.data.get("doc_type", Document.DocType.OTHER)

        created = []
        for f in files:
            mime = (
                f.content_type
                or mimetypes.guess_type(f.name)[0]
                or "application/octet-stream"
            )
            doc = Document.objects.create(
                title=f.name,
                file=f,
                doc_type=doc_type,
                file_size=f.size,
                mime_type=mime,
                uploaded_by=request.user,
                folder_id=folder_id,
            )
            created.append(doc)

        serializer = DocumentListSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
