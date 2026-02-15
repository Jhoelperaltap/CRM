"""
Live Chat models for real-time customer support.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class ChatDepartment(TimeStampedModel):
    """
    Department for routing chat conversations.
    """

    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True, default="")
    is_active = models.BooleanField(_("active"), default=True)
    order = models.PositiveIntegerField(_("order"), default=0)

    # Auto-assignment settings
    auto_assign = models.BooleanField(
        _("auto assign"),
        default=True,
        help_text=_("Automatically assign chats to available agents"),
    )
    max_concurrent_chats = models.PositiveIntegerField(
        _("max concurrent chats per agent"),
        default=5,
    )

    # Offline behavior
    offline_message = models.TextField(
        _("offline message"),
        default="We're currently offline. Please leave a message and we'll get back to you.",
    )
    collect_email_offline = models.BooleanField(
        _("collect email when offline"),
        default=True,
    )

    class Meta:
        db_table = "livechat_departments"
        ordering = ["order", "name"]
        verbose_name = _("department")
        verbose_name_plural = _("departments")

    def __str__(self):
        return self.name

    @property
    def online_agents_count(self):
        return self.agents.filter(is_available=True, user__is_active=True).count()


class ChatAgent(TimeStampedModel):
    """
    Agent availability and settings for live chat.
    """

    class Status(models.TextChoices):
        ONLINE = "online", _("Online")
        AWAY = "away", _("Away")
        BUSY = "busy", _("Busy")
        OFFLINE = "offline", _("Offline")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_agent",
        verbose_name=_("user"),
    )
    departments = models.ManyToManyField(
        ChatDepartment,
        related_name="agents",
        blank=True,
        verbose_name=_("departments"),
    )

    is_available = models.BooleanField(_("available"), default=False)
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.OFFLINE,
    )
    status_message = models.CharField(
        _("status message"),
        max_length=200,
        blank=True,
        default="",
    )

    # Capacity
    max_concurrent_chats = models.PositiveIntegerField(
        _("max concurrent chats"),
        default=5,
    )
    current_chat_count = models.PositiveIntegerField(
        _("current chat count"),
        default=0,
    )

    # Stats
    total_chats_handled = models.PositiveIntegerField(default=0)
    avg_response_time = models.DurationField(null=True, blank=True)
    avg_rating = models.FloatField(null=True, blank=True)

    # Notifications
    sound_enabled = models.BooleanField(_("sound notifications"), default=True)
    desktop_notifications = models.BooleanField(
        _("desktop notifications"), default=True
    )

    last_seen = models.DateTimeField(_("last seen"), null=True, blank=True)

    class Meta:
        db_table = "livechat_agents"
        verbose_name = _("chat agent")
        verbose_name_plural = _("chat agents")

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.get_status_display()})"

    @property
    def can_accept_chat(self):
        return (
            self.is_available
            and self.status == self.Status.ONLINE
            and self.current_chat_count < self.max_concurrent_chats
        )

    def go_online(self):
        self.is_available = True
        self.status = self.Status.ONLINE
        self.last_seen = timezone.now()
        self.save()

    def go_offline(self):
        self.is_available = False
        self.status = self.Status.OFFLINE
        self.save()


class ChatSession(TimeStampedModel):
    """
    A chat conversation session between visitor and agent(s).
    """

    class Status(models.TextChoices):
        WAITING = "waiting", _("Waiting")
        ACTIVE = "active", _("Active")
        ON_HOLD = "on_hold", _("On Hold")
        CLOSED = "closed", _("Closed")
        MISSED = "missed", _("Missed")

    class Source(models.TextChoices):
        WIDGET = "widget", _("Chat Widget")
        PORTAL = "portal", _("Customer Portal")
        INTERNAL = "internal", _("Internal")

    # Session identification
    session_id = models.CharField(
        _("session ID"),
        max_length=100,
        unique=True,
        db_index=True,
    )

    # Status
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=Status.choices,
        default=Status.WAITING,
        db_index=True,
    )
    source = models.CharField(
        _("source"),
        max_length=20,
        choices=Source.choices,
        default=Source.WIDGET,
    )

    # Routing
    department = models.ForeignKey(
        ChatDepartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
        verbose_name=_("department"),
    )

    # Participants
    visitor_name = models.CharField(_("visitor name"), max_length=100, blank=True)
    visitor_email = models.EmailField(_("visitor email"), blank=True)
    visitor_phone = models.CharField(_("visitor phone"), max_length=30, blank=True)

    # If visitor is a portal user or contact
    portal_access = models.ForeignKey(
        "portal.ClientPortalAccess",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_sessions",
        verbose_name=_("portal access"),
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_sessions",
        verbose_name=_("contact"),
    )

    # Assigned agent(s)
    assigned_agent = models.ForeignKey(
        ChatAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_sessions",
        verbose_name=_("assigned agent"),
    )
    previous_agents = models.ManyToManyField(
        ChatAgent,
        related_name="previous_sessions",
        blank=True,
        verbose_name=_("previous agents"),
    )

    # Timing
    started_at = models.DateTimeField(_("started at"), auto_now_add=True)
    first_response_at = models.DateTimeField(
        _("first response at"), null=True, blank=True
    )
    ended_at = models.DateTimeField(_("ended at"), null=True, blank=True)
    wait_time = models.DurationField(_("wait time"), null=True, blank=True)

    # Context
    subject = models.CharField(_("subject"), max_length=255, blank=True)
    initial_message = models.TextField(_("initial message"), blank=True)

    # Visitor info
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.TextField(_("user agent"), blank=True)
    page_url = models.URLField(_("page URL"), max_length=500, blank=True)
    referrer = models.URLField(_("referrer"), max_length=500, blank=True)

    # Metadata
    tags = models.JSONField(_("tags"), default=list, blank=True)
    custom_fields = models.JSONField(_("custom fields"), default=dict, blank=True)

    # Rating
    rating = models.PositiveSmallIntegerField(
        _("rating"),
        null=True,
        blank=True,
        help_text=_("1-5 stars"),
    )
    rating_comment = models.TextField(_("rating comment"), blank=True)

    # Transcript
    transcript_sent = models.BooleanField(_("transcript sent"), default=False)
    transcript_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "livechat_sessions"
        ordering = ["-created_at"]
        verbose_name = _("chat session")
        verbose_name_plural = _("chat sessions")
        indexes = [
            models.Index(fields=["status", "department"]),
            models.Index(fields=["assigned_agent", "status"]),
        ]

    def __str__(self):
        return f"Chat {self.session_id} - {self.visitor_name or 'Anonymous'}"

    @property
    def duration(self):
        if self.ended_at:
            return self.ended_at - self.started_at
        return timezone.now() - self.started_at

    @property
    def message_count(self):
        return self.messages.count()

    def assign_to(self, agent: ChatAgent):
        """Assign this chat to an agent."""
        if self.assigned_agent and self.assigned_agent != agent:
            self.previous_agents.add(self.assigned_agent)
            self.assigned_agent.current_chat_count = max(
                0, self.assigned_agent.current_chat_count - 1
            )
            self.assigned_agent.save()

        self.assigned_agent = agent
        self.status = self.Status.ACTIVE
        agent.current_chat_count += 1
        agent.save()
        self.save()

    def close(self, by_agent: bool = False):
        """Close the chat session."""
        self.status = self.Status.CLOSED
        self.ended_at = timezone.now()

        if self.assigned_agent:
            self.assigned_agent.current_chat_count = max(
                0, self.assigned_agent.current_chat_count - 1
            )
            self.assigned_agent.total_chats_handled += 1
            self.assigned_agent.save()

        self.save()


class ChatMessage(TimeStampedModel):
    """
    Individual message within a chat session.
    """

    class MessageType(models.TextChoices):
        TEXT = "text", _("Text")
        FILE = "file", _("File")
        IMAGE = "image", _("Image")
        SYSTEM = "system", _("System")
        NOTE = "note", _("Internal Note")

    class SenderType(models.TextChoices):
        VISITOR = "visitor", _("Visitor")
        AGENT = "agent", _("Agent")
        SYSTEM = "system", _("System")
        BOT = "bot", _("Bot")

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("session"),
    )

    message_type = models.CharField(
        _("message type"),
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    sender_type = models.CharField(
        _("sender type"),
        max_length=20,
        choices=SenderType.choices,
    )

    # Sender details
    agent = models.ForeignKey(
        ChatAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
        verbose_name=_("agent"),
    )
    sender_name = models.CharField(_("sender name"), max_length=100, blank=True)

    # Content
    content = models.TextField(_("content"))

    # File attachment
    file = models.FileField(
        _("file"),
        upload_to="livechat/attachments/%Y/%m/",
        null=True,
        blank=True,
    )
    file_name = models.CharField(_("file name"), max_length=255, blank=True)
    file_size = models.PositiveIntegerField(_("file size"), default=0)
    file_type = models.CharField(_("file type"), max_length=100, blank=True)

    # Delivery status
    is_read = models.BooleanField(_("read"), default=False)
    read_at = models.DateTimeField(_("read at"), null=True, blank=True)
    delivered_at = models.DateTimeField(_("delivered at"), null=True, blank=True)

    # Internal note flag (only visible to agents)
    is_internal = models.BooleanField(_("internal note"), default=False)

    class Meta:
        db_table = "livechat_messages"
        ordering = ["created_at"]
        verbose_name = _("chat message")
        verbose_name_plural = _("chat messages")

    def __str__(self):
        return f"{self.sender_type}: {self.content[:50]}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class CannedResponse(TimeStampedModel):
    """
    Pre-defined response templates for quick replies.
    """

    title = models.CharField(_("title"), max_length=100)
    shortcut = models.CharField(
        _("shortcut"),
        max_length=50,
        unique=True,
        help_text=_("Type /shortcut to use this response"),
    )
    content = models.TextField(_("content"))

    department = models.ForeignKey(
        ChatDepartment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="canned_responses",
        verbose_name=_("department"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="canned_responses",
        verbose_name=_("created by"),
    )

    is_global = models.BooleanField(
        _("global"),
        default=False,
        help_text=_("Available to all departments"),
    )
    is_active = models.BooleanField(_("active"), default=True)

    # Usage tracking
    usage_count = models.PositiveIntegerField(_("usage count"), default=0)

    class Meta:
        db_table = "livechat_canned_responses"
        ordering = ["title"]
        verbose_name = _("canned response")
        verbose_name_plural = _("canned responses")

    def __str__(self):
        return f"/{self.shortcut} - {self.title}"


class ChatWidgetSettings(TimeStampedModel):
    """
    Configuration for the chat widget appearance and behavior.
    """

    # Appearance
    primary_color = models.CharField(
        _("primary color"), max_length=20, default="#3b82f6"
    )
    position = models.CharField(
        _("position"),
        max_length=20,
        default="bottom-right",
        choices=[
            ("bottom-right", "Bottom Right"),
            ("bottom-left", "Bottom Left"),
        ],
    )
    button_icon = models.CharField(_("button icon"), max_length=50, default="chat")

    # Branding
    company_name = models.CharField(
        _("company name"), max_length=100, default="Support"
    )
    welcome_message = models.TextField(
        _("welcome message"),
        default="Hi there! How can we help you today?",
    )
    away_message = models.TextField(
        _("away message"),
        default="We're not available right now. Please leave a message.",
    )

    # Pre-chat form
    require_name = models.BooleanField(_("require name"), default=True)
    require_email = models.BooleanField(_("require email"), default=True)
    require_phone = models.BooleanField(_("require phone"), default=False)
    require_department = models.BooleanField(
        _("require department selection"), default=False
    )

    # Behavior
    auto_popup = models.BooleanField(_("auto popup"), default=False)
    auto_popup_delay = models.PositiveIntegerField(
        _("auto popup delay (seconds)"),
        default=30,
    )
    play_sound = models.BooleanField(_("play sound on new message"), default=True)
    show_agent_photo = models.BooleanField(_("show agent photo"), default=True)
    show_typing_indicator = models.BooleanField(
        _("show typing indicator"), default=True
    )

    # Operating hours
    use_operating_hours = models.BooleanField(_("use operating hours"), default=False)
    operating_hours = models.JSONField(
        _("operating hours"),
        default=dict,
        blank=True,
        help_text=_("Operating hours by day of week"),
    )
    timezone = models.CharField(_("timezone"), max_length=50, default="UTC")

    # Features
    file_upload_enabled = models.BooleanField(_("enable file uploads"), default=True)
    max_file_size_mb = models.PositiveIntegerField(_("max file size (MB)"), default=10)
    allowed_file_types = models.JSONField(
        _("allowed file types"),
        default=list,
        blank=True,
    )

    # Rating
    enable_rating = models.BooleanField(_("enable chat rating"), default=True)
    rating_prompt = models.CharField(
        _("rating prompt"),
        max_length=200,
        default="How was your experience?",
    )

    # Transcript
    offer_transcript = models.BooleanField(_("offer transcript"), default=True)

    class Meta:
        db_table = "livechat_widget_settings"
        verbose_name = _("widget settings")
        verbose_name_plural = _("widget settings")

    def __str__(self):
        return "Chat Widget Settings"


class OfflineMessage(TimeStampedModel):
    """
    Messages left when no agents are available.
    """

    name = models.CharField(_("name"), max_length=100)
    email = models.EmailField(_("email"))
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    message = models.TextField(_("message"))

    department = models.ForeignKey(
        ChatDepartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="offline_messages",
        verbose_name=_("department"),
    )

    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    page_url = models.URLField(_("page URL"), max_length=500, blank=True)

    # Follow-up
    is_read = models.BooleanField(_("read"), default=False)
    read_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="read_offline_messages",
        verbose_name=_("read by"),
    )
    read_at = models.DateTimeField(_("read at"), null=True, blank=True)

    is_responded = models.BooleanField(_("responded"), default=False)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="responded_offline_messages",
        verbose_name=_("responded by"),
    )
    responded_at = models.DateTimeField(_("responded at"), null=True, blank=True)

    # Convert to case/contact
    converted_to_contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="from_offline_messages",
        verbose_name=_("converted to contact"),
    )
    converted_to_case = models.ForeignKey(
        "cases.TaxCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="from_offline_messages",
        verbose_name=_("converted to case"),
    )

    class Meta:
        db_table = "livechat_offline_messages"
        ordering = ["-created_at"]
        verbose_name = _("offline message")
        verbose_name_plural = _("offline messages")

    def __str__(self):
        return f"Offline: {self.name} - {self.email}"
