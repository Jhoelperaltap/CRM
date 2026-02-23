"""
Backup and restore service for EJFLOW CRM.

Supports:
- Global backups: Full database dump + optional media files
- Tenant backups: Corporation-specific data export
- Encrypted storage using Fernet (AES-128)
- SHA-256 checksum for integrity verification
"""

import hashlib
import json
import logging
import os
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.management import call_command
from django.core.serializers import serialize
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

# Models to include in tenant backups (models with corporation FK)
TENANT_MODELS = [
    ("corporations", "Corporation"),
    ("contacts", "Contact"),
    ("cases", "TaxCase"),
    ("cases", "TaxCaseNote"),
    ("documents", "Document"),
    ("documents", "DocumentLink"),
    ("documents", "DepartmentClientFolder"),
    ("quotes", "Quote"),
    ("quotes", "QuoteLineItem"),
]


class BackupService:
    """Service for creating and restoring encrypted backups."""

    def __init__(self):
        self.backup_dir = Path(settings.MEDIA_ROOT) / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self._fernet = None

    @property
    def fernet(self) -> Optional[Fernet]:
        """Get or create Fernet instance for encryption."""
        if self._fernet is None:
            key = getattr(settings, "FIELD_ENCRYPTION_KEY", "")
            if not key:
                logger.warning(
                    "FIELD_ENCRYPTION_KEY not set. Backups will not be encrypted."
                )
                return None
            if isinstance(key, str):
                key = key.encode()
            try:
                self._fernet = Fernet(key)
            except Exception as e:
                logger.error(f"Invalid FIELD_ENCRYPTION_KEY: {e}")
                return None
        return self._fernet

    def _compute_checksum(self, data: bytes) -> str:
        """Compute SHA-256 checksum of data."""
        return hashlib.sha256(data).hexdigest()

    def _encrypt(self, data: bytes) -> bytes:
        """Encrypt data using Fernet. Returns original if no key configured."""
        if self.fernet is None:
            return data
        return self.fernet.encrypt(data)

    def _decrypt(self, data: bytes) -> bytes:
        """Decrypt data using Fernet. Returns original if no key configured."""
        if self.fernet is None:
            return data
        try:
            return self.fernet.decrypt(data)
        except InvalidToken:
            raise ValueError("Decryption failed. Wrong key or corrupted file.")

    def create_global_backup(self, backup) -> None:
        """
        Create a global backup containing all database data and optional media.

        Args:
            backup: Backup model instance to update with results
        """
        from apps.core.models import Backup

        try:
            backup.status = Backup.Status.IN_PROGRESS
            backup.save(update_fields=["status", "updated_at"])

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"global_backup_{timestamp}.enc"
            file_path = self.backup_dir / filename

            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp_path = Path(tmp_dir)

                # Dump database to JSON
                db_file = tmp_path / "database.json"
                with open(db_file, "w") as f:
                    call_command(
                        "dumpdata",
                        "--natural-foreign",
                        "--natural-primary",
                        "--indent",
                        "2",
                        stdout=f,
                    )

                # Create metadata
                metadata = {
                    "backup_type": "global",
                    "created_at": timezone.now().isoformat(),
                    "backup_id": str(backup.id),
                    "include_media": backup.include_media,
                    "django_version": (
                        settings.DJANGO_VERSION
                        if hasattr(settings, "DJANGO_VERSION")
                        else "unknown"
                    ),
                }

                metadata_file = tmp_path / "metadata.json"
                with open(metadata_file, "w") as f:
                    json.dump(metadata, f, indent=2)

                # Create ZIP archive
                zip_file = tmp_path / "backup.zip"
                with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zf:
                    zf.write(db_file, "database.json")
                    zf.write(metadata_file, "metadata.json")

                    # Include media if requested
                    if backup.include_media:
                        media_root = Path(settings.MEDIA_ROOT)
                        if media_root.exists():
                            for root, _dirs, files in os.walk(media_root):
                                # Skip backups directory to avoid recursion
                                if "backups" in root:
                                    continue
                                for file in files:
                                    file_path_full = Path(root) / file
                                    arc_name = f"media/{file_path_full.relative_to(media_root)}"
                                    zf.write(file_path_full, arc_name)

                # Read, encrypt, and save
                with open(zip_file, "rb") as f:
                    plaintext = f.read()

                encrypted = self._encrypt(plaintext)
                checksum = self._compute_checksum(encrypted)

                with open(file_path, "wb") as f:
                    f.write(encrypted)

                # Update backup record
                backup.file_path = str(file_path.relative_to(settings.MEDIA_ROOT))
                backup.file_size = len(encrypted)
                backup.checksum = checksum
                backup.status = Backup.Status.COMPLETED
                backup.completed_at = timezone.now()
                backup.save()

                logger.info(
                    f"Global backup created: {backup.name} ({backup.file_size_human})"
                )

        except Exception as e:
            logger.exception(f"Global backup failed: {e}")
            backup.status = Backup.Status.FAILED
            backup.error_message = str(e)
            backup.save(update_fields=["status", "error_message", "updated_at"])
            raise

    def create_tenant_backup(self, backup, corporation_id: str) -> None:
        """
        Create a tenant-specific backup for a corporation.

        Args:
            backup: Backup model instance to update with results
            corporation_id: UUID of the corporation to backup
        """
        from apps.core.models import Backup
        from apps.corporations.models import Corporation

        try:
            backup.status = Backup.Status.IN_PROGRESS
            backup.save(update_fields=["status", "updated_at"])

            corporation = Corporation.objects.get(id=corporation_id)
            backup.corporation = corporation
            backup.save(update_fields=["corporation"])

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = "".join(
                c for c in corporation.name if c.isalnum() or c in "._- "
            )[:50]
            filename = f"tenant_{safe_name}_{timestamp}.enc"
            file_path = self.backup_dir / filename

            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp_path = Path(tmp_dir)

                # Collect tenant data
                tenant_data = {"corporation_id": str(corporation_id), "models": {}}

                for app_label, model_name in TENANT_MODELS:
                    try:
                        from django.apps import apps

                        model = apps.get_model(app_label, model_name)

                        # Determine filter field
                        if model_name == "Corporation":
                            queryset = model.objects.filter(id=corporation_id)
                        elif hasattr(model, "corporation"):
                            queryset = model.objects.filter(
                                corporation_id=corporation_id
                            )
                        elif hasattr(model, "contact") and hasattr(
                            model.contact.field.related_model, "corporation"
                        ):
                            # Handle models related through contact
                            queryset = model.objects.filter(
                                contact__corporation_id=corporation_id
                            )
                        else:
                            continue

                        if queryset.exists():
                            serialized = serialize("json", queryset, indent=2)
                            tenant_data["models"][f"{app_label}.{model_name}"] = (
                                json.loads(serialized)
                            )

                    except Exception as e:
                        logger.warning(
                            f"Could not serialize {app_label}.{model_name}: {e}"
                        )

                # Create metadata
                metadata = {
                    "backup_type": "tenant",
                    "corporation_id": str(corporation_id),
                    "corporation_name": corporation.name,
                    "created_at": timezone.now().isoformat(),
                    "backup_id": str(backup.id),
                    "include_media": backup.include_media,
                    "model_counts": {
                        k: len(v) for k, v in tenant_data["models"].items()
                    },
                }

                # Write data files
                data_file = tmp_path / "tenant_data.json"
                with open(data_file, "w") as f:
                    json.dump(tenant_data, f, indent=2)

                metadata_file = tmp_path / "metadata.json"
                with open(metadata_file, "w") as f:
                    json.dump(metadata, f, indent=2)

                # Create ZIP archive
                zip_file = tmp_path / "backup.zip"
                with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zf:
                    zf.write(data_file, "tenant_data.json")
                    zf.write(metadata_file, "metadata.json")

                    # Include tenant media if requested
                    if backup.include_media:
                        media_root = Path(settings.MEDIA_ROOT)
                        # Include corporation images and documents
                        corp_dirs = [
                            media_root / "corporations" / str(corporation_id),
                            media_root / "documents" / str(corporation_id),
                        ]
                        for corp_dir in corp_dirs:
                            if corp_dir.exists():
                                for root, _dirs, files in os.walk(corp_dir):
                                    for file in files:
                                        file_path_full = Path(root) / file
                                        arc_name = f"media/{file_path_full.relative_to(media_root)}"
                                        zf.write(file_path_full, arc_name)

                # Read, encrypt, and save
                with open(zip_file, "rb") as f:
                    plaintext = f.read()

                encrypted = self._encrypt(plaintext)
                checksum = self._compute_checksum(encrypted)

                with open(file_path, "wb") as f:
                    f.write(encrypted)

                # Update backup record
                backup.file_path = str(file_path.relative_to(settings.MEDIA_ROOT))
                backup.file_size = len(encrypted)
                backup.checksum = checksum
                backup.status = Backup.Status.COMPLETED
                backup.completed_at = timezone.now()
                backup.save()

                logger.info(
                    f"Tenant backup created: {backup.name} for {corporation.name} ({backup.file_size_human})"
                )

        except Exception as e:
            logger.exception(f"Tenant backup failed: {e}")
            backup.status = Backup.Status.FAILED
            backup.error_message = str(e)
            backup.save(update_fields=["status", "error_message", "updated_at"])
            raise

    def restore_global_backup(self, backup, confirm: bool = False) -> dict:
        """
        Restore a global backup.

        Args:
            backup: Backup model instance to restore from
            confirm: Must be True to proceed with restore

        Returns:
            dict with restore status and details
        """
        if not confirm:
            raise ValueError("Restore requires explicit confirmation")

        file_path = Path(settings.MEDIA_ROOT) / backup.file_path
        if not file_path.exists():
            raise FileNotFoundError(f"Backup file not found: {file_path}")

        # Verify checksum
        with open(file_path, "rb") as f:
            encrypted = f.read()

        if backup.checksum and self._compute_checksum(encrypted) != backup.checksum:
            raise ValueError("Checksum mismatch - backup file may be corrupted")

        # Decrypt
        plaintext = self._decrypt(encrypted)

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            zip_file = tmp_path / "backup.zip"

            with open(zip_file, "wb") as f:
                f.write(plaintext)

            # Extract
            with zipfile.ZipFile(zip_file, "r") as zf:
                zf.extractall(tmp_path)

            # Load metadata
            metadata_file = tmp_path / "metadata.json"
            with open(metadata_file, "r") as f:
                metadata = json.load(f)

            # Restore database
            db_file = tmp_path / "database.json"
            if db_file.exists():
                call_command("loaddata", str(db_file))

            # Restore media if present
            media_dir = tmp_path / "media"
            if media_dir.exists() and metadata.get("include_media"):
                media_root = Path(settings.MEDIA_ROOT)
                for root, _dirs, files in os.walk(media_dir):
                    for file in files:
                        src = Path(root) / file
                        rel_path = src.relative_to(media_dir)
                        dst = media_root / rel_path
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, dst)

            logger.info(f"Global backup restored: {backup.name}")
            return {
                "status": "success",
                "backup_type": "global",
                "restored_at": timezone.now().isoformat(),
                "include_media": metadata.get("include_media", False),
            }

    def restore_tenant_backup(self, backup, confirm: bool = False) -> dict:
        """
        Restore a tenant-specific backup.

        Args:
            backup: Backup model instance to restore from
            confirm: Must be True to proceed with restore

        Returns:
            dict with restore status and details
        """
        if not confirm:
            raise ValueError("Restore requires explicit confirmation")

        file_path = Path(settings.MEDIA_ROOT) / backup.file_path
        if not file_path.exists():
            raise FileNotFoundError(f"Backup file not found: {file_path}")

        # Verify checksum
        with open(file_path, "rb") as f:
            encrypted = f.read()

        if backup.checksum and self._compute_checksum(encrypted) != backup.checksum:
            raise ValueError("Checksum mismatch - backup file may be corrupted")

        # Decrypt
        plaintext = self._decrypt(encrypted)

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            zip_file = tmp_path / "backup.zip"

            with open(zip_file, "wb") as f:
                f.write(plaintext)

            # Extract
            with zipfile.ZipFile(zip_file, "r") as zf:
                zf.extractall(tmp_path)

            # Load metadata
            metadata_file = tmp_path / "metadata.json"
            with open(metadata_file, "r") as f:
                metadata = json.load(f)

            # Load tenant data
            data_file = tmp_path / "tenant_data.json"
            with open(data_file, "r") as f:
                tenant_data = json.load(f)

            restored_counts = {}

            with transaction.atomic():
                # Restore each model's data
                from django.core.serializers import deserialize

                for model_key, objects in tenant_data.get("models", {}).items():
                    app_label, model_name = model_key.split(".")
                    try:
                        # Convert back to JSON string for deserialize
                        json_str = json.dumps(objects)
                        for obj in deserialize("json", json_str):
                            obj.save()
                        restored_counts[model_key] = len(objects)
                    except Exception as e:
                        logger.warning(f"Could not restore {model_key}: {e}")

            # Restore media if present
            media_dir = tmp_path / "media"
            if media_dir.exists() and metadata.get("include_media"):
                media_root = Path(settings.MEDIA_ROOT)
                for root, _dirs, files in os.walk(media_dir):
                    for file in files:
                        src = Path(root) / file
                        rel_path = src.relative_to(media_dir)
                        dst = media_root / rel_path
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, dst)

            logger.info(
                f"Tenant backup restored: {backup.name} for {metadata.get('corporation_name')}"
            )
            return {
                "status": "success",
                "backup_type": "tenant",
                "corporation_id": metadata.get("corporation_id"),
                "corporation_name": metadata.get("corporation_name"),
                "restored_at": timezone.now().isoformat(),
                "restored_counts": restored_counts,
                "include_media": metadata.get("include_media", False),
            }

    def delete_backup_file(self, backup) -> None:
        """Delete the backup file from disk."""
        if backup.file_path:
            file_path = Path(settings.MEDIA_ROOT) / backup.file_path
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted backup file: {file_path}")
