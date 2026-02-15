import pytest
from cryptography.fernet import Fernet
from django.db import connection

import apps.core.encryption as encryption_module
from apps.core.encryption import (
    _NOT_INITIALIZED,
    decrypt_value,
    encrypt_value,
    generate_encryption_key,
)
from tests.factories import ContactFactory, CorporationFactory

pytestmark = pytest.mark.django_db


class TestEncryptionUtilities:
    """Test the core encryption/decryption functions."""

    def test_generate_encryption_key_returns_valid_key(self):
        """generate_encryption_key returns a valid Fernet key."""
        key = generate_encryption_key()
        # Should be a non-empty string
        assert isinstance(key, str)
        assert len(key) > 0
        # Should be usable as a Fernet key without raising
        fernet = Fernet(key.encode())
        # Round-trip to verify the key actually works
        token = fernet.encrypt(b"test")
        assert fernet.decrypt(token) == b"test"

    def test_encrypt_and_decrypt_roundtrip(self, settings):
        """Encrypting then decrypting returns original plaintext."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        plaintext = "1234"
        token = encrypt_value(plaintext)

        # The encrypted token must differ from the original plaintext
        assert token != plaintext
        # Decrypting should recover the original value
        assert decrypt_value(token) == plaintext

    def test_encrypt_empty_string_returns_empty(self, settings):
        """Empty string passes through without encryption."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        assert encrypt_value("") == ""

    def test_decrypt_empty_string_returns_empty(self, settings):
        """Empty string passes through without decryption."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        assert decrypt_value("") == ""

    def test_decrypt_invalid_token_returns_original(self, settings):
        """decrypt_value with non-Fernet data returns original string."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        garbage = "not-a-valid-fernet-token"
        assert decrypt_value(garbage) == garbage

    def test_encrypt_without_key_returns_plaintext(self, settings):
        """When FIELD_ENCRYPTION_KEY is not set, plaintext is returned."""
        settings.FIELD_ENCRYPTION_KEY = ""
        encryption_module._fernet_instance = _NOT_INITIALIZED

        plaintext = "sensitive-data"
        assert encrypt_value(plaintext) == plaintext

    def test_decrypt_without_key_returns_token(self, settings):
        """When FIELD_ENCRYPTION_KEY is not set, token is returned as-is."""
        settings.FIELD_ENCRYPTION_KEY = ""
        encryption_module._fernet_instance = _NOT_INITIALIZED

        token = "some-stored-token"
        assert decrypt_value(token) == token

    def test_encrypt_caches_fernet_instance(self, settings):
        """The Fernet instance is cached after first use."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        encrypt_value("first call")
        cached = encryption_module._fernet_instance
        assert cached is not None

        # Second call should reuse the same instance
        encrypt_value("second call")
        assert encryption_module._fernet_instance is cached

    def test_encrypt_different_values_produce_different_tokens(self, settings):
        """Different plaintexts produce different encrypted tokens."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        token_a = encrypt_value("aaaa")
        token_b = encrypt_value("bbbb")
        assert token_a != token_b


class TestEncryptedCharField:
    """Test the EncryptedCharField via Contact.ssn_last_four."""

    def test_ssn_encrypted_in_database(self, settings):
        """ssn_last_four is stored encrypted in the DB but reads as plaintext."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        contact = ContactFactory(ssn_last_four="1234")
        contact.refresh_from_db()

        # The Python-level attribute should be the decrypted plaintext
        assert contact.ssn_last_four == "1234"

        # The raw database value should be the encrypted token, not plaintext
        # Use Django's raw() to bypass field decryption while staying in same transaction
        from django.db.models.functions import Length

        from apps.contacts.models import Contact

        # Use annotate to get the raw length - if encrypted, it will be much longer
        result = (
            Contact.objects.filter(id=contact.id)
            .annotate(raw_len=Length("ssn_last_four"))
            .values_list("raw_len", flat=True)
            .first()
        )
        assert result is not None
        # Encrypted value should be longer than the plaintext "1234" (4 chars)
        # Fernet encryption produces ~100+ character base64 strings
        assert result > 4, f"Expected encrypted length > 4, got {result}"

    def test_ssn_empty_stays_empty(self):
        """Empty ssn_last_four is stored and read as empty string."""
        encryption_module._fernet_instance = _NOT_INITIALIZED

        contact = ContactFactory(ssn_last_four="")
        contact.refresh_from_db()
        assert contact.ssn_last_four == ""

    def test_corporation_ein_encrypted(self, settings):
        """Corporation.ein is also encrypted via EncryptedCharField."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        corp = CorporationFactory(ein="12-3456789")
        corp.refresh_from_db()

        # Python attribute should read as plaintext
        assert corp.ein == "12-3456789"

        # Raw DB value should be encrypted
        with connection.cursor() as cursor:
            cursor.execute("SELECT ein FROM crm_corporations LIMIT 1")
            raw_value = cursor.fetchone()[0]
        assert raw_value != "12-3456789"
        assert len(raw_value) > len("12-3456789")

    def test_ssn_roundtrip_after_update(self, settings):
        """Updating ssn_last_four re-encrypts and still decrypts correctly."""
        settings.FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
        encryption_module._fernet_instance = _NOT_INITIALIZED

        contact = ContactFactory(ssn_last_four="1234")
        contact.ssn_last_four = "5678"
        contact.save()
        contact.refresh_from_db()
        assert contact.ssn_last_four == "5678"

    def test_ssn_without_key_stores_plaintext(self, settings):
        """Without encryption key, ssn_last_four is stored as plaintext."""
        settings.FIELD_ENCRYPTION_KEY = ""
        encryption_module._fernet_instance = _NOT_INITIALIZED

        contact = ContactFactory(ssn_last_four="1234")
        contact.refresh_from_db()
        assert contact.ssn_last_four == "1234"

        # Raw DB value should also be plaintext when no key is configured
        with connection.cursor() as cursor:
            cursor.execute("SELECT ssn_last_four FROM crm_contacts LIMIT 1")
            raw_value = cursor.fetchone()[0]
        assert raw_value == "1234"
