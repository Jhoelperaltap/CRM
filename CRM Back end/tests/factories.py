"""
Factory-boy factories for the Ebenezer Tax Services CRM.

All domain models are represented here so that tests across every app
can create realistic, valid instances with minimal boilerplate.
"""

import datetime

import factory
from factory.django import DjangoModelFactory, FileField

# ---------------------------------------------------------------------------
# Users app
# ---------------------------------------------------------------------------


class RoleFactory(DjangoModelFactory):
    """Base role factory.  Use the specialised sub-factories below for
    deterministic slug values; this factory uses a sequence to keep slugs
    unique when many roles are created in a single test run."""

    class Meta:
        model = "users.Role"
        django_get_or_create = ("slug",)

    name = factory.Sequence(lambda n: f"Role {n}")
    slug = factory.Sequence(lambda n: f"role-{n}")
    description = factory.Faker("sentence")


class AdminRoleFactory(RoleFactory):
    name = "Administrator"
    slug = "admin"


class ManagerRoleFactory(RoleFactory):
    name = "Manager"
    slug = "manager"


class PreparerRoleFactory(RoleFactory):
    name = "Tax Preparer"
    slug = "preparer"


class ReceptionistRoleFactory(RoleFactory):
    name = "Receptionist"
    slug = "receptionist"


class UserFactory(DjangoModelFactory):
    class Meta:
        model = "users.User"
        skip_postgeneration_save = True

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    # Use sequence to ensure unique usernames even if Faker generates duplicate names
    username = factory.LazyAttributeSequence(
        lambda obj, n: f"{obj.first_name.lower()}.{obj.last_name.lower()}.{n}"
    )
    email = factory.LazyAttributeSequence(
        lambda obj, n: f"{obj.first_name.lower()}.{obj.last_name.lower()}.{n}@example.com"
    )
    phone = factory.Sequence(lambda n: f"+1555{n:07d}")
    role = factory.SubFactory(RoleFactory)
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to properly hash the password."""
        password = kwargs.pop("password", "TestPass123!")
        user = super()._create(model_class, *args, **kwargs)
        user.set_password(password)
        user.save(update_fields=["password"])
        return user


class ModulePermissionFactory(DjangoModelFactory):
    class Meta:
        model = "users.ModulePermission"

    role = factory.SubFactory(RoleFactory)
    module = "contacts"
    can_view = True
    can_create = False
    can_edit = False
    can_delete = False


# ---------------------------------------------------------------------------
# Contacts app
# ---------------------------------------------------------------------------


class ContactFactory(DjangoModelFactory):
    class Meta:
        model = "contacts.Contact"

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.Faker("email")
    phone = factory.Sequence(lambda n: f"+1555{n:07d}")
    mobile = factory.Sequence(lambda n: f"+1666{n:07d}")
    status = "active"
    primary_corporation = None
    assigned_to = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)


# ---------------------------------------------------------------------------
# Corporations app
# ---------------------------------------------------------------------------


class CorporationFactory(DjangoModelFactory):
    class Meta:
        model = "corporations.Corporation"

    name = factory.Faker("company")
    entity_type = "llc"
    ein = factory.Faker("numerify", text="##-#######")
    status = "active"
    primary_contact = None
    assigned_to = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)


# ---------------------------------------------------------------------------
# Cases app
# ---------------------------------------------------------------------------


class TaxCaseFactory(DjangoModelFactory):
    class Meta:
        model = "cases.TaxCase"

    case_number = factory.Sequence(lambda n: f"TC-2025-{n:04d}")
    title = factory.Faker("sentence", nb_words=5)
    case_type = "individual_1040"
    fiscal_year = 2025
    status = "new"
    priority = "medium"
    contact = factory.SubFactory(ContactFactory)
    corporation = None
    assigned_preparer = factory.SubFactory(UserFactory)
    reviewer = None
    created_by = factory.SubFactory(UserFactory)
    estimated_fee = factory.Faker(
        "pydecimal", left_digits=4, right_digits=2, positive=True
    )
    actual_fee = None
    due_date = factory.Faker("date_object")


class TaxCaseNoteFactory(DjangoModelFactory):
    class Meta:
        model = "cases.TaxCaseNote"

    case = factory.SubFactory(TaxCaseFactory)
    author = factory.SubFactory(UserFactory)
    content = factory.Faker("paragraph")
    is_internal = True


# ---------------------------------------------------------------------------
# Appointments app
# ---------------------------------------------------------------------------


class AppointmentFactory(DjangoModelFactory):
    class Meta:
        model = "appointments.Appointment"

    title = factory.Faker("sentence", nb_words=4)
    start_datetime = factory.Faker(
        "future_datetime", end_date="+30d", tzinfo=datetime.timezone.utc
    )
    end_datetime = factory.LazyAttribute(
        lambda obj: obj.start_datetime + datetime.timedelta(hours=1)
    )
    location = "office"
    status = "scheduled"
    contact = factory.SubFactory(ContactFactory)
    assigned_to = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)
    case = None


# ---------------------------------------------------------------------------
# Documents app
# ---------------------------------------------------------------------------


class DocumentFactory(DjangoModelFactory):
    class Meta:
        model = "documents.Document"

    title = factory.Faker("file_name", extension="pdf")
    file = FileField(filename="test_document.pdf")
    doc_type = "other"
    status = "pending"
    file_size = factory.Faker("random_int", min=1024, max=10485760)
    mime_type = "application/pdf"
    version = 1
    is_encrypted = False
    encryption_key_id = ""
    parent_document = None
    contact = None
    corporation = None
    case = None
    uploaded_by = factory.SubFactory(UserFactory)


class DocumentAccessLogFactory(DjangoModelFactory):
    class Meta:
        model = "documents.DocumentAccessLog"

    document = factory.SubFactory(DocumentFactory)
    user = factory.SubFactory(UserFactory)
    action = "download"
    ip_address = factory.Faker("ipv4")
    user_agent = factory.Faker("user_agent")


# ---------------------------------------------------------------------------
# Tasks app
# ---------------------------------------------------------------------------


class TaskFactory(DjangoModelFactory):
    class Meta:
        model = "tasks.Task"

    title = factory.Faker("sentence", nb_words=5)
    priority = "medium"
    status = "todo"
    assigned_to = factory.SubFactory(UserFactory)
    assigned_group = None
    created_by = factory.SubFactory(UserFactory)
    case = None
    contact = None
    due_date = factory.Faker("date_object")
    sla_hours = None
    sla_breached_at = None


# ---------------------------------------------------------------------------
# Audit app
# ---------------------------------------------------------------------------


class AuditLogFactory(DjangoModelFactory):
    class Meta:
        model = "audit.AuditLog"

    user = factory.SubFactory(UserFactory)
    action = "create"
    module = "contacts"
    object_id = factory.Faker("uuid4")
    object_repr = factory.Faker("sentence", nb_words=3)
    changes = factory.LazyFunction(dict)
    ip_address = factory.Faker("ipv4")


# ---------------------------------------------------------------------------
# Stage 2: Settings / Admin models
# ---------------------------------------------------------------------------


class UserGroupFactory(DjangoModelFactory):
    class Meta:
        model = "users.UserGroup"

    name = factory.Sequence(lambda n: f"Group {n}")
    description = factory.Faker("sentence")


class UserGroupMembershipFactory(DjangoModelFactory):
    class Meta:
        model = "users.UserGroupMembership"

    group = factory.SubFactory(UserGroupFactory)
    user = factory.SubFactory(UserFactory)


class SharingRuleFactory(DjangoModelFactory):
    class Meta:
        model = "users.SharingRule"

    module = "contacts"
    default_access = "private"
    share_type = "role_hierarchy"
    access_level = "read_only"
    is_active = True


class AuthenticationPolicyFactory(DjangoModelFactory):
    class Meta:
        model = "users.AuthenticationPolicy"
        django_get_or_create = ("id",)

    id = factory.LazyFunction(
        lambda: __import__("uuid").UUID("00000000-0000-4000-8000-000000000001")
    )
    password_reset_frequency_days = 180
    password_history_count = 5
    idle_session_timeout_minutes = 240
    max_concurrent_sessions = 4
    enforce_password_complexity = True
    min_password_length = 8


class LoginIPWhitelistFactory(DjangoModelFactory):
    class Meta:
        model = "users.LoginIPWhitelist"

    ip_address = factory.Faker("ipv4")
    cidr_prefix = None
    role = None
    user = None
    description = factory.Faker("sentence")
    is_active = True


class PasswordHistoryFactory(DjangoModelFactory):
    class Meta:
        model = "users.PasswordHistory"

    user = factory.SubFactory(UserFactory)
    password_hash = factory.Faker("sha256")


class BranchFactory(DjangoModelFactory):
    class Meta:
        model = "users.Branch"

    name = factory.Sequence(lambda n: f"Branch {n}")
    code = factory.Sequence(lambda n: f"BR{n}")
    address = factory.Faker("street_address")
    city = factory.Faker("city")
    state = factory.Faker("state_abbr")
    zip_code = factory.Faker("zipcode")
    phone = factory.Sequence(lambda n: f"+1888{n:07d}")
    is_active = True
    is_headquarters = False


class UserSessionFactory(DjangoModelFactory):
    class Meta:
        model = "users.UserSession"

    user = factory.SubFactory(UserFactory)
    jti = factory.Faker("uuid4")
    ip_address = factory.Faker("ipv4")
    user_agent = factory.Faker("user_agent")
    is_active = True


# ---------------------------------------------------------------------------
# Audit: Stage 2 models
# ---------------------------------------------------------------------------


class LoginHistoryFactory(DjangoModelFactory):
    class Meta:
        model = "audit.LoginHistory"

    user = factory.SubFactory(UserFactory)
    email_attempted = factory.Faker("email")
    status = "success"
    ip_address = factory.Faker("ipv4")
    user_agent = factory.Faker("user_agent")
    failure_reason = ""


class SettingsLogFactory(DjangoModelFactory):
    class Meta:
        model = "audit.SettingsLog"

    user = factory.SubFactory(UserFactory)
    setting_area = "authentication_policy"
    setting_key = "max_concurrent_sessions"
    old_value = factory.LazyFunction(lambda: {"value": 4})
    new_value = factory.LazyFunction(lambda: {"value": 8})
    ip_address = factory.Faker("ipv4")


class EncryptedFieldAccessLogFactory(DjangoModelFactory):
    class Meta:
        model = "audit.EncryptedFieldAccessLog"

    user = factory.SubFactory(UserFactory)
    module = "contacts"
    object_id = factory.Faker("uuid4")
    field_name = "ssn_last_four"
    access_type = "view"
    ip_address = factory.Faker("ipv4")


# ---------------------------------------------------------------------------
# Stage 3: Email models
# ---------------------------------------------------------------------------


class EmailAccountFactory(DjangoModelFactory):
    class Meta:
        model = "emails.EmailAccount"

    name = factory.Sequence(lambda n: f"Account {n}")
    email_address = factory.Sequence(lambda n: f"office{n}@example.com")
    imap_host = "imap.example.com"
    imap_port = 993
    imap_use_ssl = True
    smtp_host = "smtp.example.com"
    smtp_port = 587
    smtp_use_tls = True
    username = factory.LazyAttribute(lambda obj: obj.email_address)
    password = "test-password"
    is_active = True
    sync_interval_minutes = 5


class EmailThreadFactory(DjangoModelFactory):
    class Meta:
        model = "emails.EmailThread"

    subject = factory.Faker("sentence", nb_words=5)
    contact = None
    case = None
    last_message_at = factory.Faker("date_time_this_year", tzinfo=datetime.timezone.utc)
    message_count = 1


class EmailMessageFactory(DjangoModelFactory):
    class Meta:
        model = "emails.EmailMessage"

    account = factory.SubFactory(EmailAccountFactory)
    thread = factory.SubFactory(EmailThreadFactory)
    message_id = factory.Sequence(lambda n: f"<msg-{n}@example.com>")
    direction = "inbound"
    from_address = factory.Faker("email")
    to_addresses = factory.LazyFunction(lambda: ["office@example.com"])
    subject = factory.Faker("sentence", nb_words=5)
    body_text = factory.Faker("paragraph")
    sent_at = factory.Faker("date_time_this_year", tzinfo=datetime.timezone.utc)
    folder = "inbox"
    is_read = False


class EmailAttachmentFactory(DjangoModelFactory):
    class Meta:
        model = "emails.EmailAttachment"

    email = factory.SubFactory(EmailMessageFactory)
    file = FileField(filename="test_attachment.pdf")
    filename = "test_attachment.pdf"
    mime_type = "application/pdf"
    file_size = 1024


class EmailTemplateFactory(DjangoModelFactory):
    class Meta:
        model = "emails.EmailTemplate"

    name = factory.Sequence(lambda n: f"Template {n}")
    subject = "Hello {{contact_name}}"
    body_text = (
        "Dear {{contact_name}},\n\nYour case {{case_number}} is ready.\n\nBest regards"
    )
    variables = factory.LazyFunction(lambda: ["contact_name", "case_number"])
    is_active = True


class EmailSyncLogFactory(DjangoModelFactory):
    class Meta:
        model = "emails.EmailSyncLog"

    account = factory.SubFactory(EmailAccountFactory)
    status = "success"
    messages_fetched = factory.Faker("random_int", min=0, max=50)
    started_at = factory.Faker("date_time_this_year", tzinfo=datetime.timezone.utc)
    completed_at = factory.LazyAttribute(
        lambda obj: obj.started_at + datetime.timedelta(seconds=30)
    )


# ---------------------------------------------------------------------------
# Stage 4: Notifications
# ---------------------------------------------------------------------------


class NotificationFactory(DjangoModelFactory):
    class Meta:
        model = "notifications.Notification"

    recipient = factory.SubFactory(UserFactory)
    notification_type = "system"
    title = factory.Faker("sentence", nb_words=5)
    message = factory.Faker("paragraph")
    severity = "info"
    is_read = False


class NotificationPreferenceFactory(DjangoModelFactory):
    class Meta:
        model = "notifications.NotificationPreference"

    user = factory.SubFactory(UserFactory)
    notification_type = "system"
    in_app_enabled = True
    email_enabled = False


# ---------------------------------------------------------------------------
# Stage 4: Workflows
# ---------------------------------------------------------------------------


class WorkflowRuleFactory(DjangoModelFactory):
    class Meta:
        model = "workflows.WorkflowRule"

    name = factory.Sequence(lambda n: f"Workflow Rule {n}")
    description = factory.Faker("sentence")
    is_active = True
    trigger_type = "case_status_changed"
    trigger_config = factory.LazyFunction(dict)
    conditions = factory.LazyFunction(dict)
    action_type = "send_notification"
    action_config = factory.LazyFunction(
        lambda: {"title": "Test", "severity": "info", "recipient": "preparer"}
    )
    created_by = factory.SubFactory(UserFactory)


class WorkflowExecutionLogFactory(DjangoModelFactory):
    class Meta:
        model = "workflows.WorkflowExecutionLog"

    rule = factory.SubFactory(WorkflowRuleFactory)
    triggered_at = factory.Faker("date_time_this_year", tzinfo=datetime.timezone.utc)
    trigger_object_type = "taxcase"
    trigger_object_id = factory.Faker("uuid4")
    action_taken = "send_notification"
    result = "success"


# ---------------------------------------------------------------------------
# Stage 4: Checklists
# ---------------------------------------------------------------------------


class ChecklistTemplateFactory(DjangoModelFactory):
    class Meta:
        model = "cases.ChecklistTemplate"

    name = factory.Sequence(lambda n: f"Template {n}")
    case_type = "individual_1040"
    tax_year = None
    is_active = True
    created_by = factory.SubFactory(UserFactory)


class ChecklistTemplateItemFactory(DjangoModelFactory):
    class Meta:
        model = "cases.ChecklistTemplateItem"

    template = factory.SubFactory(ChecklistTemplateFactory)
    title = factory.Faker("sentence", nb_words=4)
    description = ""
    doc_type = ""
    sort_order = factory.Sequence(lambda n: n)
    is_required = True


class CaseChecklistFactory(DjangoModelFactory):
    class Meta:
        model = "cases.CaseChecklist"

    case = factory.SubFactory(TaxCaseFactory)
    template = factory.SubFactory(ChecklistTemplateFactory)
    completed_count = 0
    total_count = 0


class CaseChecklistItemFactory(DjangoModelFactory):
    class Meta:
        model = "cases.CaseChecklistItem"

    checklist = factory.SubFactory(CaseChecklistFactory)
    title = factory.Faker("sentence", nb_words=4)
    is_completed = False
    sort_order = factory.Sequence(lambda n: n)
    is_required = True


# ---------------------------------------------------------------------------
# Stage 5: Portal models
# ---------------------------------------------------------------------------


class ClientPortalAccessFactory(DjangoModelFactory):
    class Meta:
        model = "portal.ClientPortalAccess"

    contact = factory.SubFactory(ContactFactory)
    email = factory.LazyAttribute(lambda obj: obj.contact.email)
    password_hash = factory.LazyFunction(
        lambda: __import__(
            "django.contrib.auth.hashers", fromlist=["make_password"]
        ).make_password("PortalPass123!")
    )
    is_active = True


class PortalMessageFactory(DjangoModelFactory):
    class Meta:
        model = "portal.PortalMessage"

    contact = factory.SubFactory(ContactFactory)
    message_type = "client_to_staff"
    subject = factory.Faker("sentence", nb_words=5)
    body = factory.Faker("paragraph")
    is_read = False


class PortalDocumentUploadFactory(DjangoModelFactory):
    class Meta:
        model = "portal.PortalDocumentUpload"

    contact = factory.SubFactory(ContactFactory)
    document = factory.SubFactory(DocumentFactory)
    status = "pending"


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------


class DepartmentFactory(DjangoModelFactory):
    class Meta:
        model = "users.Department"

    name = factory.Sequence(lambda n: f"Department {n}")
    code = factory.Sequence(lambda n: f"DEPT{n}")
    description = factory.Faker("sentence")
    color = "#3B82F6"
    icon = "Briefcase"
    is_active = True
    order = factory.Sequence(lambda n: n)


class DepartmentClientFolderFactory(DjangoModelFactory):
    class Meta:
        model = "documents.DepartmentClientFolder"

    name = factory.Sequence(lambda n: f"Folder {n}")
    department = factory.SubFactory(DepartmentFactory)
    contact = factory.SubFactory(ContactFactory)  # Required by CHECK constraint
    corporation = None
    parent = None
    description = ""
    is_default = False
    created_by = factory.SubFactory(UserFactory)


# ---------------------------------------------------------------------------
# Live Chat models
# ---------------------------------------------------------------------------


class ChatDepartmentFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.ChatDepartment"

    name = factory.Sequence(lambda n: f"Support Team {n}")
    description = factory.Faker("sentence")
    is_active = True
    order = factory.Sequence(lambda n: n)
    auto_assign = True
    max_concurrent_chats = 5
    offline_message = "We're currently offline. Please leave a message."
    collect_email_offline = True


class ChatAgentFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.ChatAgent"

    user = factory.SubFactory(UserFactory)
    is_available = False
    status = "offline"
    status_message = ""
    max_concurrent_chats = 5
    current_chat_count = 0
    total_chats_handled = 0
    sound_enabled = True
    desktop_notifications = True


class ChatSessionFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.ChatSession"

    session_id = factory.Sequence(lambda n: f"session-{n}")
    status = "waiting"
    source = "widget"
    department = factory.SubFactory(ChatDepartmentFactory)
    visitor_name = factory.Faker("name")
    visitor_email = factory.Faker("email")
    visitor_phone = factory.Sequence(lambda n: f"+1999{n:07d}")
    assigned_agent = None
    subject = factory.Faker("sentence", nb_words=5)
    initial_message = factory.Faker("paragraph")
    ip_address = factory.Faker("ipv4")
    user_agent = factory.Faker("user_agent")


class ChatMessageFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.ChatMessage"

    session = factory.SubFactory(ChatSessionFactory)
    message_type = "text"
    sender_type = "visitor"
    agent = None
    sender_name = factory.LazyAttribute(lambda obj: obj.session.visitor_name)
    content = factory.Faker("paragraph")
    is_read = False
    is_internal = False


class CannedResponseFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.CannedResponse"

    title = factory.Sequence(lambda n: f"Quick Reply {n}")
    shortcut = factory.Sequence(lambda n: f"qr{n}")
    content = factory.Faker("paragraph")
    department = None
    created_by = factory.SubFactory(UserFactory)
    is_global = True
    is_active = True
    usage_count = 0


class ChatWidgetSettingsFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.ChatWidgetSettings"

    primary_color = "#3b82f6"
    position = "bottom-right"
    company_name = "Support"
    welcome_message = "Hi there! How can we help you today?"
    away_message = "We're not available right now. Please leave a message."
    require_name = True
    require_email = True
    enable_rating = True


class OfflineMessageFactory(DjangoModelFactory):
    class Meta:
        model = "live_chat.OfflineMessage"

    name = factory.Faker("name")
    email = factory.Faker("email")
    phone = factory.Sequence(lambda n: f"+1444{n:07d}")
    message = factory.Faker("paragraph")
    department = factory.SubFactory(ChatDepartmentFactory)
    ip_address = factory.Faker("ipv4")
    is_read = False
    is_responded = False


# ---------------------------------------------------------------------------
# Calls models
# ---------------------------------------------------------------------------


class TelephonyProviderFactory(DjangoModelFactory):
    class Meta:
        model = "calls.TelephonyProvider"

    name = factory.Sequence(lambda n: f"Provider {n}")
    provider_type = "twilio"
    is_active = True
    is_default = False
    account_sid = factory.Faker("uuid4")
    auth_token = factory.Faker("uuid4")
    recording_enabled = True


class PhoneLineFactory(DjangoModelFactory):
    class Meta:
        model = "calls.PhoneLine"

    provider = factory.SubFactory(TelephonyProviderFactory)
    phone_number = factory.Sequence(lambda n: f"+1555{n:07d}")
    friendly_name = factory.Sequence(lambda n: f"Line {n}")
    line_type = "both"
    is_active = True
    assigned_user = None
    voicemail_enabled = True
    ring_timeout = 30


class CallFactory(DjangoModelFactory):
    class Meta:
        model = "calls.Call"

    direction = "outbound"
    status = "completed"
    call_type = "regular"
    from_number = factory.Sequence(lambda n: f"+1555{n:07d}")
    to_number = factory.Sequence(lambda n: f"+1666{n:07d}")
    phone_line = factory.SubFactory(PhoneLineFactory)
    user = factory.SubFactory(UserFactory)
    contact = None
    corporation = None
    case = None
    duration = factory.Faker("random_int", min=30, max=600)
    subject = factory.Faker("sentence", nb_words=5)
    notes = factory.Faker("paragraph")


class CallQueueFactory(DjangoModelFactory):
    class Meta:
        model = "calls.CallQueue"

    name = factory.Sequence(lambda n: f"Queue {n}")
    description = factory.Faker("sentence")
    is_active = True
    strategy = "round_robin"
    timeout = 30
    max_wait_time = 300


class CallQueueMemberFactory(DjangoModelFactory):
    class Meta:
        model = "calls.CallQueueMember"

    queue = factory.SubFactory(CallQueueFactory)
    user = factory.SubFactory(UserFactory)
    priority = 0
    is_active = True
    is_available = True
    calls_taken = 0


class VoicemailFactory(DjangoModelFactory):
    class Meta:
        model = "calls.Voicemail"

    phone_line = factory.SubFactory(PhoneLineFactory)
    call = None
    caller_number = factory.Sequence(lambda n: f"+1777{n:07d}")
    caller_name = factory.Faker("name")
    audio_url = factory.Faker("url")
    duration = factory.Faker("random_int", min=10, max=120)
    transcription = factory.Faker("paragraph")
    status = "new"
    contact = None


class CallScriptFactory(DjangoModelFactory):
    class Meta:
        model = "calls.CallScript"

    name = factory.Sequence(lambda n: f"Script {n}")
    script_type = "sales"
    description = factory.Faker("sentence")
    is_active = True
    content = factory.Faker("paragraph", nb_sentences=5)
    sections = factory.LazyFunction(list)
    times_used = 0
    avg_success_rate = 0.0
    created_by = factory.SubFactory(UserFactory)


# ---------------------------------------------------------------------------
# Chatbot models
# ---------------------------------------------------------------------------


class ChatbotConfigurationFactory(DjangoModelFactory):
    class Meta:
        model = "chatbot.ChatbotConfiguration"
        django_get_or_create = ("id",)

    id = factory.LazyFunction(
        lambda: __import__("uuid").UUID("00000000-0000-4000-8000-000000000002")
    )
    ai_provider = "openai"
    api_key = ""
    model_name = "gpt-4o-mini"
    temperature = 0.7
    max_tokens = 1000
    system_prompt = "You are a helpful assistant."
    company_name = "Test Company"
    welcome_message = "Hello! How can I help you today?"
    is_active = True
    allow_appointments = True
    handoff_enabled = True


class ChatbotKnowledgeEntryFactory(DjangoModelFactory):
    class Meta:
        model = "chatbot.ChatbotKnowledgeEntry"

    configuration = factory.SubFactory(ChatbotConfigurationFactory)
    entry_type = "faq"
    title = factory.Sequence(lambda n: f"FAQ {n}")
    content = factory.Faker("paragraph")
    keywords = "tax, help, question"
    priority = 0
    is_active = True


class ChatbotConversationFactory(DjangoModelFactory):
    class Meta:
        model = "chatbot.ChatbotConversation"

    contact = factory.SubFactory(ContactFactory)
    status = "active"
    fallback_count = 0
    assigned_staff = None


class ChatbotMessageFactory(DjangoModelFactory):
    class Meta:
        model = "chatbot.ChatbotMessage"

    conversation = factory.SubFactory(ChatbotConversationFactory)
    role = "user"
    message_type = "text"
    content = factory.Faker("sentence")
    metadata = factory.LazyFunction(dict)
    tokens_used = 0


class ChatbotAppointmentSlotFactory(DjangoModelFactory):
    class Meta:
        model = "chatbot.ChatbotAppointmentSlot"

    day_of_week = 0  # Monday
    start_time = factory.LazyFunction(lambda: __import__("datetime").time(9, 0))
    end_time = factory.LazyFunction(lambda: __import__("datetime").time(17, 0))
    slot_duration_minutes = 30
    max_appointments = 1
    is_active = True
    assigned_staff = None


# ---------------------------------------------------------------------------
# Knowledge Base models
# ---------------------------------------------------------------------------


class KBCategoryFactory(DjangoModelFactory):
    class Meta:
        model = "knowledge_base.Category"

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-"))
    description = factory.Faker("sentence")
    icon = "book"
    color = "#3b82f6"
    parent = None
    order = factory.Sequence(lambda n: n)
    is_active = True
    is_public = True


class KBArticleFactory(DjangoModelFactory):
    class Meta:
        model = "knowledge_base.Article"

    title = factory.Sequence(lambda n: f"Article {n}")
    slug = factory.LazyAttribute(lambda obj: obj.title.lower().replace(" ", "-"))
    summary = factory.Faker("sentence")
    content = factory.Faker("paragraph", nb_sentences=5)
    category = factory.SubFactory(KBCategoryFactory)
    status = "published"
    visibility = "public"
    author = factory.SubFactory(UserFactory)
    tags = factory.LazyFunction(list)
    keywords = "help, guide"
    view_count = 0
    helpful_count = 0
    not_helpful_count = 0
    is_featured = False
    is_pinned = False


class KBFAQFactory(DjangoModelFactory):
    class Meta:
        model = "knowledge_base.FAQ"

    question = factory.Sequence(lambda n: f"Question {n}?")
    answer = factory.Faker("paragraph")
    category = factory.SubFactory(KBCategoryFactory)
    order = factory.Sequence(lambda n: n)
    is_active = True
    is_public = True
    view_count = 0
    created_by = factory.SubFactory(UserFactory)
