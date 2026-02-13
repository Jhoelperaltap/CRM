"""
Management command to restore an encrypted database backup.

Usage:
    python manage.py restore_db backup_20250101_120000.enc
    python manage.py restore_db backup.enc --key <base64-fernet-key>
"""

import tempfile
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Restore a database from an encrypted backup file."

    def add_arguments(self, parser):
        parser.add_argument(
            "input_file",
            type=str,
            help="Path to the encrypted backup file.",
        )
        parser.add_argument(
            "--key", "-k",
            type=str,
            default="",
            help="Fernet encryption key (base64). Defaults to FIELD_ENCRYPTION_KEY.",
        )

    def handle(self, *args, **options):
        input_path = options["input_file"]
        if not Path(input_path).exists():
            self.stderr.write(self.style.ERROR(f"File not found: {input_path}"))
            return

        key = options["key"] or getattr(settings, "FIELD_ENCRYPTION_KEY", "")
        if not key:
            self.stderr.write(
                self.style.ERROR(
                    "No encryption key provided. Use --key or set FIELD_ENCRYPTION_KEY."
                )
            )
            return

        if isinstance(key, str):
            key = key.encode()

        fernet = Fernet(key)

        self.stdout.write(f"Decrypting {input_path}...")

        encrypted = Path(input_path).read_bytes()
        try:
            plaintext = fernet.decrypt(encrypted)
        except InvalidToken:
            self.stderr.write(
                self.style.ERROR("Decryption failed. Wrong key or corrupted file.")
            )
            return

        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=".json", delete=False
        ) as tmp:
            tmp.write(plaintext)
            tmp_path = tmp.name

        self.stdout.write("Loading data into database...")
        call_command("loaddata", tmp_path)

        Path(tmp_path).unlink(missing_ok=True)

        self.stdout.write(self.style.SUCCESS("Restore completed successfully."))
