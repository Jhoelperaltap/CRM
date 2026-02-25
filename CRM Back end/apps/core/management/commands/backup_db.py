"""
Management command to create an encrypted database backup.

Usage:
    python manage.py backup_db
    python manage.py backup_db --output /path/to/backup.enc
    python manage.py backup_db --key <base64-fernet-key>
"""

import tempfile
from datetime import datetime
from pathlib import Path

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Create an encrypted database backup using Django dumpdata + Fernet encryption."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            "-o",
            type=str,
            default="",
            help="Output path for the encrypted backup file.",
        )
        parser.add_argument(
            "--key",
            type=str,
            default="",
            help="Fernet encryption key (base64). Defaults to FIELD_ENCRYPTION_KEY.",
        )
        parser.add_argument(
            "--generate-key",
            action="store_true",
            help="Generate and print a new Fernet key, then exit.",
        )

    def handle(self, *args, **options):
        if options["generate_key"]:
            key = Fernet.generate_key().decode()
            self.stdout.write(f"Generated key: {key}")
            return

        # Determine encryption key
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

        # Determine output path
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = options["output"] or f"backup_{timestamp}.enc"

        self.stdout.write("Creating database dump...")

        # Dump data to JSON
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
            call_command(
                "dumpdata",
                "--natural-foreign",
                "--natural-primary",
                "--indent",
                "2",
                stdout=tmp,
            )
            tmp_path = tmp.name

        # Read and encrypt
        self.stdout.write("Encrypting backup...")
        with open(tmp_path, "rb") as f:
            plaintext = f.read()

        encrypted = fernet.encrypt(plaintext)

        # Write encrypted file
        Path(output_path).write_bytes(encrypted)

        # Clean up temp file
        Path(tmp_path).unlink(missing_ok=True)

        size_mb = len(encrypted) / (1024 * 1024)
        self.stdout.write(
            self.style.SUCCESS(
                f"Backup saved to {output_path} ({size_mb:.2f} MB encrypted)"
            )
        )
