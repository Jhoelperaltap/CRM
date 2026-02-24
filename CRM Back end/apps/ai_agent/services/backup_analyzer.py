"""
Backup Analyzer service for AI-powered automated backups.

Analyzes daily workload to decide if a backup is needed based on:
- Number of contacts created/updated
- Number of cases created/updated + notes
- Number of documents uploaded
- Number of corporations created/updated
- Number of emails sent/received
- API activity (audit logs)
- Days since last backup
"""

import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING, Optional

from django.db.models import Count, Q
from django.utils import timezone

if TYPE_CHECKING:
    from apps.ai_agent.models import AgentConfiguration

logger = logging.getLogger(__name__)


@dataclass
class WorkloadMetrics:
    """Daily workload metrics for backup decision."""

    # Entity changes
    contacts_created: int = 0
    contacts_updated: int = 0
    cases_created: int = 0
    cases_updated: int = 0
    case_notes_created: int = 0
    documents_created: int = 0
    corporations_created: int = 0
    corporations_updated: int = 0
    emails_sent: int = 0
    emails_received: int = 0
    api_activity: int = 0

    # Backup info
    last_backup_date: Optional[str] = None
    days_since_last_backup: Optional[int] = None

    @property
    def total_contacts_changes(self) -> int:
        return self.contacts_created + self.contacts_updated

    @property
    def total_cases_changes(self) -> int:
        return self.cases_created + self.cases_updated + self.case_notes_created

    @property
    def total_corporations_changes(self) -> int:
        return self.corporations_created + self.corporations_updated

    @property
    def total_emails(self) -> int:
        return self.emails_sent + self.emails_received

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "contacts_created": self.contacts_created,
            "contacts_updated": self.contacts_updated,
            "cases_created": self.cases_created,
            "cases_updated": self.cases_updated,
            "case_notes_created": self.case_notes_created,
            "documents_created": self.documents_created,
            "corporations_created": self.corporations_created,
            "corporations_updated": self.corporations_updated,
            "emails_sent": self.emails_sent,
            "emails_received": self.emails_received,
            "api_activity": self.api_activity,
            "last_backup_date": self.last_backup_date,
            "days_since_last_backup": self.days_since_last_backup,
            "total_contacts_changes": self.total_contacts_changes,
            "total_cases_changes": self.total_cases_changes,
            "total_corporations_changes": self.total_corporations_changes,
            "total_emails": self.total_emails,
        }


@dataclass
class BackupDecision:
    """Result of backup analysis."""

    should_backup: bool
    reason: str
    thresholds_exceeded: list[str]
    forced: bool = False

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "should_backup": self.should_backup,
            "reason": self.reason,
            "thresholds_exceeded": self.thresholds_exceeded,
            "forced": self.forced,
        }


class BackupAnalyzer:
    """
    Service that analyzes daily workload and decides if a backup is needed.

    The analyzer checks multiple factors:
    1. Days since last backup (forces backup if threshold exceeded)
    2. Contact changes
    3. Case changes (including notes)
    4. New documents
    5. Corporation changes
    6. Email activity
    7. API activity (audit logs)

    If any threshold is exceeded, a backup is recommended.
    """

    def __init__(self, config: "AgentConfiguration"):
        self.config = config

    def analyze_workload(self) -> WorkloadMetrics:
        """
        Analyze workload for the past 24 hours.

        Returns:
            WorkloadMetrics containing all activity counts
        """
        from apps.audit.models import AuditLog
        from apps.cases.models import TaxCase, TaxCaseNote
        from apps.contacts.models import Contact
        from apps.core.models import Backup
        from apps.corporations.models import Corporation
        from apps.documents.models import Document
        from apps.emails.models import EmailMessage

        metrics = WorkloadMetrics()
        now = timezone.now()
        day_ago = now - timedelta(days=1)

        # Contact metrics
        try:
            contacts_qs = Contact.objects.filter(
                Q(created_at__gte=day_ago) | Q(updated_at__gte=day_ago)
            )
            metrics.contacts_created = Contact.objects.filter(
                created_at__gte=day_ago
            ).count()
            metrics.contacts_updated = (
                contacts_qs.count() - metrics.contacts_created
            )
        except Exception as e:
            logger.warning(f"Error counting contacts: {e}")

        # Case metrics
        try:
            cases_qs = TaxCase.objects.filter(
                Q(created_at__gte=day_ago) | Q(updated_at__gte=day_ago)
            )
            metrics.cases_created = TaxCase.objects.filter(
                created_at__gte=day_ago
            ).count()
            metrics.cases_updated = cases_qs.count() - metrics.cases_created
            metrics.case_notes_created = TaxCaseNote.objects.filter(
                created_at__gte=day_ago
            ).count()
        except Exception as e:
            logger.warning(f"Error counting cases: {e}")

        # Document metrics
        try:
            metrics.documents_created = Document.objects.filter(
                created_at__gte=day_ago
            ).count()
        except Exception as e:
            logger.warning(f"Error counting documents: {e}")

        # Corporation metrics
        try:
            corps_qs = Corporation.objects.filter(
                Q(created_at__gte=day_ago) | Q(updated_at__gte=day_ago)
            )
            metrics.corporations_created = Corporation.objects.filter(
                created_at__gte=day_ago
            ).count()
            metrics.corporations_updated = (
                corps_qs.count() - metrics.corporations_created
            )
        except Exception as e:
            logger.warning(f"Error counting corporations: {e}")

        # Email metrics
        try:
            metrics.emails_sent = EmailMessage.objects.filter(
                created_at__gte=day_ago,
                direction="outbound",
            ).count()
            metrics.emails_received = EmailMessage.objects.filter(
                created_at__gte=day_ago,
                direction="inbound",
            ).count()
        except Exception as e:
            logger.warning(f"Error counting emails: {e}")

        # API activity (audit logs)
        try:
            metrics.api_activity = AuditLog.objects.filter(
                timestamp__gte=day_ago
            ).count()
        except Exception as e:
            logger.warning(f"Error counting audit logs: {e}")

        # Last backup info
        try:
            last_backup = (
                Backup.objects.filter(
                    status=Backup.Status.COMPLETED,
                    backup_type=Backup.BackupType.GLOBAL,
                )
                .order_by("-completed_at")
                .first()
            )
            if last_backup and last_backup.completed_at:
                metrics.last_backup_date = last_backup.completed_at.isoformat()
                delta = now - last_backup.completed_at
                metrics.days_since_last_backup = delta.days
        except Exception as e:
            logger.warning(f"Error getting last backup info: {e}")

        return metrics

    def should_backup(self, metrics: WorkloadMetrics) -> BackupDecision:
        """
        Decide whether a backup should be created based on workload metrics.

        Args:
            metrics: WorkloadMetrics from analyze_workload()

        Returns:
            BackupDecision with the recommendation and reasoning
        """
        thresholds_exceeded = []

        # Check if forced due to days since last backup
        if metrics.days_since_last_backup is not None:
            if metrics.days_since_last_backup >= self.config.backup_days_since_last:
                return BackupDecision(
                    should_backup=True,
                    reason=f"Forced backup: {metrics.days_since_last_backup} days since last backup "
                    f"(threshold: {self.config.backup_days_since_last} days)",
                    thresholds_exceeded=["days_since_last_backup"],
                    forced=True,
                )
        elif metrics.last_backup_date is None:
            # No backup exists yet
            return BackupDecision(
                should_backup=True,
                reason="Forced backup: No previous backup found",
                thresholds_exceeded=["no_backup_exists"],
                forced=True,
            )

        # Check individual thresholds
        if metrics.total_contacts_changes >= self.config.backup_contacts_threshold:
            thresholds_exceeded.append("contacts")

        if metrics.total_cases_changes >= self.config.backup_cases_threshold:
            thresholds_exceeded.append("cases")

        if metrics.documents_created >= self.config.backup_documents_threshold:
            thresholds_exceeded.append("documents")

        if metrics.total_corporations_changes >= self.config.backup_corporations_threshold:
            thresholds_exceeded.append("corporations")

        if metrics.total_emails >= self.config.backup_emails_threshold:
            thresholds_exceeded.append("emails")

        if metrics.api_activity >= self.config.backup_activity_threshold:
            thresholds_exceeded.append("api_activity")

        # Decision
        if thresholds_exceeded:
            return BackupDecision(
                should_backup=True,
                reason=f"Activity thresholds exceeded: {', '.join(thresholds_exceeded)}",
                thresholds_exceeded=thresholds_exceeded,
                forced=False,
            )
        else:
            return BackupDecision(
                should_backup=False,
                reason="Insufficient activity for backup",
                thresholds_exceeded=[],
                forced=False,
            )

    def create_backup_action(
        self,
        should_backup: bool,
        decision: BackupDecision,
        metrics: WorkloadMetrics,
    ) -> Optional["AgentAction"]:
        """
        Create an AgentAction record for the backup decision.

        If should_backup is True, also creates a Backup record and triggers
        the backup task.

        Args:
            should_backup: Whether to actually create a backup
            decision: BackupDecision with reasoning
            metrics: WorkloadMetrics for context

        Returns:
            AgentAction if backup was needed, None otherwise
        """
        from apps.ai_agent.models import AgentAction, AgentInsight
        from apps.core.models import Backup
        from apps.core.tasks import create_backup_task

        if not should_backup:
            # Log the skip decision
            logger.info(f"Backup skipped: {decision.reason}")
            return None

        now = timezone.now()

        # Create the backup record
        backup_name = f"Automated Backup - {now.strftime('%Y-%m-%d %H:%M')}"
        backup = Backup.objects.create(
            name=backup_name,
            backup_type=Backup.BackupType.GLOBAL,
            status=Backup.Status.PENDING,
            include_media=self.config.backup_include_media,
        )

        # Trigger the backup task
        create_backup_task.delay(str(backup.id))

        # Create AgentAction record
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.BACKUP_CREATED,
            status=AgentAction.Status.EXECUTED,
            title=f"Automated Backup Created",
            description=(
                f"Created automated backup based on workload analysis.\n\n"
                f"Reason: {decision.reason}\n"
                f"Backup ID: {backup.id}"
            ),
            reasoning=(
                f"Analysis of the past 24 hours showed:\n"
                f"- Contacts: {metrics.total_contacts_changes} changes\n"
                f"- Cases: {metrics.total_cases_changes} changes\n"
                f"- Documents: {metrics.documents_created} new\n"
                f"- Corporations: {metrics.total_corporations_changes} changes\n"
                f"- Emails: {metrics.total_emails} total\n"
                f"- API Activity: {metrics.api_activity} requests\n"
                f"- Days since last backup: {metrics.days_since_last_backup or 'N/A'}"
            ),
            action_data={
                "backup_id": str(backup.id),
                "backup_name": backup_name,
                "metrics": metrics.to_dict(),
                "decision": decision.to_dict(),
            },
            requires_approval=False,
            executed_at=now,
            execution_result=f"Backup task queued: {backup.id}",
        )

        # Create insight for visibility
        AgentInsight.objects.create(
            insight_type=AgentInsight.InsightType.METRIC,
            title="Automated Backup Created",
            description=(
                f"The AI agent created an automated backup based on today's workload.\n\n"
                f"{decision.reason}"
            ),
            supporting_data={
                "backup_id": str(backup.id),
                "metrics": metrics.to_dict(),
            },
            priority=AgentInsight.Priority.MEDIUM,
            is_actionable=False,
            source_action=action,
        )

        logger.info(
            f"Automated backup created: {backup.id} - {decision.reason}"
        )

        return action

    def cleanup_old_automated_backups(self) -> int:
        """
        Delete automated backups older than retention_days.

        Returns:
            Number of backups deleted
        """
        from apps.core.models import Backup
        from apps.core.services import BackupService

        cutoff = timezone.now() - timedelta(days=self.config.backup_retention_days)
        service = BackupService()

        # Find old automated backups (those with "Automated Backup" in name)
        old_backups = Backup.objects.filter(
            created_at__lt=cutoff,
            status__in=[Backup.Status.COMPLETED, Backup.Status.FAILED],
            name__icontains="Automated Backup",
        )

        deleted_count = 0
        for backup in old_backups:
            try:
                service.delete_backup_file(backup)
                backup.delete()
                deleted_count += 1
                logger.info(f"Deleted old automated backup: {backup.id}")
            except Exception as e:
                logger.warning(f"Could not delete backup {backup.id}: {e}")

        return deleted_count
