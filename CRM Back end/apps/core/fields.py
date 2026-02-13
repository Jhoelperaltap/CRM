"""
Custom Django model fields with transparent encryption.
"""

from django.db import models

from apps.core.encryption import decrypt_value, encrypt_value


class EncryptedCharField(models.CharField):
    """
    A CharField that transparently encrypts values before saving to the
    database and decrypts them when reading.

    The encrypted value is stored as a Fernet token (base64), which is
    longer than the plaintext.  Make sure ``max_length`` is large enough
    to hold the encrypted form (typically ~120+ chars for short inputs).
    """

    def get_prep_value(self, value):
        """Encrypt before writing to DB."""
        value = super().get_prep_value(value)
        if value:
            return encrypt_value(value)
        return value

    def from_db_value(self, value, expression, connection):
        """Decrypt when reading from DB."""
        if value:
            return decrypt_value(value)
        return value

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # Report as a regular CharField in migrations
        path = "django.db.models.CharField"
        return name, path, args, kwargs
