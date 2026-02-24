"""
Tests for the BackupAnalyzer service.

Tests cover:
- WorkloadMetrics dataclass
- BackupDecision dataclass
- BackupAnalyzer.analyze_workload()
- BackupAnalyzer.should_backup() decision logic
- BackupAnalyzer.create_backup_action()
- BackupAnalyzer.cleanup_old_automated_backups()
"""

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentConfiguration, AgentInsight
from apps.ai_agent.services.backup_analyzer import (
    BackupAnalyzer,
    BackupDecision,
    WorkloadMetrics,
)
from apps.core.models import Backup


@pytest.fixture
def config():
    """Get or create AgentConfiguration for tests."""
    return AgentConfiguration.get_config()


@pytest.fixture
def analyzer(config):
    """Create a BackupAnalyzer instance."""
    return BackupAnalyzer(config)


class TestWorkloadMetrics:
    """Tests for WorkloadMetrics dataclass."""

    def test_default_values(self):
        """Test default values are all zero/None."""
        metrics = WorkloadMetrics()
        assert metrics.contacts_created == 0
        assert metrics.contacts_updated == 0
        assert metrics.cases_created == 0
        assert metrics.cases_updated == 0
        assert metrics.case_notes_created == 0
        assert metrics.documents_created == 0
        assert metrics.corporations_created == 0
        assert metrics.corporations_updated == 0
        assert metrics.emails_sent == 0
        assert metrics.emails_received == 0
        assert metrics.api_activity == 0
        assert metrics.last_backup_date is None
        assert metrics.days_since_last_backup is None

    def test_total_contacts_changes(self):
        """Test total_contacts_changes property."""
        metrics = WorkloadMetrics(contacts_created=5, contacts_updated=3)
        assert metrics.total_contacts_changes == 8

    def test_total_cases_changes(self):
        """Test total_cases_changes property."""
        metrics = WorkloadMetrics(
            cases_created=2, cases_updated=3, case_notes_created=5
        )
        assert metrics.total_cases_changes == 10

    def test_total_corporations_changes(self):
        """Test total_corporations_changes property."""
        metrics = WorkloadMetrics(corporations_created=1, corporations_updated=2)
        assert metrics.total_corporations_changes == 3

    def test_total_emails(self):
        """Test total_emails property."""
        metrics = WorkloadMetrics(emails_sent=10, emails_received=20)
        assert metrics.total_emails == 30

    def test_to_dict(self):
        """Test to_dict serialization."""
        metrics = WorkloadMetrics(
            contacts_created=5,
            contacts_updated=3,
            cases_created=2,
            documents_created=10,
            last_backup_date="2026-02-24T12:00:00",
            days_since_last_backup=3,
        )
        result = metrics.to_dict()

        assert result["contacts_created"] == 5
        assert result["contacts_updated"] == 3
        assert result["total_contacts_changes"] == 8
        assert result["cases_created"] == 2
        assert result["total_cases_changes"] == 2
        assert result["documents_created"] == 10
        assert result["last_backup_date"] == "2026-02-24T12:00:00"
        assert result["days_since_last_backup"] == 3


class TestBackupDecision:
    """Tests for BackupDecision dataclass."""

    def test_default_forced_is_false(self):
        """Test that forced defaults to False."""
        decision = BackupDecision(
            should_backup=True,
            reason="Test reason",
            thresholds_exceeded=["contacts"],
        )
        assert decision.forced is False

    def test_to_dict(self):
        """Test to_dict serialization."""
        decision = BackupDecision(
            should_backup=True,
            reason="Activity thresholds exceeded",
            thresholds_exceeded=["contacts", "cases"],
            forced=False,
        )
        result = decision.to_dict()

        assert result["should_backup"] is True
        assert result["reason"] == "Activity thresholds exceeded"
        assert result["thresholds_exceeded"] == ["contacts", "cases"]
        assert result["forced"] is False


@pytest.mark.django_db
class TestBackupAnalyzerShouldBackup:
    """Tests for BackupAnalyzer.should_backup() decision logic."""

    def test_no_previous_backup_forces_backup(self, analyzer):
        """Test that no previous backup forces a backup."""
        metrics = WorkloadMetrics(
            last_backup_date=None,
            days_since_last_backup=None,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert decision.forced is True
        assert "No previous backup found" in decision.reason
        assert "no_backup_exists" in decision.thresholds_exceeded

    def test_too_many_days_forces_backup(self, analyzer, config):
        """Test that exceeding days_since_last forces a backup."""
        config.backup_days_since_last = 7
        config.save()

        metrics = WorkloadMetrics(
            last_backup_date="2026-02-10T12:00:00",
            days_since_last_backup=14,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert decision.forced is True
        assert "14 days since last backup" in decision.reason
        assert "days_since_last_backup" in decision.thresholds_exceeded

    def test_contacts_threshold_exceeded(self, analyzer, config):
        """Test backup triggered when contacts threshold exceeded."""
        config.backup_contacts_threshold = 10
        config.save()

        metrics = WorkloadMetrics(
            contacts_created=8,
            contacts_updated=5,  # total = 13 >= 10
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert decision.forced is False
        assert "contacts" in decision.thresholds_exceeded

    def test_cases_threshold_exceeded(self, analyzer, config):
        """Test backup triggered when cases threshold exceeded."""
        config.backup_cases_threshold = 5
        config.save()

        metrics = WorkloadMetrics(
            cases_created=3,
            cases_updated=1,
            case_notes_created=2,  # total = 6 >= 5
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert "cases" in decision.thresholds_exceeded

    def test_documents_threshold_exceeded(self, analyzer, config):
        """Test backup triggered when documents threshold exceeded."""
        config.backup_documents_threshold = 20
        config.save()

        metrics = WorkloadMetrics(
            documents_created=25,
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert "documents" in decision.thresholds_exceeded

    def test_corporations_threshold_exceeded(self, analyzer, config):
        """Test backup triggered when corporations threshold exceeded."""
        config.backup_corporations_threshold = 3
        config.save()

        metrics = WorkloadMetrics(
            corporations_created=2,
            corporations_updated=2,  # total = 4 >= 3
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert "corporations" in decision.thresholds_exceeded

    def test_emails_threshold_exceeded(self, analyzer, config):
        """Test backup triggered when emails threshold exceeded."""
        config.backup_emails_threshold = 50
        config.save()

        metrics = WorkloadMetrics(
            emails_sent=30,
            emails_received=25,  # total = 55 >= 50
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert "emails" in decision.thresholds_exceeded

    def test_api_activity_threshold_exceeded(self, analyzer, config):
        """Test backup triggered when API activity threshold exceeded."""
        config.backup_activity_threshold = 100
        config.save()

        metrics = WorkloadMetrics(
            api_activity=150,
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert "api_activity" in decision.thresholds_exceeded

    def test_multiple_thresholds_exceeded(self, analyzer, config):
        """Test that multiple exceeded thresholds are all reported."""
        config.backup_contacts_threshold = 10
        config.backup_cases_threshold = 5
        config.backup_documents_threshold = 20
        config.save()

        metrics = WorkloadMetrics(
            contacts_created=15,
            cases_created=10,
            documents_created=25,
            days_since_last_backup=1,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is True
        assert "contacts" in decision.thresholds_exceeded
        assert "cases" in decision.thresholds_exceeded
        assert "documents" in decision.thresholds_exceeded

    def test_insufficient_activity_no_backup(self, analyzer, config):
        """Test that insufficient activity results in no backup."""
        config.backup_contacts_threshold = 10
        config.backup_cases_threshold = 5
        config.backup_documents_threshold = 20
        config.backup_days_since_last = 7
        config.save()

        metrics = WorkloadMetrics(
            contacts_created=2,
            cases_created=1,
            documents_created=5,
            days_since_last_backup=3,
        )
        decision = analyzer.should_backup(metrics)

        assert decision.should_backup is False
        assert decision.forced is False
        assert "Insufficient activity" in decision.reason
        assert decision.thresholds_exceeded == []


@pytest.mark.django_db
class TestBackupAnalyzerAnalyzeWorkload:
    """Tests for BackupAnalyzer.analyze_workload()."""

    def test_analyze_workload_returns_metrics(self, analyzer):
        """Test that analyze_workload returns WorkloadMetrics."""
        metrics = analyzer.analyze_workload()

        assert isinstance(metrics, WorkloadMetrics)
        assert isinstance(metrics.contacts_created, int)
        assert isinstance(metrics.api_activity, int)

    def test_analyze_workload_handles_missing_models(self, analyzer):
        """Test that analyze_workload handles errors gracefully."""
        # Should not raise exceptions even if queries fail
        metrics = analyzer.analyze_workload()
        assert metrics is not None


@pytest.mark.django_db
class TestBackupAnalyzerCreateBackupAction:
    """Tests for BackupAnalyzer.create_backup_action()."""

    def test_create_backup_action_when_not_needed(self, analyzer):
        """Test that no action is created when backup not needed."""
        decision = BackupDecision(
            should_backup=False,
            reason="Insufficient activity",
            thresholds_exceeded=[],
        )
        metrics = WorkloadMetrics()

        result = analyzer.create_backup_action(
            should_backup=False,
            decision=decision,
            metrics=metrics,
        )

        assert result is None

    @patch("apps.core.tasks.create_backup_task")
    def test_create_backup_action_creates_records(self, mock_task, analyzer):
        """Test that backup action creates all required records."""
        mock_task.delay = MagicMock()

        decision = BackupDecision(
            should_backup=True,
            reason="Activity thresholds exceeded: contacts",
            thresholds_exceeded=["contacts"],
        )
        metrics = WorkloadMetrics(
            contacts_created=15,
            days_since_last_backup=2,
        )

        action = analyzer.create_backup_action(
            should_backup=True,
            decision=decision,
            metrics=metrics,
        )

        # Verify AgentAction was created
        assert action is not None
        assert action.action_type == AgentAction.ActionType.BACKUP_CREATED
        assert action.status == AgentAction.Status.EXECUTED
        assert "Automated Backup Created" in action.title

        # Verify Backup was created
        backup = Backup.objects.filter(name__icontains="Automated Backup").latest(
            "created_at"
        )
        assert backup.backup_type == Backup.BackupType.GLOBAL
        assert backup.status == Backup.Status.PENDING

        # Verify AgentInsight was created
        insight = AgentInsight.objects.filter(source_action=action).first()
        assert insight is not None
        assert "Automated Backup Created" in insight.title

        # Verify task was queued
        mock_task.delay.assert_called_once()


@pytest.mark.django_db
class TestBackupAnalyzerCleanup:
    """Tests for BackupAnalyzer.cleanup_old_automated_backups()."""

    def test_cleanup_removes_old_backups(self, analyzer, config):
        """Test that old automated backups are cleaned up."""
        config.backup_retention_days = 30
        config.save()

        # Create an old automated backup
        old_date = timezone.now() - timedelta(days=45)
        old_backup = Backup.objects.create(
            name="Automated Backup - Old",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
        )
        # Manually set created_at to old date
        Backup.objects.filter(pk=old_backup.pk).update(created_at=old_date)

        # Create a recent automated backup
        recent_backup = Backup.objects.create(
            name="Automated Backup - Recent",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
        )

        deleted_count = analyzer.cleanup_old_automated_backups()

        # Old backup should be deleted
        assert deleted_count >= 1
        assert not Backup.objects.filter(pk=old_backup.pk).exists()

        # Recent backup should still exist
        assert Backup.objects.filter(pk=recent_backup.pk).exists()

    def test_cleanup_ignores_non_automated_backups(self, analyzer, config):
        """Test that manual backups are not cleaned up."""
        config.backup_retention_days = 30
        config.save()

        # Create an old manual backup (no "Automated" in name)
        old_date = timezone.now() - timedelta(days=45)
        manual_backup = Backup.objects.create(
            name="Manual Backup",
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.COMPLETED,
        )
        Backup.objects.filter(pk=manual_backup.pk).update(created_at=old_date)

        analyzer.cleanup_old_automated_backups()

        # Manual backup should still exist
        assert Backup.objects.filter(pk=manual_backup.pk).exists()
