import csv
import io
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def async_import_contacts_csv(self, csv_content, user_id):
    """
    Asynchronous CSV import for contacts.

    Parameters
    ----------
    csv_content : str
        The full text content of the uploaded CSV file (UTF-8 decoded).
    user_id : str
        UUID (as string) of the user who initiated the import.  This user
        will be recorded as ``created_by`` on each new contact.

    This task is a placeholder for production use.  The synchronous import
    in the viewset can be swapped out for a call to this task by doing::

        from apps.contacts.tasks import async_import_contacts_csv
        async_import_contacts_csv.delay(csv_content, str(request.user.id))

    Returns
    -------
    dict
        Summary with ``created`` and ``errors`` counts.
    """
    from apps.contacts.models import Contact
    from apps.contacts.serializers import ContactImportSerializer
    from apps.users.models import User

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error("async_import_contacts_csv: User %s not found.", user_id)
        return {"created": 0, "errors": [{"detail": "Importing user not found."}]}

    reader = csv.DictReader(io.StringIO(csv_content))

    created_count = 0
    errors = []

    for row_number, row in enumerate(reader, start=2):
        cleaned = {
            k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items() if k
        }

        serializer = ContactImportSerializer(data=cleaned)
        if serializer.is_valid():
            Contact.objects.create(created_by=user, **serializer.validated_data)
            created_count += 1
        else:
            errors.append({"row": row_number, "errors": serializer.errors})

    logger.info(
        "async_import_contacts_csv: %d created, %d errors for user %s.",
        created_count,
        len(errors),
        user_id,
    )

    return {
        "created": created_count,
        "errors": errors,
        "total_processed": created_count + len(errors),
    }
