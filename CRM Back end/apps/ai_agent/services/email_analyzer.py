"""
Email Analyzer service for the AI Agent.
Analyzes incoming emails and creates notes from important content.
"""

import logging
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.ai_agent.models import AgentAction, AgentLog

logger = logging.getLogger(__name__)


class EmailAnalyzer:
    """
    Analyzes emails and determines if notes should be created.
    """

    SYSTEM_PROMPT = """You are an AI assistant for a tax services CRM.
Your job is to analyze incoming emails and determine if they contain important information
that should be saved as a note in the client's record.

Important information includes:
- Tax document submissions or references
- Deadline mentions or time-sensitive matters
- Client requests or questions requiring follow-up
- Financial information or changes
- Meeting confirmations or scheduling
- Legal or compliance matters

Do NOT flag as important:
- Marketing emails or newsletters
- Automated confirmations without action items
- Spam or irrelevant content
- General greetings without substance"""

    def __init__(self, config, ai_service):
        """
        Initialize email analyzer.

        Args:
            config: AgentConfiguration instance
            ai_service: AIService instance
        """
        self.config = config
        self.ai_service = ai_service

    def analyze_email(self, email) -> AgentAction | None:
        """
        Analyze an email and create an action if note should be created.

        Args:
            email: EmailMessage instance

        Returns:
            AgentAction if note should be created, None otherwise
        """
        self._log("info", f"Analyzing email: {email.subject}", {"email_id": str(email.id)})

        try:
            # Build context for analysis
            context = self._build_email_context(email)

            # Get AI analysis
            prompt = self._build_analysis_prompt(context)
            result = self.ai_service.analyze(
                prompt=prompt,
                system_prompt=self.SYSTEM_PROMPT,
                json_response=True,
            )

            # Log AI usage
            self._log(
                "debug",
                f"AI analysis complete for email {email.id}",
                {
                    "email_id": str(email.id),
                    "tokens_used": result.get("tokens_used", 0),
                    "latency_ms": result.get("latency_ms", 0),
                },
            )

            # Parse response
            analysis = result.get("content", {})
            if isinstance(analysis, str):
                self._log("warning", "AI returned non-JSON response", {"response": analysis[:500]})
                return None

            if analysis.get("should_create_note", False):
                return self._create_note_action(email, analysis, result)

            self._log(
                "info",
                f"Email not flagged for note creation: {email.subject}",
                {"email_id": str(email.id), "reason": analysis.get("reason", "Not important")},
            )
            return None

        except Exception as e:
            self._log("error", f"Failed to analyze email: {e}", {"email_id": str(email.id)})
            raise

    def _build_email_context(self, email) -> dict[str, Any]:
        """Build context dictionary from email."""
        context = {
            "from_address": email.from_address,
            "to_addresses": email.to_addresses,
            "subject": email.subject,
            "body": email.body_text[:3000] if email.body_text else "",
            "received_at": email.received_at.isoformat() if email.received_at else None,
            "has_attachments": email.attachments.exists() if hasattr(email, "attachments") else False,
        }

        # Add contact info if available
        if email.contact:
            context["contact"] = {
                "id": str(email.contact.id),
                "name": f"{email.contact.first_name} {email.contact.last_name}".strip(),
                "email": email.contact.email,
            }

        # Add case info if available
        if email.case:
            context["case"] = {
                "id": str(email.case.id),
                "case_number": email.case.case_number,
                "case_type": email.case.case_type,
                "status": email.case.status,
            }

        return context

    def _build_analysis_prompt(self, context: dict[str, Any]) -> str:
        """Build the analysis prompt."""
        return f"""Analyze this email and determine if it contains important information
that should be saved as a note in the CRM.

Email Details:
- From: {context.get('from_address', 'Unknown')}
- Subject: {context.get('subject', 'No subject')}
- Body: {context.get('body', '')[:2000]}
- Has Attachments: {context.get('has_attachments', False)}

{f"Contact: {context['contact']['name']}" if context.get('contact') else "No linked contact"}
{f"Case: {context['case']['case_number']} ({context['case']['case_type']})" if context.get('case') else "No linked case"}

Respond with JSON containing:
{{
    "should_create_note": true/false,
    "reason": "Brief explanation of your decision",
    "note_title": "Suggested title for the note (if creating)",
    "note_content": "Formatted note content with key points (if creating)",
    "urgency": "low/medium/high",
    "action_items": ["list of action items if any"],
    "suggested_due_date": "YYYY-MM-DD or null",
    "tags": ["relevant", "tags"]
}}"""

    @transaction.atomic
    def _create_note_action(
        self,
        email,
        analysis: dict[str, Any],
        ai_result: dict[str, Any],
    ) -> AgentAction:
        """Create an agent action for note creation."""
        action = AgentAction.objects.create(
            action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
            status=AgentAction.Status.PENDING,
            title=analysis.get("note_title", f"Note from email: {email.subject}"),
            description=analysis.get("note_content", ""),
            reasoning=analysis.get("reason", "AI determined this email contains important information"),
            action_data={
                "note_title": analysis.get("note_title", ""),
                "note_content": analysis.get("note_content", ""),
                "urgency": analysis.get("urgency", "medium"),
                "action_items": analysis.get("action_items", []),
                "suggested_due_date": analysis.get("suggested_due_date"),
                "tags": analysis.get("tags", []),
            },
            related_email=email,
            related_contact=email.contact,
            related_case=email.case,
            requires_approval=not self.config.autonomous_actions_enabled,
        )

        # If autonomous mode, execute immediately
        if self.config.autonomous_actions_enabled:
            self._execute_note_creation(action)

        self._log(
            "decision",
            f"Created note action from email: {email.subject}",
            {
                "action_id": str(action.id),
                "email_id": str(email.id),
                "urgency": analysis.get("urgency", "medium"),
                "requires_approval": action.requires_approval,
            },
            action=action,
        )

        return action

    def _execute_note_creation(self, action: AgentAction):
        """Execute the note creation action."""
        try:
            # Import here to avoid circular imports
            from apps.cases.models import TaxCaseNote

            # Create the note
            note_data = action.action_data

            if action.related_case:
                note = TaxCaseNote.objects.create(
                    case=action.related_case,
                    content=note_data.get("note_content", ""),
                    is_ai_generated=True,
                )

                action.status = AgentAction.Status.EXECUTED
                action.executed_at = timezone.now()
                action.execution_result = f"Created note {note.id} for case {action.related_case.case_number}"
                action.save()

                self._log(
                    "info",
                    f"Executed note creation for case {action.related_case.case_number}",
                    {"action_id": str(action.id), "note_id": str(note.id)},
                    action=action,
                )
            else:
                action.status = AgentAction.Status.FAILED
                action.error_message = "No case linked to create note"
                action.save()

        except Exception as e:
            action.status = AgentAction.Status.FAILED
            action.error_message = str(e)
            action.save()
            self._log("error", f"Failed to execute note creation: {e}", {"action_id": str(action.id)})

    def get_unanalyzed_emails(self, limit: int = 50):
        """
        Get emails that haven't been analyzed yet.

        Args:
            limit: Maximum number of emails to return

        Returns:
            QuerySet of EmailMessage objects
        """
        from apps.emails.models import EmailMessage

        # Get emails received in the last check interval that don't have agent actions
        cutoff = timezone.now() - timezone.timedelta(minutes=self.config.email_check_interval_minutes * 2)

        return (
            EmailMessage.objects.filter(
                direction="inbound",
                received_at__gte=cutoff,
            )
            .exclude(
                agent_actions__action_type=AgentAction.ActionType.EMAIL_NOTE_CREATED,
            )
            .select_related("contact", "case")
            .order_by("-received_at")[:limit]
        )

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
            component="email_analyzer",
            message=message,
            context=context or {},
            action=action,
        )
        getattr(logger, level if level != "decision" else "info")(message)
