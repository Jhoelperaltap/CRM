"""
Celery tasks for backup and restore operations.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def create_backup_task(self, backup_id: str) -> dict:
    """
    Celery task to create a backup asynchronously.

    Args:
        backup_id: UUID of the Backup model instance

    Returns:
        Dictionary with backup status and details
    """
    from apps.core.models import Backup
    from apps.core.services import BackupService

    try:
        backup = Backup.objects.get(id=backup_id)
    except Backup.DoesNotExist:
        logger.error(f"Backup not found: {backup_id}")
        return {"status": "error", "message": "Backup not found"}

    # Store Celery task ID
    backup.celery_task_id = self.request.id
    backup.save(update_fields=["celery_task_id"])

    service = BackupService()

    try:
        if backup.backup_type == Backup.BackupType.GLOBAL:
            service.create_global_backup(backup)
        elif backup.backup_type == Backup.BackupType.TENANT:
            if not backup.corporation_id:
                raise ValueError("Corporation ID required for tenant backup")
            service.create_tenant_backup(backup, str(backup.corporation_id))
        else:
            raise ValueError(f"Unknown backup type: {backup.backup_type}")

        return {
            "status": "success",
            "backup_id": str(backup.id),
            "file_size": backup.file_size,
            "file_size_human": backup.file_size_human,
        }

    except Exception as exc:
        logger.exception(f"Backup task failed: {exc}")
        # Backup status is updated in the service, so just re-raise
        # for Celery retry logic
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return {"status": "error", "message": str(exc)}


@shared_task(bind=True)
def restore_backup_task(self, backup_id: str, confirm: bool = False) -> dict:
    """
    Celery task to restore a backup asynchronously.

    Args:
        backup_id: UUID of the Backup model instance
        confirm: Must be True to proceed with restore

    Returns:
        Dictionary with restore status and details
    """
    from apps.core.models import Backup
    from apps.core.services import BackupService

    if not confirm:
        return {"status": "error", "message": "Restore requires explicit confirmation"}

    try:
        backup = Backup.objects.get(id=backup_id)
    except Backup.DoesNotExist:
        logger.error(f"Backup not found: {backup_id}")
        return {"status": "error", "message": "Backup not found"}

    if backup.status != Backup.Status.COMPLETED:
        return {"status": "error", "message": "Can only restore completed backups"}

    service = BackupService()

    try:
        if backup.backup_type == Backup.BackupType.GLOBAL:
            result = service.restore_global_backup(backup, confirm=True)
        elif backup.backup_type == Backup.BackupType.TENANT:
            result = service.restore_tenant_backup(backup, confirm=True)
        else:
            raise ValueError(f"Unknown backup type: {backup.backup_type}")

        return result

    except Exception as exc:
        logger.exception(f"Restore task failed: {exc}")
        return {"status": "error", "message": str(exc)}


@shared_task
def cleanup_old_backups(days: int = 30) -> dict:
    """
    Clean up backup files older than the specified number of days.

    Only deletes files for backups with status COMPLETED or FAILED.

    Args:
        days: Delete backup files older than this many days (default: 30)

    Returns:
        Dictionary with the count of deleted backups
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.core.models import Backup
    from apps.core.services import BackupService

    cutoff = timezone.now() - timedelta(days=days)
    service = BackupService()

    old_backups = Backup.objects.filter(
        created_at__lt=cutoff,
        status__in=[Backup.Status.COMPLETED, Backup.Status.FAILED],
    )

    deleted_count = 0
    for backup in old_backups:
        try:
            service.delete_backup_file(backup)
            backup.delete()
            deleted_count += 1
        except Exception as e:
            logger.warning(f"Could not delete backup {backup.id}: {e}")

    return {"deleted_backups": deleted_count}
