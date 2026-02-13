"""
AI Service for chatbot interactions.
Supports OpenAI and Anthropic providers.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from django.utils import timezone

logger = logging.getLogger(__name__)


class ChatbotAIService:
    """
    Service class for AI-powered chatbot interactions.
    """

    def __init__(self, configuration):
        self.config = configuration
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the AI client based on provider."""
        if not self.config.api_key:
            logger.warning("No API key configured for chatbot")
            return

        if self.config.ai_provider == "openai":
            try:
                import openai

                self.client = openai.OpenAI(api_key=self.config.api_key)
            except ImportError:
                logger.error("OpenAI package not installed")
        elif self.config.ai_provider == "anthropic":
            try:
                import anthropic

                self.client = anthropic.Anthropic(api_key=self.config.api_key)
            except ImportError:
                logger.error("Anthropic package not installed")

    def get_response(
        self,
        conversation,
        user_message: str,
        include_functions: bool = True,
    ) -> dict:
        """
        Get AI response for a user message.

        Returns:
            dict with keys:
                - content: The response text
                - action: Optional action (book_appointment, handoff, etc.)
                - metadata: Additional data for actions
                - tokens_used: Token count
        """
        if not self.client:
            return {
                "content": "I'm sorry, the chat service is temporarily unavailable. Please try again later.",
                "action": None,
                "metadata": {},
                "tokens_used": 0,
            }

        # Build conversation history
        messages = self._build_messages(conversation, user_message)

        # Define available functions/tools
        tools = self._get_tools() if include_functions else None

        try:
            if self.config.ai_provider == "openai":
                return self._get_openai_response(messages, tools)
            elif self.config.ai_provider == "anthropic":
                return self._get_anthropic_response(messages, tools)
        except Exception as e:
            logger.error(f"AI service error: {e}")
            return {
                "content": "I encountered an error processing your request. Please try again.",
                "action": None,
                "metadata": {},
                "tokens_used": 0,
            }

    def _build_messages(self, conversation, user_message: str) -> list:
        """Build the message history for the AI."""
        messages = [
            {"role": "system", "content": self.config.get_full_system_prompt()}
        ]

        # Add conversation history (last 20 messages for context)
        for msg in conversation.messages.all()[:20]:
            messages.append({"role": msg.role, "content": msg.content})

        # Add the new user message
        messages.append({"role": "user", "content": user_message})

        return messages

    def _get_tools(self) -> list:
        """Define the tools/functions available to the AI."""
        tools = []

        if self.config.allow_appointments:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "check_appointment_availability",
                        "description": "Check available appointment slots for a given date range",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "start_date": {
                                    "type": "string",
                                    "description": "Start date in YYYY-MM-DD format",
                                },
                                "end_date": {
                                    "type": "string",
                                    "description": "End date in YYYY-MM-DD format (optional, defaults to start_date + 7 days)",
                                },
                            },
                            "required": ["start_date"],
                        },
                    },
                }
            )
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "book_appointment",
                        "description": "Book an appointment for the client",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "date": {
                                    "type": "string",
                                    "description": "Appointment date in YYYY-MM-DD format",
                                },
                                "time": {
                                    "type": "string",
                                    "description": "Appointment time in HH:MM format (24-hour)",
                                },
                                "service_type": {
                                    "type": "string",
                                    "description": "Type of service requested",
                                    "enum": [
                                        "tax_preparation",
                                        "tax_consultation",
                                        "document_review",
                                        "general_inquiry",
                                    ],
                                },
                                "notes": {
                                    "type": "string",
                                    "description": "Additional notes about the appointment",
                                },
                            },
                            "required": ["date", "time", "service_type"],
                        },
                    },
                }
            )

        if self.config.handoff_enabled:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "request_human_handoff",
                        "description": "Transfer the conversation to a human representative. Use when the client explicitly requests it or when you cannot adequately help them.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "reason": {
                                    "type": "string",
                                    "description": "Reason for the handoff",
                                },
                            },
                            "required": ["reason"],
                        },
                    },
                }
            )

        return tools if tools else None

    def _get_openai_response(self, messages: list, tools: Optional[list]) -> dict:
        """Get response from OpenAI."""
        kwargs = {
            "model": self.config.model_name,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        response = self.client.chat.completions.create(**kwargs)
        message = response.choices[0].message

        result = {
            "content": message.content or "",
            "action": None,
            "metadata": {},
            "tokens_used": response.usage.total_tokens if response.usage else 0,
        }

        # Check for tool calls
        if message.tool_calls:
            tool_call = message.tool_calls[0]
            result["action"] = tool_call.function.name
            try:
                result["metadata"] = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                result["metadata"] = {}

        return result

    def _get_anthropic_response(self, messages: list, tools: Optional[list]) -> dict:
        """Get response from Anthropic."""
        # Convert to Anthropic format
        system_message = messages[0]["content"] if messages else ""
        conversation_messages = messages[1:] if len(messages) > 1 else []

        # Convert tools to Anthropic format
        anthropic_tools = None
        if tools:
            anthropic_tools = []
            for tool in tools:
                anthropic_tools.append(
                    {
                        "name": tool["function"]["name"],
                        "description": tool["function"]["description"],
                        "input_schema": tool["function"]["parameters"],
                    }
                )

        kwargs = {
            "model": self.config.model_name,
            "max_tokens": self.config.max_tokens,
            "system": system_message,
            "messages": conversation_messages,
        }

        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = self.client.messages.create(**kwargs)

        result = {
            "content": "",
            "action": None,
            "metadata": {},
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            if response.usage
            else 0,
        }

        # Process response blocks
        for block in response.content:
            if block.type == "text":
                result["content"] = block.text
            elif block.type == "tool_use":
                result["action"] = block.name
                result["metadata"] = block.input

        return result


def get_available_slots(start_date: datetime, end_date: datetime = None) -> list:
    """
    Get available appointment slots within a date range.

    Returns list of dicts with:
        - date: Date string (YYYY-MM-DD)
        - time: Time string (HH:MM)
        - end_time: Time string (HH:MM)
    """
    from apps.appointments.models import Appointment
    from apps.chatbot.models import ChatbotAppointmentSlot

    if end_date is None:
        end_date = start_date + timedelta(days=7)

    slots = ChatbotAppointmentSlot.objects.filter(is_active=True)
    available = []

    current_date = start_date.date() if hasattr(start_date, "date") else start_date
    now = timezone.now()

    while current_date <= (end_date.date() if hasattr(end_date, "date") else end_date):
        day_of_week = current_date.weekday()

        for slot in slots.filter(day_of_week=day_of_week):
            # Generate time slots within the slot's time range
            slot_duration = timedelta(minutes=slot.slot_duration_minutes)
            current_time = datetime.combine(current_date, slot.start_time)
            end_time = datetime.combine(current_date, slot.end_time)

            while current_time + slot_duration <= end_time:
                slot_end_time = current_time + slot_duration

                # Skip past times for today
                slot_aware = timezone.make_aware(current_time)
                if slot_aware <= now:
                    current_time = slot_end_time
                    continue

                # Check if there are existing appointments at this time
                existing_count = Appointment.objects.filter(
                    start_datetime__date=current_date,
                    start_datetime__time=current_time.time(),
                    status__in=["scheduled", "confirmed"],
                ).count()

                if existing_count < slot.max_appointments:
                    available.append(
                        {
                            "date": current_date.isoformat(),
                            "time": current_time.strftime("%H:%M"),
                            "end_time": slot_end_time.strftime("%H:%M"),
                            "staff_id": str(slot.assigned_staff_id)
                            if slot.assigned_staff_id
                            else None,
                        }
                    )

                current_time = slot_end_time

        current_date += timedelta(days=1)

    return available


def book_appointment(
    contact,
    date_str: str,
    time_str: str,
    service_type: str,
    notes: str = "",
) -> dict:
    """
    Book an appointment for a contact.

    Returns:
        dict with:
            - success: Boolean
            - appointment_id: UUID if successful
            - message: Confirmation or error message
    """
    from apps.appointments.models import Appointment
    from apps.chatbot.models import ChatbotAppointmentSlot

    try:
        # Parse date and time
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
        time = datetime.strptime(time_str, "%H:%M").time()

        # Find the slot that contains this time (time must be within start_time and end_time range)
        day_of_week = date.weekday()
        slot = ChatbotAppointmentSlot.objects.filter(
            day_of_week=day_of_week,
            start_time__lte=time,
            end_time__gt=time,
            is_active=True,
        ).first()

        if not slot:
            return {
                "success": False,
                "appointment_id": None,
                "message": "This time slot is not available. Please choose a time between 9:00 AM and 5:00 PM, Monday to Friday.",
            }

        # Check availability
        slot_datetime = timezone.make_aware(datetime.combine(date, time))

        existing_count = Appointment.objects.filter(
            start_datetime__date=date,
            start_datetime__time=time,
            status__in=["scheduled", "confirmed"],
        ).count()

        if existing_count >= slot.max_appointments:
            return {
                "success": False,
                "appointment_id": None,
                "message": "This time slot is no longer available. Please choose another time.",
            }

        # Calculate end time
        end_datetime = slot_datetime + timedelta(minutes=slot.slot_duration_minutes)

        # Create the appointment
        service_labels = {
            "tax_preparation": "Tax Preparation",
            "tax_consultation": "Tax Consultation",
            "document_review": "Document Review",
            "general_inquiry": "General Inquiry",
        }

        appointment = Appointment.objects.create(
            contact=contact,
            title=f"{service_labels.get(service_type, service_type)} - {contact.first_name} {contact.last_name}",
            start_datetime=slot_datetime,
            end_datetime=end_datetime,
            status="scheduled",
            notes=f"Booked via chatbot.\n{notes}",
            assigned_to=slot.assigned_staff,
        )

        return {
            "success": True,
            "appointment_id": str(appointment.id),
            "message": f"Your appointment has been scheduled for {date.strftime('%B %d, %Y')} at {time.strftime('%I:%M %p')}.",
        }

    except Exception as e:
        logger.error(f"Error booking appointment: {e}")
        return {
            "success": False,
            "appointment_id": None,
            "message": "There was an error booking your appointment. Please try again or contact us directly.",
        }
