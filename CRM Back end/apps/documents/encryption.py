"""
Document encryption at rest.

Security: Provides AES-256 encryption for sensitive documents stored in the system.
Uses Fernet (symmetric encryption) with per-document keys encrypted by a master key.

Architecture:
- Master key: Stored in environment variable (DOCUMENT_ENCRYPTION_KEY)
- Document keys: Random per-document, encrypted with master key, stored in DB
- Files: Encrypted with document key before storage
"""
import base64
import logging
import os
import secrets
from io import BytesIO
from typing import BinaryIO, Optional, Tuple

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


class DocumentEncryptionError(Exception):
    """Base exception for document encryption errors."""
    pass


class EncryptionKeyError(DocumentEncryptionError):
    """Error with encryption key management."""
    pass


class DecryptionError(DocumentEncryptionError):
    """Error during file decryption."""
    pass


class DocumentEncryptionService:
    """
    Service for encrypting and decrypting document files at rest.

    Usage:
        service = DocumentEncryptionService()

        # Encrypt a file
        encrypted_content, key_id = service.encrypt_file(file_content)

        # Decrypt a file
        decrypted_content = service.decrypt_file(encrypted_content, key_id)
    """

    # Key ID prefix for versioning
    KEY_VERSION = "v1"

    def __init__(self):
        self._master_key = None
        self._fernet = None

    @property
    def master_key(self) -> bytes:
        """
        Get the master encryption key from settings.

        The key should be a 32-byte (256-bit) key encoded as base64.
        """
        if self._master_key is None:
            key_str = getattr(settings, "DOCUMENT_ENCRYPTION_KEY", None)
            if not key_str:
                key_str = os.environ.get("DOCUMENT_ENCRYPTION_KEY", "")

            if not key_str:
                raise EncryptionKeyError(
                    "DOCUMENT_ENCRYPTION_KEY is not configured. "
                    "Set it in environment or settings."
                )

            try:
                # Key should be base64-encoded 32 bytes
                self._master_key = base64.urlsafe_b64decode(key_str.encode())
                if len(self._master_key) != 32:
                    raise EncryptionKeyError(
                        "DOCUMENT_ENCRYPTION_KEY must be 32 bytes (256 bits)"
                    )
            except Exception as e:
                raise EncryptionKeyError(f"Invalid DOCUMENT_ENCRYPTION_KEY: {e}")

        return self._master_key

    @property
    def fernet(self) -> Fernet:
        """Get the Fernet instance for master key encryption."""
        if self._fernet is None:
            # Derive a Fernet-compatible key from the master key
            key = base64.urlsafe_b64encode(self.master_key)
            self._fernet = Fernet(key)
        return self._fernet

    def generate_document_key(self) -> Tuple[bytes, str]:
        """
        Generate a new random encryption key for a document.

        Returns:
            Tuple of (raw_key, encrypted_key_id)
            - raw_key: The actual encryption key (32 bytes)
            - encrypted_key_id: The key encrypted with master key and encoded
        """
        # Generate random 32-byte key
        raw_key = secrets.token_bytes(32)

        # Encrypt the key with master key
        encrypted_key = self.fernet.encrypt(raw_key)

        # Create key ID: version + encrypted key (base64)
        key_id = f"{self.KEY_VERSION}:{base64.urlsafe_b64encode(encrypted_key).decode()}"

        return raw_key, key_id

    def get_document_key(self, key_id: str) -> bytes:
        """
        Retrieve and decrypt a document key from its ID.

        Args:
            key_id: The encrypted key ID stored with the document

        Returns:
            The decrypted raw key
        """
        if not key_id:
            raise EncryptionKeyError("No key ID provided")

        try:
            # Parse key ID
            parts = key_id.split(":", 1)
            if len(parts) != 2:
                raise EncryptionKeyError("Invalid key ID format")

            version, encrypted_key_b64 = parts

            if version != self.KEY_VERSION:
                raise EncryptionKeyError(f"Unsupported key version: {version}")

            # Decode and decrypt
            encrypted_key = base64.urlsafe_b64decode(encrypted_key_b64.encode())
            raw_key = self.fernet.decrypt(encrypted_key)

            return raw_key

        except InvalidToken:
            raise EncryptionKeyError("Failed to decrypt key - invalid master key?")
        except Exception as e:
            raise EncryptionKeyError(f"Failed to retrieve document key: {e}")

    def encrypt_file(self, content: bytes) -> Tuple[bytes, str]:
        """
        Encrypt file content.

        Args:
            content: The raw file bytes to encrypt

        Returns:
            Tuple of (encrypted_content, key_id)
        """
        # Generate a new key for this document
        raw_key, key_id = self.generate_document_key()

        # Create Fernet cipher with document key
        doc_fernet = Fernet(base64.urlsafe_b64encode(raw_key))

        # Encrypt the content
        encrypted_content = doc_fernet.encrypt(content)

        logger.info(
            "Encrypted document",
            extra={
                "original_size": len(content),
                "encrypted_size": len(encrypted_content),
            },
        )

        return encrypted_content, key_id

    def decrypt_file(self, encrypted_content: bytes, key_id: str) -> bytes:
        """
        Decrypt file content.

        Args:
            encrypted_content: The encrypted file bytes
            key_id: The key ID used for encryption

        Returns:
            The decrypted file bytes
        """
        try:
            # Get the document key
            raw_key = self.get_document_key(key_id)

            # Create Fernet cipher with document key
            doc_fernet = Fernet(base64.urlsafe_b64encode(raw_key))

            # Decrypt the content
            decrypted_content = doc_fernet.decrypt(encrypted_content)

            logger.info(
                "Decrypted document",
                extra={
                    "encrypted_size": len(encrypted_content),
                    "decrypted_size": len(decrypted_content),
                },
            )

            return decrypted_content

        except InvalidToken:
            raise DecryptionError("Failed to decrypt file - corrupted or wrong key")
        except EncryptionKeyError:
            raise
        except Exception as e:
            raise DecryptionError(f"Failed to decrypt file: {e}")

    def encrypt_django_file(self, django_file) -> Tuple[ContentFile, str]:
        """
        Encrypt a Django UploadedFile.

        Args:
            django_file: Django file object (from request.FILES)

        Returns:
            Tuple of (ContentFile with encrypted content, key_id)
        """
        # Read the file content
        content = django_file.read()
        django_file.seek(0)  # Reset file pointer

        # Encrypt
        encrypted_content, key_id = self.encrypt_file(content)

        # Create new ContentFile with encrypted content
        encrypted_file = ContentFile(
            encrypted_content,
            name=django_file.name
        )

        return encrypted_file, key_id


# Singleton instance
_encryption_service: Optional[DocumentEncryptionService] = None


def get_encryption_service() -> DocumentEncryptionService:
    """Get the document encryption service singleton."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = DocumentEncryptionService()
    return _encryption_service


def is_encryption_enabled() -> bool:
    """Check if document encryption is configured and enabled."""
    key = getattr(settings, "DOCUMENT_ENCRYPTION_KEY", None)
    if not key:
        key = os.environ.get("DOCUMENT_ENCRYPTION_KEY", "")
    return bool(key)


def generate_encryption_key() -> str:
    """
    Generate a new random encryption key for configuration.

    Returns:
        Base64-encoded 32-byte key suitable for DOCUMENT_ENCRYPTION_KEY
    """
    key = secrets.token_bytes(32)
    return base64.urlsafe_b64encode(key).decode()
