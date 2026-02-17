"""
Security validators for file uploads and other inputs.

This module provides validators that check file content against magic bytes
to prevent file type spoofing attacks.
"""

import logging
from typing import Dict, List, Optional, Tuple

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)

# Magic bytes signatures for common file types
# Format: (offset, magic_bytes, description)
MAGIC_SIGNATURES: Dict[str, List[Tuple[int, bytes, str]]] = {
    # Images
    "image/jpeg": [(0, b"\xff\xd8\xff", "JPEG image")],
    "image/png": [(0, b"\x89PNG\r\n\x1a\n", "PNG image")],
    "image/gif": [
        (0, b"GIF87a", "GIF image"),
        (0, b"GIF89a", "GIF image"),
    ],
    "image/webp": [(0, b"RIFF", "WebP image"), (8, b"WEBP", "WebP image")],
    "image/bmp": [(0, b"BM", "BMP image")],
    "image/tiff": [
        (0, b"II*\x00", "TIFF image (little-endian)"),
        (0, b"MM\x00*", "TIFF image (big-endian)"),
    ],
    "image/svg+xml": [(0, b"<?xml", "SVG image"), (0, b"<svg", "SVG image")],
    # Documents
    "application/pdf": [(0, b"%PDF", "PDF document")],
    "application/msword": [
        (0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "MS Word document")
    ],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        (0, b"PK\x03\x04", "DOCX document")
    ],
    "application/vnd.ms-excel": [(0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "MS Excel")],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        (0, b"PK\x03\x04", "XLSX document")
    ],
    "application/vnd.ms-powerpoint": [
        (0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "MS PowerPoint")
    ],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        (0, b"PK\x03\x04", "PPTX document")
    ],
    # Archives
    "application/zip": [(0, b"PK\x03\x04", "ZIP archive")],
    "application/x-rar-compressed": [(0, b"Rar!\x1a\x07", "RAR archive")],
    "application/gzip": [(0, b"\x1f\x8b", "GZIP archive")],
    "application/x-7z-compressed": [(0, b"7z\xbc\xaf\x27\x1c", "7Z archive")],
    # Text (these don't have magic bytes, so we allow them)
    "text/plain": [],
    "text/csv": [],
    "text/html": [],
    "application/json": [],
    "application/xml": [],
}

# Map file extensions to expected MIME types
EXTENSION_MIME_MAP: Dict[str, List[str]] = {
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"],
    ".bmp": ["image/bmp"],
    ".tiff": ["image/tiff"],
    ".tif": ["image/tiff"],
    ".svg": ["image/svg+xml"],
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    ".xls": ["application/vnd.ms-excel"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".ppt": ["application/vnd.ms-powerpoint"],
    ".pptx": [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    ".zip": ["application/zip"],
    ".rar": ["application/x-rar-compressed"],
    ".gz": ["application/gzip"],
    ".7z": ["application/x-7z-compressed"],
    ".txt": ["text/plain"],
    ".csv": ["text/csv", "text/plain"],
    ".html": ["text/html"],
    ".htm": ["text/html"],
    ".json": ["application/json"],
    ".xml": ["application/xml", "text/xml"],
}

# Allowed MIME types for document uploads
ALLOWED_DOCUMENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "text/plain",
    "text/csv",
}


def check_magic_bytes(file_content: bytes, mime_type: str) -> bool:
    """
    Check if file content matches the expected magic bytes for the MIME type.

    Args:
        file_content: The file content as bytes
        mime_type: The expected MIME type

    Returns:
        True if the magic bytes match, False otherwise
    """
    signatures = MAGIC_SIGNATURES.get(mime_type)

    if signatures is None:
        # Unknown MIME type, be cautious and reject
        return False

    if not signatures:
        # Text types don't have magic bytes, accept them
        return True

    for offset, magic, _desc in signatures:
        if len(file_content) >= offset + len(magic):
            if file_content[offset : offset + len(magic)] == magic:
                return True

    return False


def validate_file_type(uploaded_file, allowed_types: Optional[set] = None) -> str:
    """
    Validate an uploaded file by checking both extension and magic bytes.

    Args:
        uploaded_file: Django UploadedFile instance
        allowed_types: Set of allowed MIME types, defaults to ALLOWED_DOCUMENT_TYPES

    Returns:
        The validated MIME type

    Raises:
        ValidationError: If the file type is not allowed or magic bytes don't match
    """
    if allowed_types is None:
        allowed_types = ALLOWED_DOCUMENT_TYPES

    filename = uploaded_file.name.lower()
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""

    # Get expected MIME types for extension
    expected_mimes = EXTENSION_MIME_MAP.get(ext, [])

    if not expected_mimes:
        raise ValidationError(_("File type '%(ext)s' is not allowed.") % {"ext": ext})

    # Check if any expected MIME type is in allowed types
    allowed_mimes = [m for m in expected_mimes if m in allowed_types]
    if not allowed_mimes:
        raise ValidationError(
            _("File type '%(ext)s' is not allowed for upload.") % {"ext": ext}
        )

    # Read file header for magic byte validation
    file_header = uploaded_file.read(512)
    uploaded_file.seek(0)  # Reset file pointer

    # Check magic bytes against expected MIME types
    validated_mime = None
    for mime in allowed_mimes:
        if check_magic_bytes(file_header, mime):
            validated_mime = mime
            break

    if not validated_mime:
        logger.warning(
            f"File upload rejected: magic bytes mismatch for {filename} "
            f"(expected one of {allowed_mimes})"
        )
        raise ValidationError(
            _(
                "File content does not match the file extension. "
                "Please ensure the file is not corrupted or renamed."
            )
        )

    return validated_mime


def validate_file_extension(
    filename: str, allowed_extensions: Optional[set] = None
) -> bool:
    """
    Validate that a filename has an allowed extension.

    Args:
        filename: The filename to validate
        allowed_extensions: Set of allowed extensions (with dots), defaults to EXTENSION_MIME_MAP keys

    Returns:
        True if extension is allowed

    Raises:
        ValidationError: If the extension is not allowed
    """
    if allowed_extensions is None:
        allowed_extensions = set(EXTENSION_MIME_MAP.keys())

    ext = "." + filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext not in allowed_extensions:
        raise ValidationError(
            _("File extension '%(ext)s' is not allowed.") % {"ext": ext}
        )

    return True


# ---------------------------------------------------------------------------
# CSV Import Limits
# ---------------------------------------------------------------------------

# Default limits for CSV imports (can be overridden in settings)
CSV_MAX_FILE_SIZE_MB = 10  # Maximum file size in megabytes
CSV_MAX_ROWS = 10000  # Maximum number of rows per import


def validate_csv_import(
    uploaded_file,
    max_file_size_mb: int = CSV_MAX_FILE_SIZE_MB,
    max_rows: int = CSV_MAX_ROWS,
) -> Tuple[str, int]:
    """
    Validate a CSV file for import operations.

    SECURITY: Prevents resource exhaustion attacks by limiting:
    - File size (prevents memory exhaustion)
    - Row count (prevents database exhaustion)

    Args:
        uploaded_file: Django UploadedFile instance
        max_file_size_mb: Maximum file size in megabytes
        max_rows: Maximum number of rows allowed

    Returns:
        Tuple of (decoded content, row count)

    Raises:
        ValidationError: If file exceeds limits or is invalid
    """
    # Check file extension
    filename = uploaded_file.name.lower()
    if not filename.endswith('.csv'):
        raise ValidationError(
            _("Invalid file type. Only CSV files are allowed.")
        )

    # Check file size
    max_size_bytes = max_file_size_mb * 1024 * 1024
    if uploaded_file.size > max_size_bytes:
        raise ValidationError(
            _("File too large. Maximum size is %(max)s MB.") % {"max": max_file_size_mb}
        )

    # Read and decode content
    try:
        content = uploaded_file.read()
        # Try UTF-8 with BOM first, then without
        try:
            decoded = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise ValidationError(
            _("File must be UTF-8 encoded.")
        )

    # Count rows (roughly by newlines to avoid parsing overhead)
    line_count = decoded.count('\n')
    if line_count > max_rows:
        raise ValidationError(
            _("File has too many rows. Maximum is %(max)s rows.") % {"max": max_rows}
        )

    # Log large imports
    if line_count > 1000:
        logger.info(f"Large CSV import: {line_count} rows from {filename}")

    return decoded, line_count


def validate_path_traversal(path: str) -> str:
    """
    Validate that a path doesn't contain traversal attacks.

    Args:
        path: The path to validate

    Returns:
        The validated path

    Raises:
        ValidationError: If path traversal is detected
    """
    if not path:
        return path

    # Check for path traversal patterns
    dangerous_patterns = [
        "..",
        "..\\",
        "../",
        "..%2f",
        "..%5c",
        "%2e%2e",
        "%252e%252e",
    ]

    path_lower = path.lower()
    for pattern in dangerous_patterns:
        if pattern in path_lower:
            logger.warning(f"Path traversal attempt detected: {path}")
            raise ValidationError(_("Invalid path: path traversal not allowed."))

    # Check for null bytes
    if "\x00" in path:
        logger.warning(f"Null byte injection attempt detected: {path}")
        raise ValidationError(_("Invalid path: null bytes not allowed."))

    # Check for absolute paths (Unix and Windows)
    if path.startswith("/") or (len(path) > 1 and path[1] == ":"):
        raise ValidationError(_("Invalid path: absolute paths not allowed."))

    return path
