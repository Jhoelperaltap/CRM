import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class ChatbotConfiguration(TimeStampedModel):
    """
    Singleton configuration for the AI chatbot.
    Manages AI provider settings, system prompts, and behavior.
    """

    # Fixed UUID for singleton pattern
    SINGLETON_ID = uuid.UUID("00000000-0000-4000-8000-000000000002")

    class AIProvider(models.TextChoices):
        OPENAI = "openai", _("OpenAI (GPT)")
        ANTHROPIC = "anthropic", _("Anthropic (Claude)")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # AI Provider Settings
    ai_provider = models.CharField(
        _("AI Provider"),
        max_length=20,
        choices=AIProvider.choices,
        default=AIProvider.OPENAI,
    )
    api_key = models.CharField(
        _("API Key"),
        max_length=500,
        blank=True,
        default="",
        help_text=_("Encrypted API key for the AI provider."),
    )
    model_name = models.CharField(
        _("Model Name"),
        max_length=100,
        default="gpt-4o-mini",
        help_text=_("e.g., gpt-4o-mini, gpt-4o, claude-3-haiku-20240307"),
    )
    temperature = models.FloatField(
        _("Temperature"),
        default=0.7,
        help_text=_("Controls randomness. 0 = deterministic, 1 = creative."),
    )
    max_tokens = models.PositiveIntegerField(
        _("Max Tokens"),
        default=1000,
        help_text=_("Maximum tokens in AI response."),
    )

    # System Prompt / Personality
    system_prompt = models.TextField(
        _("System Prompt"),
        default="",
        help_text=_("Instructions that define the chatbot's personality and behavior."),
    )
    company_name = models.CharField(
        _("Company Name"),
        max_length=200,
        default="Ebenezer Tax Services",
    )
    welcome_message = models.TextField(
        _("Welcome Message"),
        default="Hello! I'm the Ebenezer Tax Services assistant. How can I help you today?",
    )

    # Behavior Settings
    is_active = models.BooleanField(
        _("Active"),
        default=True,
        help_text=_("Enable or disable the chatbot."),
    )
    allow_appointments = models.BooleanField(
        _("Allow Appointment Booking"),
        default=True,
        help_text=_("Allow the chatbot to book appointments."),
    )
    handoff_enabled = models.BooleanField(
        _("Enable Human Handoff"),
        default=True,
        help_text=_("Allow transferring to a human representative."),
    )
    handoff_message = models.TextField(
        _("Handoff Message"),
        default="I'll connect you with a representative who can better assist you. Please hold on.",
    )

    # Fallback Settings
    fallback_message = models.TextField(
        _("Fallback Message"),
        default="I'm sorry, I can only help with questions related to Ebenezer Tax Services. "
        "Would you like to speak with a representative?",
    )
    max_fallbacks_before_handoff = models.PositiveIntegerField(
        _("Max Fallbacks Before Handoff"),
        default=3,
        help_text=_("Number of off-topic responses before suggesting human handoff."),
    )

    class Meta:
        db_table = "crm_chatbot_configuration"
        verbose_name = _("chatbot configuration")
        verbose_name_plural = _("chatbot configurations")

    def __str__(self):
        return f"Chatbot Configuration ({self.ai_provider})"

    @classmethod
    def load(cls):
        """Load or create the singleton configuration."""
        obj, _ = cls.objects.get_or_create(pk=cls.SINGLETON_ID)
        return obj

    def get_full_system_prompt(self):
        """Build the complete system prompt including knowledge base."""
        from django.utils import timezone

        today = timezone.now()
        today_str = today.strftime("%Y-%m-%d")
        weekday = today.strftime("%A")

        base_prompt = f"""You are a helpful AI assistant for {self.company_name}.

CURRENT DATE: {today_str} ({weekday})
Use this date when booking appointments. Always use dates from today onwards.

IMPORTANT RULES:
1. ONLY answer questions related to {self.company_name} and tax services.
2. If asked about unrelated topics, politely redirect to tax-related matters.
3. Be professional, friendly, and helpful.
4. If you don't know something specific about the company, say so and offer to connect with a representative.
5. When discussing appointments, ALWAYS call check_appointment_availability with start_date="{today_str}" first.
6. Never make up information about services, prices, or policies.
7. Respond in the same language the user writes (Spanish or English).

APPOINTMENT BOOKING:
- When user wants an appointment, call check_appointment_availability with start_date="{today_str}"
- Available hours: Monday-Friday, 9:00 AM to 5:00 PM (every 30 minutes)
- After checking, offer 3-5 specific time slots to choose from
- When user confirms, call book_appointment with exact date, time (HH:MM format), and service_type
- Service types: tax_preparation, tax_consultation, document_review, general_inquiry

{self.system_prompt}

KNOWLEDGE BASE:
"""
        # Append knowledge base entries
        knowledge_items = self.knowledge_entries.filter(is_active=True)
        for item in knowledge_items:
            base_prompt += f"\n---\nTopic: {item.title}\n{item.content}\n"

        return base_prompt


class ChatbotKnowledgeEntry(TimeStampedModel):
    """
    Knowledge base entries that train the chatbot.
    These provide context about services, FAQs, policies, etc.
    """

    class EntryType(models.TextChoices):
        FAQ = "faq", _("FAQ")
        SERVICE = "service", _("Service Description")
        POLICY = "policy", _("Policy")
        GENERAL = "general", _("General Information")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    configuration = models.ForeignKey(
        ChatbotConfiguration,
        on_delete=models.CASCADE,
        related_name="knowledge_entries",
        verbose_name=_("configuration"),
    )
    entry_type = models.CharField(
        _("Entry Type"),
        max_length=20,
        choices=EntryType.choices,
        default=EntryType.GENERAL,
    )
    title = models.CharField(
        _("Title"),
        max_length=255,
        help_text=_("Topic or question title."),
    )
    content = models.TextField(
        _("Content"),
        help_text=_("The information or answer for this topic."),
    )
    keywords = models.TextField(
        _("Keywords"),
        blank=True,
        default="",
        help_text=_("Comma-separated keywords for better matching."),
    )
    priority = models.PositiveIntegerField(
        _("Priority"),
        default=0,
        help_text=_("Higher priority entries are shown first."),
    )
    is_active = models.BooleanField(_("Active"), default=True)

    class Meta:
        db_table = "crm_chatbot_knowledge"
        ordering = ["-priority", "title"]
        verbose_name = _("knowledge entry")
        verbose_name_plural = _("knowledge entries")

    def __str__(self):
        return self.title


class ChatbotConversation(TimeStampedModel):
    """
    A conversation session between a portal user and the chatbot.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        HANDED_OFF = "handed_off", _("Handed Off to Human")
        CLOSED = "closed", _("Closed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="chatbot_conversations",
        verbose_name=_("contact"),
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    # Track off-topic attempts for handoff logic
    fallback_count = models.PositiveIntegerField(
        _("Fallback Count"),
        default=0,
    )
    # If handed off, track the staff member
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_handoffs",
        verbose_name=_("assigned staff"),
    )
    handed_off_at = models.DateTimeField(
        _("Handed Off At"),
        null=True,
        blank=True,
    )
    closed_at = models.DateTimeField(
        _("Closed At"),
        null=True,
        blank=True,
    )
    # Context for appointment booking
    appointment_context = models.JSONField(
        _("Appointment Context"),
        default=dict,
        blank=True,
        help_text=_("Stores appointment booking progress."),
    )

    class Meta:
        db_table = "crm_chatbot_conversations"
        ordering = ["-created_at"]
        verbose_name = _("chatbot conversation")
        verbose_name_plural = _("chatbot conversations")

    def __str__(self):
        return f"Conversation {self.id} - {self.contact}"


class ChatbotMessage(TimeStampedModel):
    """
    Individual messages in a chatbot conversation.
    """

    class Role(models.TextChoices):
        USER = "user", _("User")
        ASSISTANT = "assistant", _("Assistant")
        SYSTEM = "system", _("System")

    class MessageType(models.TextChoices):
        TEXT = "text", _("Text")
        APPOINTMENT_REQUEST = "appointment_request", _("Appointment Request")
        APPOINTMENT_CONFIRM = "appointment_confirm", _("Appointment Confirmation")
        HANDOFF_REQUEST = "handoff_request", _("Handoff Request")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        ChatbotConversation,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("conversation"),
    )
    role = models.CharField(
        _("Role"),
        max_length=20,
        choices=Role.choices,
    )
    message_type = models.CharField(
        _("Message Type"),
        max_length=30,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    content = models.TextField(_("Content"))
    # For appointment-related messages
    metadata = models.JSONField(
        _("Metadata"),
        default=dict,
        blank=True,
        help_text=_("Additional data like appointment details."),
    )
    # AI response metrics
    tokens_used = models.PositiveIntegerField(
        _("Tokens Used"),
        default=0,
    )

    class Meta:
        db_table = "crm_chatbot_messages"
        ordering = ["created_at"]
        verbose_name = _("chatbot message")
        verbose_name_plural = _("chatbot messages")

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."


class ChatbotAppointmentSlot(TimeStampedModel):
    """
    Available time slots for chatbot appointment booking.
    These are separate from regular appointments to allow
    the chatbot to show availability without full calendar access.
    """

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, _("Monday")
        TUESDAY = 1, _("Tuesday")
        WEDNESDAY = 2, _("Wednesday")
        THURSDAY = 3, _("Thursday")
        FRIDAY = 4, _("Friday")
        SATURDAY = 5, _("Saturday")
        SUNDAY = 6, _("Sunday")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day_of_week = models.IntegerField(
        _("Day of Week"),
        choices=DayOfWeek.choices,
    )
    start_time = models.TimeField(_("Start Time"))
    end_time = models.TimeField(_("End Time"))
    slot_duration_minutes = models.PositiveIntegerField(
        _("Slot Duration (minutes)"),
        default=30,
    )
    max_appointments = models.PositiveIntegerField(
        _("Max Appointments per Slot"),
        default=1,
    )
    is_active = models.BooleanField(_("Active"), default=True)
    # Optional: specific staff member for this slot
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_slots",
        verbose_name=_("assigned staff"),
    )

    class Meta:
        db_table = "crm_chatbot_appointment_slots"
        ordering = ["day_of_week", "start_time"]
        verbose_name = _("appointment slot")
        verbose_name_plural = _("appointment slots")

    def __str__(self):
        return f"{self.get_day_of_week_display()} {self.start_time}-{self.end_time}"
