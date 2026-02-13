"""
Appointment Monitor service for the AI Agent.
Monitors upcoming appointments and sends timely reminders.
"""

import logging
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentLog

logger = logging.getLogger(__name__)


class AppointmentMonitor:
    """
    Monitors appointments and creates reminder actions.
    """

    def __init__(self, config):
        """
        Initialize appointment monitor.

        Args:
            config: AgentConfiguration instance
        """
        self.config = config

    def check_upcoming_appointments(self) -> list[AgentAction]:
        """
        Check for appointments that need reminders.

        Returns:
            List of created AgentAction objects
        """
        from apps.appointments.models import Appointment

        reminder_hours = self.config.appointment_reminder_hours or [24, 2]
        created_actions = []

        for hours in reminder_hours:
            # Calculate time window (15 minute window to catch appointments)
            now = timezone.now()
            window_start = now + timedelta(hours=hours)
            window_end = window_start + timedelta(minutes=15)

            # Find appointments in this window that haven't had this reminder sent
            appointments = (
                Appointment.objects.filter(
                    start_datetime__gte=window_start,
                    start_datetime__lt=window_end,
                    status__in=["scheduled", "confirmed"],
                )
                .exclude(
                    # Exclude if we already sent a reminder for this hour window
                    agent_actions__action_type=AgentAction.ActionType.APPOINTMENT_REMINDER,
                    agent_actions__action_data__reminder_hours=hours,
                )
                .select_related("contact", "assigned_to", "case")
            )

            self._log(
                "debug",
                f"Checking for {hours}h reminders: found {appointments.count()} appointments",
                {"hours": hours, "window_start": window_start.isoformat()},
            )

            for appointment in appointments:
                action = self._create_reminder_action(appointment, hours)
                if action:
                    created_actions.append(action)

        return created_actions

    @transaction.atomic
    def _create_reminder_action(self, appointment, hours: int) -> AgentAction | None:
        """
        Create a reminder action for an appointment.

        Args:
            appointment: Appointment instance
            hours: Hours before appointment

        Returns:
            Created AgentAction or None
        """
        try:
            # Build reminder content
            reminder_data = self._build_reminder_data(appointment, hours)

            action = AgentAction.objects.create(
                action_type=AgentAction.ActionType.APPOINTMENT_REMINDER,
                status=AgentAction.Status.PENDING,
                title=f"Reminder: {appointment.title} in {hours} hours",
                description=reminder_data["message"],
                reasoning=f"Automated {hours}-hour appointment reminder",
                action_data={
                    "reminder_hours": hours,
                    "appointment_id": str(appointment.id),
                    "appointment_title": appointment.title,
                    "start_datetime": appointment.start_datetime.isoformat(),
                    "location": appointment.location,
                    "contact_id": (
                        str(appointment.contact.id) if appointment.contact else None
                    ),
                    "contact_name": reminder_data.get("contact_name", ""),
                    "contact_email": reminder_data.get("contact_email", ""),
                    "assigned_to_id": (
                        str(appointment.assigned_to.id)
                        if appointment.assigned_to
                        else None
                    ),
                    "assigned_to_email": (
                        appointment.assigned_to.email
                        if appointment.assigned_to
                        else None
                    ),
                    "message": reminder_data["message"],
                    "notification_channels": reminder_data["channels"],
                },
                related_appointment=appointment,
                related_contact=appointment.contact,
                related_case=appointment.case,
                requires_approval=not self.config.autonomous_actions_enabled,
            )

            # If autonomous mode, execute immediately
            if self.config.autonomous_actions_enabled:
                self._execute_reminder(action)

            self._log(
                "decision",
                f"Created {hours}h reminder for appointment: {appointment.title}",
                {
                    "action_id": str(action.id),
                    "appointment_id": str(appointment.id),
                    "hours": hours,
                },
                action=action,
            )

            return action

        except Exception as e:
            self._log(
                "error",
                f"Failed to create reminder action: {e}",
                {"appointment_id": str(appointment.id), "hours": hours},
            )
            return None

    def _build_reminder_data(self, appointment, hours: int) -> dict[str, Any]:
        """Build reminder message and data."""
        contact_name = ""
        contact_email = ""

        if appointment.contact:
            contact_name = f"{appointment.contact.first_name} {appointment.contact.last_name}".strip()
            contact_email = appointment.contact.email or ""

        # Format time nicely
        start_datetime = appointment.start_datetime
        time_str = start_datetime.strftime("%I:%M %p")
        date_str = start_datetime.strftime("%A, %B %d, %Y")

        # Build message
        if hours >= 24:
            time_context = f"tomorrow at {time_str}"
        elif hours >= 2:
            time_context = f"today at {time_str}"
        else:
            time_context = f"in {hours} hour{'s' if hours != 1 else ''}"

        message = f"""Appointment Reminder

Your appointment "{appointment.title}" is scheduled for {time_context}.

Details:
- Date: {date_str}
- Time: {time_str}
- Location: {appointment.location or 'Not specified'}
"""

        if contact_name:
            message += f"- Client: {contact_name}\n"

        if appointment.notes:
            message += f"\nNotes: {appointment.notes}\n"

        # Determine notification channels
        channels = []
        if contact_email:
            channels.append("email")
        if appointment.assigned_to:
            channels.append("in_app")
            if appointment.assigned_to.email:
                channels.append("staff_email")

        return {
            "message": message,
            "contact_name": contact_name,
            "contact_email": contact_email,
            "channels": channels,
        }

    def _execute_reminder(self, action: AgentAction):
        """Execute the reminder action by sending notifications."""
        try:
            from apps.notifications.services import create_notification

            reminder_data = action.action_data

            # Send in-app notification to assigned staff
            if action.related_appointment and action.related_appointment.assigned_to:
                create_notification(
                    recipient=action.related_appointment.assigned_to,
                    notification_type="appointment_reminder",
                    title=action.title,
                    message=reminder_data.get("message", "")[:500],
                    severity="info",
                    related_object=action.related_appointment,
                )

            # Queue email notification if configured
            if "email" in reminder_data.get("channels", []):
                from apps.ai_agent.tasks import send_reminder_email

                send_reminder_email.delay(str(action.id))

            action.status = AgentAction.Status.EXECUTED
            action.executed_at = timezone.now()
            action.execution_result = (
                f"Sent reminder via: {', '.join(reminder_data.get('channels', []))}"
            )
            action.save()

            self._log(
                "info",
                f"Executed appointment reminder: {action.title}",
                {"action_id": str(action.id)},
                action=action,
            )

        except Exception as e:
            action.status = AgentAction.Status.FAILED
            action.error_message = str(e)
            action.save()
            self._log(
                "error",
                f"Failed to execute reminder: {e}",
                {"action_id": str(action.id)},
            )

    def get_appointments_needing_reminders(self, hours_ahead: int = 48) -> list:
        """
        Get appointments in the next N hours that may need reminders.

        Args:
            hours_ahead: How many hours to look ahead

        Returns:
            List of appointment dictionaries with reminder info
        """
        from apps.appointments.models import Appointment

        now = timezone.now()
        cutoff = now + timedelta(hours=hours_ahead)

        appointments = (
            Appointment.objects.filter(
                start_datetime__gte=now,
                start_datetime__lte=cutoff,
                status__in=["scheduled", "confirmed"],
            )
            .select_related("contact", "assigned_to")
            .order_by("start_datetime")
        )

        reminder_hours = self.config.appointment_reminder_hours or [24, 2]
        result = []

        for apt in appointments:
            hours_until = (apt.start_datetime - now).total_seconds() / 3600
            pending_reminders = []

            for h in reminder_hours:
                if hours_until > h:
                    # Check if reminder already sent
                    exists = AgentAction.objects.filter(
                        related_appointment=apt,
                        action_type=AgentAction.ActionType.APPOINTMENT_REMINDER,
                        action_data__reminder_hours=h,
                    ).exists()
                    if not exists:
                        pending_reminders.append(h)

            result.append(
                {
                    "id": str(apt.id),
                    "title": apt.title,
                    "start_datetime": apt.start_datetime.isoformat(),
                    "hours_until": round(hours_until, 1),
                    "contact_name": (
                        f"{apt.contact.first_name} {apt.contact.last_name}".strip()
                        if apt.contact
                        else None
                    ),
                    "pending_reminders": pending_reminders,
                }
            )

        return result

    def _log(
        self,
        level: str,
        message: str,
        context: dict[str, Any] | None = None,
        action: AgentAction | None = None,
    ):
        """Create an agent log entry."""
        AgentLog.objects.create(
            level=level,
            component="appointment_monitor",
            message=message,
            context=context or {},
            action=action,
        )
        getattr(logger, level if level != "decision" else "info")(message)
