"""
Celery tasks for the AI Agent system.
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="apps.ai_agent.tasks.run_agent_cycle")
def run_agent_cycle():
    """
    Main agent cycle - runs all enabled capabilities.
    Scheduled to run every 5 minutes.
    """
    from apps.ai_agent.services.agent_brain import AgentBrain

    try:
        brain = AgentBrain()
        result = brain.run_cycle()
        logger.info(f"Agent cycle completed: {result.get('action_count', 0)} actions")
        return result
    except Exception as e:
        logger.error(f"Agent cycle failed: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.analyze_email")
def analyze_email(email_id: str):
    """
    Analyze a specific email.
    Triggered when new emails arrive.

    Args:
        email_id: UUID of the email to analyze
    """
    from apps.ai_agent.models import AgentConfiguration
    from apps.ai_agent.services.ai_service import get_ai_service
    from apps.ai_agent.services.email_analyzer import EmailAnalyzer
    from apps.emails.models import EmailMessage

    config = AgentConfiguration.get_config()

    if not config.is_active or not config.email_analysis_enabled:
        logger.debug("Email analysis is disabled, skipping")
        return None

    try:
        email = EmailMessage.objects.get(id=email_id)
        ai_service = get_ai_service(config)
        analyzer = EmailAnalyzer(config, ai_service)
        action = analyzer.analyze_email(email)

        if action:
            logger.info(f"Created action from email analysis: {action.id}")
            return str(action.id)
        return None

    except EmailMessage.DoesNotExist:
        logger.error(f"Email not found: {email_id}")
        return None
    except Exception as e:
        logger.error(f"Failed to analyze email {email_id}: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.generate_daily_insights")
def generate_daily_insights():
    """
    Generate daily business insights.
    Scheduled to run once per day (e.g., 6 AM).
    """
    from apps.ai_agent.services.agent_brain import AgentBrain

    try:
        brain = AgentBrain()
        insights = brain.run_market_analysis()
        logger.info(f"Generated {len(insights)} daily insights")
        return {"insight_count": len(insights)}
    except Exception as e:
        logger.error(f"Failed to generate daily insights: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.send_reminder_email")
def send_reminder_email(action_id: str):
    """
    Send a reminder email for an appointment.

    Args:
        action_id: UUID of the AgentAction
    """
    from apps.ai_agent.models import AgentAction
    from apps.emails.models import EmailTemplate

    try:
        action = AgentAction.objects.get(id=action_id)
        reminder_data = action.action_data

        contact_email = reminder_data.get("contact_email")
        if not contact_email:
            logger.warning(f"No contact email for reminder action {action_id}")
            return

        # Try to use a template if available
        template = EmailTemplate.objects.filter(
            name__icontains="appointment reminder",
            is_active=True,
        ).first()

        if template:
            subject = template.subject
            body = template.render_body(
                {
                    "appointment_title": reminder_data.get("appointment_title", ""),
                    "start_time": reminder_data.get("start_time", ""),
                    "location": reminder_data.get("location", ""),
                    "contact_name": reminder_data.get("contact_name", ""),
                }
            )
        else:
            subject = f"Reminder: {reminder_data.get('appointment_title', 'Upcoming Appointment')}"
            body = reminder_data.get("message", "")

        # Queue email for sending
        from apps.emails.tasks import send_email_task

        send_email_task.delay(
            to_email=contact_email,
            subject=subject,
            body=body,
        )

        logger.info(f"Queued reminder email for action {action_id}")
        return {"status": "queued", "to": contact_email}

    except AgentAction.DoesNotExist:
        logger.error(f"Action not found: {action_id}")
        return None
    except Exception as e:
        logger.error(f"Failed to send reminder email: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.execute_pending_actions")
def execute_pending_actions():
    """
    Execute approved actions that haven't been executed yet.
    Runs as a cleanup task.
    """
    from apps.ai_agent.models import AgentAction
    from apps.ai_agent.services.agent_brain import AgentBrain

    try:
        brain = AgentBrain()

        # Get approved actions that haven't been executed
        approved_actions = AgentAction.objects.filter(
            status=AgentAction.Status.APPROVED,
        ).select_related(
            "related_email",
            "related_task",
            "related_appointment",
        )

        executed_count = 0
        for action in approved_actions:
            try:
                brain.execute_action(action)
                executed_count += 1
            except Exception as e:
                logger.error(f"Failed to execute action {action.id}: {e}")

        logger.info(f"Executed {executed_count} approved actions")
        return {"executed": executed_count}

    except Exception as e:
        logger.error(f"Failed to execute pending actions: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.cleanup_old_logs")
def cleanup_old_logs(days: int = 90):
    """
    Archive/delete old agent logs.
    Runs weekly.

    Args:
        days: Number of days to keep logs
    """
    from apps.ai_agent.models import AgentLog

    try:
        cutoff = timezone.now() - timezone.timedelta(days=days)

        # Delete old debug logs first (keep decision logs longer)
        debug_deleted, _ = AgentLog.objects.filter(
            created_at__lt=cutoff,
            level="debug",
        ).delete()

        # Delete other old logs
        other_cutoff = timezone.now() - timezone.timedelta(days=days * 2)
        other_deleted, _ = AgentLog.objects.filter(
            created_at__lt=other_cutoff,
        ).delete()

        total_deleted = debug_deleted + other_deleted
        logger.info(f"Cleaned up {total_deleted} old logs")
        return {"deleted": total_deleted}

    except Exception as e:
        logger.error(f"Failed to cleanup logs: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.update_metrics")
def update_metrics():
    """
    Update daily metrics.
    Runs at the end of each day.
    """
    from apps.ai_agent.models import AgentConfiguration
    from apps.ai_agent.services.learning_engine import LearningEngine

    try:
        config = AgentConfiguration.get_config()
        engine = LearningEngine(config)

        # Update today's metrics
        metrics = engine.update_daily_metrics()

        logger.info(f"Updated metrics for {metrics.date}")
        return {"date": str(metrics.date), "actions": metrics.total_actions}

    except Exception as e:
        logger.error(f"Failed to update metrics: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.backfill_metrics")
def backfill_metrics(days: int = 30):
    """
    Backfill historical metrics.
    Run manually when needed.

    Args:
        days: Number of days to backfill
    """
    from apps.ai_agent.models import AgentConfiguration
    from apps.ai_agent.services.learning_engine import LearningEngine

    try:
        config = AgentConfiguration.get_config()
        engine = LearningEngine(config)
        engine.backfill_metrics(days)

        logger.info(f"Backfilled {days} days of metrics")
        return {"days": days}

    except Exception as e:
        logger.error(f"Failed to backfill metrics: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.run_automated_backup_check")
def run_automated_backup_check():
    """
    Analyze workload and decide if an automated backup is needed.
    Scheduled to run daily at the configured hour (default: 11 PM).

    This task:
    1. Checks if AI agent and auto backup are enabled
    2. Analyzes the past 24 hours of activity
    3. Decides if backup thresholds are exceeded
    4. Creates a backup if needed (autonomously, no approval required)
    """
    from apps.ai_agent.models import AgentConfiguration
    from apps.ai_agent.services.backup_analyzer import BackupAnalyzer

    try:
        config = AgentConfiguration.get_config()

        # Check if feature is enabled
        if not config.is_active:
            logger.debug("AI Agent is disabled, skipping backup check")
            return {"status": "disabled", "reason": "AI Agent is inactive"}

        if not config.auto_backup_enabled:
            logger.debug("Auto backup is disabled, skipping backup check")
            return {"status": "disabled", "reason": "Auto backup is disabled"}

        analyzer = BackupAnalyzer(config)

        # Analyze workload
        metrics = analyzer.analyze_workload()
        logger.info(
            f"Backup analysis - Contacts: {metrics.total_contacts_changes}, "
            f"Cases: {metrics.total_cases_changes}, "
            f"Documents: {metrics.documents_created}, "
            f"Days since last: {metrics.days_since_last_backup}"
        )

        # Make decision
        decision = analyzer.should_backup(metrics)

        # Execute backup if needed
        action = analyzer.create_backup_action(
            should_backup=decision.should_backup,
            decision=decision,
            metrics=metrics,
        )

        result = {
            "status": "completed",
            "backup_needed": decision.should_backup,
            "reason": decision.reason,
            "forced": decision.forced,
            "thresholds_exceeded": decision.thresholds_exceeded,
            "metrics": metrics.to_dict(),
        }

        if action:
            result["action_id"] = str(action.id)
            result["backup_id"] = action.action_data.get("backup_id")

        return result

    except Exception as e:
        logger.error(f"Automated backup check failed: {e}")
        raise


@shared_task(name="apps.ai_agent.tasks.cleanup_automated_backups")
def cleanup_automated_backups():
    """
    Clean up old automated backups based on retention settings.
    Scheduled to run weekly (Sunday at 3 AM by default).

    Deletes automated backups older than backup_retention_days.
    """
    from apps.ai_agent.models import AgentConfiguration
    from apps.ai_agent.services.backup_analyzer import BackupAnalyzer

    try:
        config = AgentConfiguration.get_config()

        if not config.auto_backup_enabled:
            logger.debug("Auto backup is disabled, skipping cleanup")
            return {"status": "disabled", "deleted": 0}

        analyzer = BackupAnalyzer(config)
        deleted_count = analyzer.cleanup_old_automated_backups()

        logger.info(f"Cleaned up {deleted_count} old automated backups")
        return {"status": "completed", "deleted": deleted_count}

    except Exception as e:
        logger.error(f"Automated backup cleanup failed: {e}")
        raise
