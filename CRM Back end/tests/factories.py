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
    username = factory.LazyAttribute(
        lambda obj: f"{obj.first_name.lower()}.{obj.last_name.lower()}"
    )
    email = factory.LazyAttribute(
        lambda obj: f"{obj.first_name.lower()}.{obj.last_name.lower()}@example.com"
    )
    phone = factory.Faker("phone_number")
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
    phone = factory.Faker("phone_number")
    mobile = factory.Faker("phone_number")
    status = "active"
    corporation = None
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
    phone = factory.Faker("phone_number")
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
    body_text = "Dear {{contact_name}},\n\nYour case {{case_number}} is ready.\n\nBest regards"
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
        lambda: __import__("django.contrib.auth.hashers", fromlist=["make_password"]).make_password("PortalPass123!")
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
