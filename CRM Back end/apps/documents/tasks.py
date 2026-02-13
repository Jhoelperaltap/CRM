from celery import shared_task

from apps.documents.models import DocumentDownloadToken


@shared_task
def cleanup_expired_download_tokens(days: int = 7) -> dict:
    """
    Clean up expired download tokens older than the specified number of days.

    This task should be run periodically (e.g., daily) to prevent the
    DocumentDownloadToken table from growing indefinitely.

    Args:
        days: Delete tokens older than this many days (default: 7)

    Returns:
        Dictionary with the count of deleted tokens
    """
    deleted_count, _ = DocumentDownloadToken.cleanup_expired(days=days)
    return {"deleted_tokens": deleted_count}
