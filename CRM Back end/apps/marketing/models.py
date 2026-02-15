import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedModel


class EmailList(TimeStampedModel):
    """
    Mailing list for organizing contacts into segments.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # Dynamic list based on filters
    is_dynamic = models.BooleanField(default=False)
    filter_criteria = models.JSONField(
        default=dict,
        blank=True,
        help_text="Filter criteria for dynamic lists (e.g., {'status': 'active', 'tags': ['vip']})",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_email_lists",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email List"
        verbose_name_plural = "Email Lists"

    def __str__(self):
        return self.name

    @property
    def subscriber_count(self):
        return self.subscribers.filter(is_subscribed=True).count()


class EmailListSubscriber(TimeStampedModel):
    """
    Subscriber in an email list.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_list = models.ForeignKey(
        EmailList, on_delete=models.CASCADE, related_name="subscribers"
    )
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.CASCADE, related_name="list_subscriptions"
    )
    is_subscribed = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    # Source of subscription
    source = models.CharField(
        max_length=50,
        choices=[
            ("manual", "Manual"),
            ("import", "Import"),
            ("webform", "Web Form"),
            ("api", "API"),
        ],
        default="manual",
    )

    class Meta:
        unique_together = ["email_list", "contact"]
        ordering = ["-subscribed_at"]

    def __str__(self):
        return f"{self.contact.email} in {self.email_list.name}"

    def unsubscribe(self):
        self.is_subscribed = False
        self.unsubscribed_at = timezone.now()
        self.save()


class CampaignTemplate(TimeStampedModel):
    """
    Reusable email template for campaigns.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    subject = models.CharField(max_length=500)
    preview_text = models.CharField(max_length=200, blank=True)

    # Content - HTML and plain text versions
    html_content = models.TextField()
    text_content = models.TextField(blank=True)

    # Template variables available
    # {{contact.first_name}}, {{contact.last_name}}, {{contact.email}}, {{company_name}}, etc.

    # Categorization
    category = models.CharField(
        max_length=50,
        choices=[
            ("newsletter", "Newsletter"),
            ("promotional", "Promotional"),
            ("transactional", "Transactional"),
            ("reminder", "Reminder"),
            ("follow_up", "Follow Up"),
            ("announcement", "Announcement"),
            ("welcome", "Welcome"),
            ("tax_season", "Tax Season"),
            ("other", "Other"),
        ],
        default="other",
    )

    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_campaign_templates",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Campaign(TimeStampedModel):
    """
    Email marketing campaign.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        PAUSED = "paused", "Paused"
        CANCELLED = "cancelled", "Cancelled"

    class CampaignType(models.TextChoices):
        REGULAR = "regular", "Regular Campaign"
        AUTOMATED = "automated", "Automated/Drip"
        AB_TEST = "ab_test", "A/B Test"
        RSS = "rss", "RSS Feed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    campaign_type = models.CharField(
        max_length=20, choices=CampaignType.choices, default=CampaignType.REGULAR
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    # Email content
    subject = models.CharField(max_length=500)
    preview_text = models.CharField(max_length=200, blank=True)
    from_name = models.CharField(max_length=100, default="Ebenezer Tax Services")
    from_email = models.EmailField(default="info@ebenezertax.com")
    reply_to = models.EmailField(blank=True)

    html_content = models.TextField()
    text_content = models.TextField(blank=True)

    # Template used (optional)
    template = models.ForeignKey(
        CampaignTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaigns",
    )

    # Target audience
    email_lists = models.ManyToManyField(
        EmailList, related_name="campaigns", blank=True
    )

    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Sending settings
    track_opens = models.BooleanField(default=True)
    track_clicks = models.BooleanField(default=True)

    # A/B Testing
    is_ab_test = models.BooleanField(default=False)
    ab_test_subject_b = models.CharField(max_length=500, blank=True)
    ab_test_content_b = models.TextField(blank=True)
    ab_test_split = models.IntegerField(
        default=50, help_text="Percentage for variant A"
    )
    ab_test_winner_criteria = models.CharField(
        max_length=20,
        choices=[
            ("open_rate", "Open Rate"),
            ("click_rate", "Click Rate"),
        ],
        default="open_rate",
    )

    # Stats (denormalized for quick access)
    total_recipients = models.IntegerField(default=0)
    total_sent = models.IntegerField(default=0)
    total_delivered = models.IntegerField(default=0)
    total_opened = models.IntegerField(default=0)
    total_clicked = models.IntegerField(default=0)
    total_bounced = models.IntegerField(default=0)
    total_unsubscribed = models.IntegerField(default=0)
    total_complained = models.IntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_campaigns",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def open_rate(self):
        if self.total_delivered == 0:
            return 0
        return round((self.total_opened / self.total_delivered) * 100, 2)

    @property
    def click_rate(self):
        if self.total_delivered == 0:
            return 0
        return round((self.total_clicked / self.total_delivered) * 100, 2)

    @property
    def bounce_rate(self):
        if self.total_sent == 0:
            return 0
        return round((self.total_bounced / self.total_sent) * 100, 2)


class CampaignRecipient(TimeStampedModel):
    """
    Individual recipient of a campaign email.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        OPENED = "opened", "Opened"
        CLICKED = "clicked", "Clicked"
        BOUNCED = "bounced", "Bounced"
        UNSUBSCRIBED = "unsubscribed", "Unsubscribed"
        COMPLAINED = "complained", "Complained"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="recipients"
    )
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.CASCADE, related_name="campaign_emails"
    )
    email = models.EmailField()  # Stored separately in case contact email changes

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # A/B Test variant
    ab_variant = models.CharField(
        max_length=1, blank=True, choices=[("A", "A"), ("B", "B")]
    )

    # Tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    bounced_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    # Counts
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)

    # Error tracking
    error_message = models.TextField(blank=True)
    bounce_type = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ("hard", "Hard Bounce"),
            ("soft", "Soft Bounce"),
        ],
    )

    # Unique tracking token
    tracking_token = models.UUIDField(default=uuid.uuid4, unique=True)

    class Meta:
        unique_together = ["campaign", "contact"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} - {self.campaign.name}"

    def mark_sent(self):
        self.status = self.Status.SENT
        self.sent_at = timezone.now()
        self.save()

    def mark_opened(self):
        if self.status not in [self.Status.CLICKED]:
            self.status = self.Status.OPENED
        if not self.opened_at:
            self.opened_at = timezone.now()
        self.open_count += 1
        self.save()

    def mark_clicked(self):
        self.status = self.Status.CLICKED
        if not self.clicked_at:
            self.clicked_at = timezone.now()
        self.click_count += 1
        self.save()


class CampaignLink(TimeStampedModel):
    """
    Tracked link in a campaign.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="links"
    )
    original_url = models.URLField(max_length=2000)
    tracking_url = models.URLField(max_length=2000, blank=True)

    # Stats
    total_clicks = models.IntegerField(default=0)
    unique_clicks = models.IntegerField(default=0)

    class Meta:
        unique_together = ["campaign", "original_url"]

    def __str__(self):
        return f"{self.original_url[:50]} ({self.total_clicks} clicks)"


class CampaignLinkClick(TimeStampedModel):
    """
    Individual click on a campaign link.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    link = models.ForeignKey(
        CampaignLink, on_delete=models.CASCADE, related_name="clicks"
    )
    recipient = models.ForeignKey(
        CampaignRecipient, on_delete=models.CASCADE, related_name="link_clicks"
    )
    clicked_at = models.DateTimeField(auto_now_add=True)

    # Additional tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ["-clicked_at"]


class AutomationSequence(TimeStampedModel):
    """
    Automated email sequence (drip campaign).
    """

    class TriggerType(models.TextChoices):
        SIGNUP = "signup", "New Signup/Contact"
        TAG_ADDED = "tag_added", "Tag Added"
        LIST_ADDED = "list_added", "Added to List"
        CASE_CREATED = "case_created", "Case Created"
        CASE_STATUS = "case_status", "Case Status Changed"
        DATE_FIELD = "date_field", "Date Field (Birthday, etc.)"
        MANUAL = "manual", "Manual Enrollment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    is_active = models.BooleanField(default=False)

    # Trigger settings
    trigger_type = models.CharField(
        max_length=30, choices=TriggerType.choices, default=TriggerType.MANUAL
    )
    trigger_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Trigger configuration (e.g., {'tag': 'new_client', 'list_id': 'xxx'})",
    )

    # Target audience
    email_lists = models.ManyToManyField(
        EmailList, related_name="automation_sequences", blank=True
    )

    # Settings
    from_name = models.CharField(max_length=100, default="Ebenezer Tax Services")
    from_email = models.EmailField(default="info@ebenezertax.com")
    reply_to = models.EmailField(blank=True)

    # Stats
    total_enrolled = models.IntegerField(default=0)
    total_completed = models.IntegerField(default=0)
    total_unsubscribed = models.IntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_automation_sequences",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AutomationStep(TimeStampedModel):
    """
    Individual step in an automation sequence.
    """

    class StepType(models.TextChoices):
        EMAIL = "email", "Send Email"
        WAIT = "wait", "Wait"
        CONDITION = "condition", "Condition/Branch"
        TAG = "tag", "Add/Remove Tag"
        LIST = "list", "Add/Remove from List"
        NOTIFY = "notify", "Notify Team"
        TASK = "task", "Create Task"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(
        AutomationSequence, on_delete=models.CASCADE, related_name="steps"
    )

    step_type = models.CharField(
        max_length=20, choices=StepType.choices, default=StepType.EMAIL
    )
    order = models.IntegerField(default=0)

    # Email step
    subject = models.CharField(max_length=500, blank=True)
    html_content = models.TextField(blank=True)
    text_content = models.TextField(blank=True)
    template = models.ForeignKey(
        CampaignTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Wait step
    wait_days = models.IntegerField(default=0)
    wait_hours = models.IntegerField(default=0)
    wait_minutes = models.IntegerField(default=0)

    # Condition step
    condition_field = models.CharField(max_length=100, blank=True)
    condition_operator = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ("equals", "Equals"),
            ("not_equals", "Not Equals"),
            ("contains", "Contains"),
            ("opened", "Opened Previous Email"),
            ("clicked", "Clicked Previous Email"),
        ],
    )
    condition_value = models.CharField(max_length=200, blank=True)

    # Tag/List step
    tag_action = models.CharField(
        max_length=10, blank=True, choices=[("add", "Add"), ("remove", "Remove")]
    )
    tag_name = models.CharField(max_length=100, blank=True)
    target_list = models.ForeignKey(
        EmailList,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="automation_targets",
    )

    # Stats
    total_processed = models.IntegerField(default=0)
    total_sent = models.IntegerField(default=0)
    total_opened = models.IntegerField(default=0)
    total_clicked = models.IntegerField(default=0)

    class Meta:
        ordering = ["sequence", "order"]

    def __str__(self):
        return f"{self.sequence.name} - Step {self.order}"


class AutomationEnrollment(TimeStampedModel):
    """
    Contact enrolled in an automation sequence.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        PAUSED = "paused", "Paused"
        UNSUBSCRIBED = "unsubscribed", "Unsubscribed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(
        AutomationSequence, on_delete=models.CASCADE, related_name="enrollments"
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="automation_enrollments",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )

    current_step = models.ForeignKey(
        AutomationStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_enrollments",
    )

    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    next_step_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["sequence", "contact"]
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.contact.email} in {self.sequence.name}"


class AutomationStepLog(TimeStampedModel):
    """
    Log of automation step execution.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        AutomationEnrollment, on_delete=models.CASCADE, related_name="step_logs"
    )
    step = models.ForeignKey(
        AutomationStep, on_delete=models.CASCADE, related_name="execution_logs"
    )

    executed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("success", "Success"),
            ("failed", "Failed"),
            ("skipped", "Skipped"),
        ],
        default="success",
    )

    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_opened = models.BooleanField(default=False)
    email_clicked = models.BooleanField(default=False)

    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-executed_at"]
