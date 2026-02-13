"""
Tests for the backup_db management command.

The command uses Django's dumpdata to export the database to JSON, then
encrypts it with Fernet (from the cryptography library). It supports:
  - --generate-key   to print a fresh Fernet key
  - --output / -o     to set the output file path
  - --key / -k        to pass an encryption key (defaults to FIELD_ENCRYPTION_KEY setting)
"""

import json
import os
import tempfile

import pytest
from cryptography.fernet import Fernet
from django.core.management import call_command


@pytest.mark.django_db
class TestGenerateKeyFlag:
    def test_generate_key_flag(self, capsys):
        """--generate-key should print a valid Fernet key and exit."""
        call_command("backup_db", "--generate-key")
        captured = capsys.readouterr()
        output = captured.out.strip()

        # Extract the key from the "Generated key: <key>" line
        assert "Generated key:" in output
        key_str = output.split("Generated key:")[1].strip()

        # Verify it is a valid Fernet key by constructing a Fernet instance
        fernet = Fernet(key_str.encode())
        # Should be able to encrypt without error
        token = fernet.encrypt(b"test")
        assert fernet.decrypt(token) == b"test"


@pytest.mark.django_db
class TestBackupCreatesEncryptedFile:
    def test_backup_creates_encrypted_file(self, settings):
        """Running backup_db with a valid key should produce an encrypted file
        that is NOT valid JSON (proving it is encrypted)."""
        key = Fernet.generate_key()
        settings.FIELD_ENCRYPTION_KEY = key.decode()

        with tempfile.NamedTemporaryFile(
            suffix=".enc", delete=False
        ) as tmp:
            output_path = tmp.name

        try:
            call_command("backup_db", "--output", output_path)

            # File should exist and not be empty
            assert os.path.exists(output_path)
            file_size = os.path.getsize(output_path)
            assert file_size > 0

            # Content should NOT be valid JSON (it is encrypted bytes)
            with open(output_path, "rb") as f:
                content = f.read()
            with pytest.raises((json.JSONDecodeError, UnicodeDecodeError)):
                json.loads(content)
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_backup_with_explicit_key(self, settings):
        """Passing --key explicitly should override the setting."""
        # Clear the setting so it does not interfere
        settings.FIELD_ENCRYPTION_KEY = ""
        key = Fernet.generate_key()

        with tempfile.NamedTemporaryFile(
            suffix=".enc", delete=False
        ) as tmp:
            output_path = tmp.name

        try:
            call_command("backup_db", "--output", output_path, "--key", key.decode())

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)


@pytest.mark.django_db
class TestBackupWithoutKeyShowsError:
    def test_backup_without_key_shows_error(self, settings, capsys):
        """When no encryption key is available, the command should print an error."""
        # Ensure no key is set
        settings.FIELD_ENCRYPTION_KEY = ""

        call_command("backup_db")
        captured = capsys.readouterr()
        # The error is written to stderr
        assert "No encryption key provided" in captured.err


@pytest.mark.django_db
class TestBackupDecryptRoundtrip:
    def test_backup_decrypt_roundtrip(self, settings):
        """Create a backup, decrypt with the same key, and verify the result
        is valid JSON (the dumpdata output)."""
        key = Fernet.generate_key()
        settings.FIELD_ENCRYPTION_KEY = key.decode()

        with tempfile.NamedTemporaryFile(
            suffix=".enc", delete=False
        ) as tmp:
            output_path = tmp.name

        try:
            call_command("backup_db", "--output", output_path)

            # Read encrypted content
            with open(output_path, "rb") as f:
                encrypted_data = f.read()

            # Decrypt
            fernet = Fernet(key)
            decrypted = fernet.decrypt(encrypted_data)

            # Decrypted content should be valid JSON
            parsed = json.loads(decrypted)
            assert isinstance(parsed, list)

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_roundtrip_with_explicit_key(self, settings):
        """Same roundtrip but using --key rather than the setting."""
        settings.FIELD_ENCRYPTION_KEY = ""
        key = Fernet.generate_key()

        with tempfile.NamedTemporaryFile(
            suffix=".enc", delete=False
        ) as tmp:
            output_path = tmp.name

        try:
            call_command("backup_db", "--output", output_path, "--key", key.decode())

            with open(output_path, "rb") as f:
                encrypted_data = f.read()

            fernet = Fernet(key)
            decrypted = fernet.decrypt(encrypted_data)
            parsed = json.loads(decrypted)
            assert isinstance(parsed, list)

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_wrong_key_cannot_decrypt(self, settings):
        """Decrypting with a different key should fail."""
        key = Fernet.generate_key()
        wrong_key = Fernet.generate_key()
        settings.FIELD_ENCRYPTION_KEY = key.decode()

        with tempfile.NamedTemporaryFile(
            suffix=".enc", delete=False
        ) as tmp:
            output_path = tmp.name

        try:
            call_command("backup_db", "--output", output_path)

            with open(output_path, "rb") as f:
                encrypted_data = f.read()

            fernet = Fernet(wrong_key)
            with pytest.raises(Exception):
                fernet.decrypt(encrypted_data)

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
