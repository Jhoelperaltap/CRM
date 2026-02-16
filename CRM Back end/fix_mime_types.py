"""
Script to fix mime_types for documents that have null or application/octet-stream.
Run with: python manage.py shell < fix_mime_types.py
"""
import mimetypes
from apps.documents.models import Document

# Find documents with missing or generic mime_type
docs = Document.objects.filter(
    file__isnull=False
).exclude(
    file=""
).filter(
    mime_type__in=[None, "", "application/octet-stream"]
) | Document.objects.filter(
    file__isnull=False,
    mime_type__isnull=True
)

print(f"Found {docs.count()} documents with missing mime_type")

updated = 0
for doc in docs:
    if doc.file:
        guessed = mimetypes.guess_type(doc.file.name)[0]
        if guessed:
            doc.mime_type = guessed
            doc.save(update_fields=["mime_type"])
            updated += 1
            print(f"  Updated: {doc.title} -> {guessed}")

print(f"\nUpdated {updated} documents")
