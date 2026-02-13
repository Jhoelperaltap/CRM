"""
Field-level encryption utilities for PII data.

Uses Fernet symmetric encryption from the ``cryptography`` library.
The encryption key is read from ``settings.FIELD_ENCRYPTION_KEY``.
If the setting is not configured, a warning is logged and values are
stored in plaintext (for development convenience).
"""

import base64
import logging

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)

# Sentinel to distinguish "not initialized" from "initialized but disabled"
_NOT_INITIALIZED = object()
_fernet_instance = _NOT_INITIALIZED
_warning_shown = False


def _get_fernet():
    """Return a cached Fernet instance, or None if no key is configured."""
    global _fernet_instance, _warning_shown

    if _fernet_instance is not _NOT_INITIALIZED:
        return _fernet_instance

    key = getattr(settings, "FIELD_ENCRYPTION_KEY", "")
    if not key:
        if not _warning_shown:
            logger.warning(
                "FIELD_ENCRYPTION_KEY is not set. PII fields will NOT be encrypted."
            )
            _warning_shown = True
        _fernet_instance = None
        return None

    # Accept raw key or base64-encoded key
    if isinstance(key, str):
        key = key.encode()
    try:
        _fernet_instance = Fernet(key)
    except Exception:
        logger.error("Invalid FIELD_ENCRYPTION_KEY. Encryption disabled.")
        _fernet_instance = None
        return None
    return _fernet_instance


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a plaintext string and return a base64 token.
    Returns the original value if encryption is not configured.
    """
    if not plaintext:
        return plaintext
    fernet = _get_fernet()
    if fernet is None:
        return plaintext
    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(token: str) -> str:
    """
    Decrypt a Fernet token back to plaintext.
    Returns the token unchanged if decryption fails or is not configured.
    """
    if not token:
        return token
    fernet = _get_fernet()
    if fernet is None:
        return token
    try:
        return fernet.decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        # Token may be plaintext (pre-encryption data)
        return token


def generate_encryption_key() -> str:
    """Generate a new Fernet key suitable for FIELD_ENCRYPTION_KEY."""
    return Fernet.generate_key().decode()
