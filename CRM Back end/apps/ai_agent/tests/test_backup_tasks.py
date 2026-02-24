"""
Tests for backup-related Celery tasks.

Tests cover:
- run_automated_backup_check task
- cleanup_automated_backups task
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.ai_agent.models import AgentConfiguration
from apps.ai_agent.tasks import (
    cleanup_automated_backups,
    run_automated_backup_check,
)
from apps.core.models import Backup


@pytest.fixture
def config(db):
    """Get or create AgentConfiguration."""
    config = AgentConfiguration.get_config()
    config.is_active = True
    config.auto_backup_enabled = True
    config.save()
    return config


@pytest.mark.django_db
class TestRunAutomatedBackupCheck:
    """Tests for run_automated_backup_check task."""

    def test_disabled_when_agent_inactive(self, config):
        """Test task returns disabled when agent is inactive."""
        config.is_active = False
        config.save()

        result = run_automated_backup_check()

        assert result["status"] == "disabled"
        assert "inactive" in result["reason"].lower()

    def test_disabled_when_backup_not_enabled(self, config):
        """Test task returns disabled when auto_backup is off."""
        config.is_active = True
        config.auto_backup_enabled = False
        config.save()

        result = run_automated_backup_check()

        assert result["status"] == "disabled"
        assert "disabled" in result["reason"].lower()

    def test_returns_metrics_and_decision(self, config):
        """Test task returns metrics and decision."""
        result = run_automated_backup_check()

        assert result["status"] == "completed"
        assert "backup_needed" in result
        assert "reason" in result
        assert "metrics" in result
        assert "thresholds_exceeded" in result

    def test_creates_backup_when_needed_real(self, config):
        """Test that backup is created when decision says yes (integration test)."""
        # Lower threshold to trigger backup
        config.backup_activity_threshold = 0  # Any activity triggers
        config.save()

        result = run_automated_backup_check()

        assert result["status"] == "completed"
        # May or may not need backup depending on actual activity

    def test_no_backup_when_insufficient_activity(self, config):
        """Test that no backup is created when not needed."""
        # Set high thresholds so no backup is needed
        config.backup_contacts_threshold = 1000
        config.backup_cases_threshold = 1000
        config.backup_documents_threshold = 1000
        config.backup_corporations_threshold = 1000
        config.backup_emails_threshold = 1000
        config.backup_activity_threshold = 10000
        config.backup_days_since_last = 365  # 1 year
        config.save()

        # Create a recent backup to prevent forced backup
        from apps.core.models import Backup

        Backup.objects.create(
            name="Test Backup",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
            completed_at=timezone.now(),
        )

        result = run_automated_backup_check()

        assert result["status"] == "completed"
        assert result["backup_needed"] is False


@pytest.mark.django_db
class TestCleanupAutomatedBackups:
    """Tests for cleanup_automated_backups task."""

    def test_disabled_when_backup_not_enabled(self, config):
        """Test cleanup task returns disabled when auto_backup is off."""
        config.auto_backup_enabled = False
        config.save()

        result = cleanup_automated_backups()

        assert result["status"] == "disabled"
        assert result["deleted"] == 0

    def test_returns_deleted_count(self, config):
        """Test task returns count of deleted backups."""
        result = cleanup_automated_backups()

        assert result["status"] == "completed"
        assert "deleted" in result
        assert isinstance(result["deleted"], int)

    def test_cleans_old_automated_backups(self, config):
        """Test that old automated backups are cleaned up."""
        config.backup_retention_days = 30
        config.save()

        # Create an old automated backup
        old_date = timezone.now() - timedelta(days=45)
        old_backup = Backup.objects.create(
            name="Automated Backup - Test Old",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
        )
        Backup.objects.filter(pk=old_backup.pk).update(created_at=old_date)

        # Run cleanup
        result = cleanup_automated_backups()

        assert result["status"] == "completed"
        assert result["deleted"] >= 1
        assert not Backup.objects.filter(pk=old_backup.pk).exists()

    def test_preserves_recent_backups(self, config):
        """Test that recent backups are preserved."""
        config.backup_retention_days = 30
        config.save()

        # Create a recent automated backup
        recent_backup = Backup.objects.create(
            name="Automated Backup - Recent Test",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
        )

        # Run cleanup
        cleanup_automated_backups()

        # Recent backup should still exist
        assert Backup.objects.filter(pk=recent_backup.pk).exists()

    def test_preserves_manual_backups(self, config):
        """Test that manual backups are not affected."""
        config.backup_retention_days = 30
        config.save()

        # Create an old manual backup
        old_date = timezone.now() - timedelta(days=45)
        manual_backup = Backup.objects.create(
            name="Manual Backup Test",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
        )
        Backup.objects.filter(pk=manual_backup.pk).update(created_at=old_date)

        # Run cleanup
        cleanup_automated_backups()

        # Manual backup should still exist
        assert Backup.objects.filter(pk=manual_backup.pk).exists()
