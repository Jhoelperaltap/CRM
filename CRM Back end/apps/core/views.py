import hashlib
from pathlib import Path

from django.conf import settings
from django.db.models import Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Backup
from apps.core.serializers import (
    BackupCreateSerializer,
    BackupDetailSerializer,
    BackupListSerializer,
    BackupTaskStatusSerializer,
    RestoreBackupSerializer,
)
from apps.users.permissions import IsAdminRole


class GlobalSearchView(APIView):
    """
    Global search across contacts, corporations, and cases.

    Includes related entities:
    - When finding a contact, includes their corporations
    - When finding a corporation, includes its contacts
    - Contacts related via reports_to are also included
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        include_related = request.query_params.get("include_related", "true").lower() == "true"

        if len(q) < 2:
            return Response({"contacts": [], "corporations": [], "cases": []})

        from apps.cases.models import TaxCase
        from apps.cases.serializers import TaxCaseListSerializer
        from apps.contacts.models import Contact
        from apps.contacts.serializers import ContactListSerializer
        from apps.corporations.models import Corporation
        from apps.corporations.serializers import CorporationListSerializer

        # Direct matches
        direct_contacts = Contact.objects.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone__icontains=q)
        ).prefetch_related("corporations")[:10]

        direct_corporations = Corporation.objects.filter(
            Q(name__icontains=q) | Q(legal_name__icontains=q) | Q(ein__icontains=q)
        )[:10]

        cases = TaxCase.objects.filter(
            Q(case_number__icontains=q) | Q(title__icontains=q)
        )[:5]

        # Collect all contact and corporation IDs
        contact_ids = set(c.id for c in direct_contacts)
        corp_ids = set(c.id for c in direct_corporations)

        if include_related:
            # Get corporations related to found contacts
            for contact in direct_contacts:
                for corp in contact.corporations.all():
                    corp_ids.add(corp.id)

            # Get contacts related to found corporations
            for corp in direct_corporations:
                related_contacts = Contact.objects.filter(corporations=corp)[:5]
                for c in related_contacts:
                    contact_ids.add(c.id)

            # Get contacts related via reports_to (both directions)
            for contact in direct_contacts:
                # Contacts that this contact reports to
                if contact.reports_to_id:
                    contact_ids.add(contact.reports_to_id)
                # Contacts that report to this contact
                reporting_contacts = Contact.objects.filter(reports_to=contact)[:5]
                for c in reporting_contacts:
                    contact_ids.add(c.id)

        # Fetch all related entities
        all_contacts = Contact.objects.filter(id__in=contact_ids).prefetch_related(
            "corporations", "primary_corporation"
        )[:15]
        all_corporations = Corporation.objects.filter(id__in=corp_ids)[:15]

        return Response(
            {
                "contacts": ContactListSerializer(all_contacts, many=True).data,
                "corporations": CorporationListSerializer(all_corporations, many=True).data,
                "cases": TaxCaseListSerializer(cases, many=True).data,
            }
        )


class BackupViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for Backup management.

    - **list**:     paginated list of backups.
    - **retrieve**: full detail for a single backup.
    - **create**:   create a new backup (triggers async Celery task).
    - **destroy**:  delete a backup and its file.

    Custom actions:
    - **download**     ``GET /backups/<pk>/download/``  -- download backup file.
    - **restore**      ``POST /backups/<pk>/restore/``  -- restore from backup.
    - **task_status**  ``GET /backups/<pk>/task_status/``  -- check Celery task status.
    """

    queryset = Backup.objects.select_related("created_by", "corporation").all()
    permission_classes = [IsAuthenticated, IsAdminRole]
    search_fields = ["name"]
    ordering_fields = ["name", "backup_type", "status", "file_size", "created_at"]
    ordering = ["-created_at"]
    filterset_fields = ["backup_type", "status", "corporation"]

    def get_serializer_class(self):
        if self.action == "list":
            return BackupListSerializer
        if self.action == "create":
            return BackupCreateSerializer
        if self.action == "restore":
            return RestoreBackupSerializer
        if self.action == "task_status":
            return BackupTaskStatusSerializer
        return BackupDetailSerializer

    def perform_create(self, serializer):
        """Create backup and trigger async Celery task."""
        backup = serializer.save()

        # Trigger async backup task
        from apps.core.tasks import create_backup_task

        task = create_backup_task.delay(str(backup.id))
        backup.celery_task_id = task.id
        backup.save(update_fields=["celery_task_id"])

    def perform_destroy(self, instance):
        """Delete backup file before deleting record."""
        from apps.core.services import BackupService

        service = BackupService()
        service.delete_backup_file(instance)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """
        Download the backup file.

        Returns the encrypted backup file for download.
        """
        from pathlib import Path

        from django.conf import settings

        backup = self.get_object()

        if backup.status != Backup.Status.COMPLETED:
            return Response(
                {"detail": "Backup is not completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not backup.file_path:
            return Response(
                {"detail": "Backup file not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_path = Path(settings.MEDIA_ROOT) / backup.file_path
        if not file_path.exists():
            return Response(
                {"detail": "Backup file not found on disk."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = FileResponse(
            open(file_path, "rb"),
            as_attachment=True,
            filename=file_path.name,
        )
        response["Content-Type"] = "application/octet-stream"
        return response

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        """
        Restore from a backup.

        Requires explicit confirmation via ``confirm=true`` in the request body.
        This is a destructive operation that will overwrite existing data.
        """
        backup = self.get_object()

        serializer = RestoreBackupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if backup.status != Backup.Status.COMPLETED:
            return Response(
                {"detail": "Can only restore from completed backups."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Trigger async restore task
        from apps.core.tasks import restore_backup_task

        task = restore_backup_task.delay(str(backup.id), confirm=True)

        return Response(
            {
                "detail": "Restore started.",
                "task_id": task.id,
                "backup_id": str(backup.id),
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="task_status")
    def task_status(self, request, pk=None):
        """
        Check the status of a backup/restore Celery task.
        """
        from celery.result import AsyncResult

        backup = self.get_object()

        if not backup.celery_task_id:
            return Response(
                {"detail": "No task associated with this backup."},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = AsyncResult(backup.celery_task_id)

        response_data = {
            "task_id": backup.celery_task_id,
            "status": result.status,
            "result": None,
            "error": None,
        }

        if result.successful():
            response_data["result"] = result.result
        elif result.failed():
            response_data["error"] = str(result.result)

        return Response(response_data)

    @action(
        detail=False,
        methods=["post"],
        url_path="upload",
        parser_classes=[MultiPartParser],
    )
    def upload(self, request):
        """
        Upload a backup file from the user's computer.

        This is used for disaster recovery when you need to restore
        from a backup file that was downloaded previously.

        Request body:
        - file: The encrypted backup file (.enc)
        - name: Optional name for the backup (defaults to filename)
        - restore: If "true", immediately restore after upload
        """
        backup_file = request.FILES.get("file")
        if not backup_file:
            return Response(
                {"detail": "No file uploaded. Provide a 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file extension
        if not backup_file.name.endswith(".enc"):
            return Response(
                {"detail": "Invalid file type. Expected .enc file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 500MB)
        max_size = 500 * 1024 * 1024
        if backup_file.size > max_size:
            return Response(
                {"detail": "File too large. Maximum size is 500MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Read file content and compute checksum
        file_content = backup_file.read()
        checksum = hashlib.sha256(file_content).hexdigest()

        # Determine backup type from filename
        if "global" in backup_file.name.lower():
            backup_type = Backup.BackupType.GLOBAL
        elif "tenant" in backup_file.name.lower():
            backup_type = Backup.BackupType.TENANT
        else:
            backup_type = Backup.BackupType.GLOBAL

        # Save file to disk
        backup_dir = Path(settings.MEDIA_ROOT) / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)

        # Use original filename or generate one
        filename = backup_file.name
        file_path = backup_dir / filename

        # Avoid overwriting existing files
        counter = 1
        while file_path.exists():
            name_parts = filename.rsplit(".", 1)
            file_path = backup_dir / f"{name_parts[0]}_{counter}.{name_parts[1]}"
            counter += 1

        with open(file_path, "wb") as f:
            f.write(file_content)

        # Create backup record
        name = request.data.get("name", "").strip() or f"Uploaded: {backup_file.name}"
        backup = Backup.objects.create(
            name=name,
            backup_type=backup_type,
            status=Backup.Status.COMPLETED,
            file_path=str(file_path.relative_to(settings.MEDIA_ROOT)),
            file_size=len(file_content),
            checksum=checksum,
            created_by=request.user,
            completed_at=timezone.now(),
            include_media=True,  # Assume uploaded backups include media
        )

        response_data = {
            "detail": "Backup uploaded successfully.",
            "backup": BackupDetailSerializer(backup).data,
        }

        # Optionally trigger restore
        should_restore = request.data.get("restore", "").lower() == "true"
        if should_restore:
            from apps.core.tasks import restore_backup_task

            task = restore_backup_task.delay(str(backup.id), confirm=True)
            response_data["restore_task_id"] = task.id
            response_data["detail"] = "Backup uploaded and restore started."

        return Response(response_data, status=status.HTTP_201_CREATED)
