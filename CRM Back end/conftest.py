"""
Root-level pytest fixtures shared across the entire CRM backend test suite.

These fixtures provide pre-built roles, users and authenticated API clients
so that individual test modules can focus on the behaviour they are verifying
rather than repeating setup boilerplate.
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import (
    AuthenticationPolicyFactory,
    ChecklistTemplateFactory,
    ChecklistTemplateItemFactory,
    ClientPortalAccessFactory,
    ContactFactory,
    DepartmentClientFolderFactory,
    DepartmentFactory,
    DocumentAccessLogFactory,
    DocumentFactory,
    EmailAccountFactory,
    ModulePermissionFactory,
    RoleFactory,
    TaskFactory,
    TaxCaseFactory,
    UserFactory,
    UserGroupFactory,
    WorkflowRuleFactory,
)


@pytest.fixture
def api_client():
    """Unauthenticated DRF APIClient."""
    return APIClient()


@pytest.fixture
def admin_role(db):
    """Admin role with full permissions on all modules."""
    role = RoleFactory(name="Administrator", slug="admin", level=0, department="Administration")
    modules = [
        "contacts",
        "corporations",
        "cases",
        "dashboard",
        "users",
        "audit",
        "appointments",
        "documents",
        "tasks",
        "emails",
    ]
    for module in modules:
        ModulePermissionFactory(
            role=role,
            module=module,
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=True,
            can_export=True,
            can_import=True,
        )
    return role


@pytest.fixture
def preparer_role(manager_role, db):
    """Preparer role with standard CRM permissions, child of manager."""
    role = RoleFactory(name="Tax Preparer", slug="preparer", parent=manager_role, level=2)
    for module in [
        "contacts",
        "corporations",
        "cases",
        "appointments",
        "documents",
        "tasks",
        "emails",
    ]:
        ModulePermissionFactory(
            role=role,
            module=module,
            can_view=True,
            can_create=True,
            can_edit=True,
            can_delete=False,
        )
    ModulePermissionFactory(role=role, module="dashboard", can_view=True)
    return role


@pytest.fixture
def admin_user(admin_role):
    """User with admin role."""
    return UserFactory(role=admin_role)


@pytest.fixture
def preparer_user(preparer_role):
    """User with preparer role."""
    return UserFactory(role=preparer_role)


@pytest.fixture
def authenticated_client(preparer_user):
    """APIClient authenticated as a preparer user."""
    client = APIClient()
    refresh = RefreshToken.for_user(preparer_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def admin_client(admin_user):
    """APIClient authenticated as an admin user."""
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ---------------------------------------------------------------------------
# Stage 2 fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def manager_role(admin_role, db):
    """Manager role, child of admin."""
    return RoleFactory(
        name="Manager", slug="manager", parent=admin_role,
        level=1, department="Management",
    )


@pytest.fixture
def receptionist_role(manager_role, db):
    """Receptionist role, child of manager."""
    return RoleFactory(
        name="Receptionist", slug="receptionist", parent=manager_role,
        level=2, department="Front Desk",
    )


@pytest.fixture
def test_group(db):
    """A sample user group."""
    return UserGroupFactory(name="Tax Team", description="Main tax preparation team")


@pytest.fixture
def auth_policy(db):
    """The singleton authentication policy."""
    return AuthenticationPolicyFactory()


# ---------------------------------------------------------------------------
# Stage 3 fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def email_account(db):
    """A default email account for testing."""
    return EmailAccountFactory(name="Office", email_address="office@example.com")


# ---------------------------------------------------------------------------
# Stage 4 fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def workflow_rule(admin_user, db):
    """A sample workflow rule for testing."""
    return WorkflowRuleFactory(
        name="Status Change Notify",
        trigger_type="case_status_changed",
        trigger_config={"from_status": "new", "to_status": "in_progress"},
        action_type="send_notification",
        action_config={"title": "Case started", "severity": "info", "recipient": "preparer"},
        created_by=admin_user,
    )


@pytest.fixture
def checklist_template(admin_user, db):
    """A checklist template with items for testing."""
    template = ChecklistTemplateFactory(
        name="Individual 1040 Checklist",
        case_type="individual_1040",
        tax_year=None,
        created_by=admin_user,
    )
    ChecklistTemplateItemFactory(template=template, title="W-2 Forms", doc_type="w2", sort_order=0)
    ChecklistTemplateItemFactory(template=template, title="1099 Forms", doc_type="1099", sort_order=1)
    ChecklistTemplateItemFactory(template=template, title="Photo ID", doc_type="id_document", sort_order=2)
    return template


# ---------------------------------------------------------------------------
# Stage 5 fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def portal_contact(db):
    """A contact for portal testing."""
    return ContactFactory(email="client@example.com")


@pytest.fixture
def portal_client_access(portal_contact, db):
    """A ClientPortalAccess record for testing."""
    from django.contrib.auth.hashers import make_password

    return ClientPortalAccessFactory(
        contact=portal_contact,
        email=portal_contact.email,
        password_hash=make_password("PortalPass123!"),
    )


@pytest.fixture
def portal_authenticated_client(portal_client_access):
    """APIClient authenticated with a portal JWT."""
    from apps.portal.auth import create_portal_tokens

    client = APIClient()
    tokens = create_portal_tokens(portal_client_access)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


# ---------------------------------------------------------------------------
# Stage 6 fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user_with_2fa(admin_role, db):
    """User with 2FA fully enabled and raw recovery codes attached."""
    from apps.users.totp import (
        generate_recovery_codes,
        generate_totp_secret,
        hash_recovery_code,
    )

    user = UserFactory(role=admin_role)
    secret = generate_totp_secret()
    raw_codes = generate_recovery_codes(count=4)
    hashed_codes = [hash_recovery_code(c) for c in raw_codes]
    user.totp_secret = secret
    user.is_2fa_enabled = True
    user.recovery_codes = hashed_codes
    user.save()
    user._raw_recovery_codes = raw_codes
    return user


# ---------------------------------------------------------------------------
# Department fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def department(db):
    """A sample department for testing."""
    return DepartmentFactory(name="Accounting", code="ACCT")


@pytest.fixture
def department_folder(department, db):
    """A sample department client folder for testing."""
    contact = ContactFactory()
    return DepartmentClientFolderFactory(
        name="Tax Documents",
        department=department,
        contact=contact,
    )
