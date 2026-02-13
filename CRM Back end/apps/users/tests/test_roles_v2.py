"""
Tests for the expanded RoleSlug choices added in v2.0.

Verifies that the four new slugs (CEO, SUPERVISOR, REVIEWER, INTERN) are
properly defined, can be used to create Role instances, and work correctly
with User relationships.
"""

import pytest

from apps.users.models import Role
from tests.factories import RoleFactory, UserFactory


@pytest.mark.django_db
class TestNewRoleSlugsExist:
    """Verify that the new RoleSlug enum values are present."""

    def test_new_role_slugs_exist(self):
        values = Role.RoleSlug.values
        assert "ceo" in values
        assert "supervisor" in values
        assert "reviewer" in values
        assert "intern" in values

    def test_original_slugs_still_exist(self):
        """Ensure the original slugs were not removed."""
        values = Role.RoleSlug.values
        assert "admin" in values
        assert "manager" in values
        assert "preparer" in values
        assert "receptionist" in values

    def test_total_slug_count(self):
        """All 17 slugs should be defined (original 4 + v2.0 additions + Vtiger CRM slugs)."""
        assert len(Role.RoleSlug.values) == 17


@pytest.mark.django_db
class TestCreateRoleWithNewSlugs:
    """Create a Role for each new slug and verify persistence."""

    @pytest.mark.parametrize(
        "slug,name",
        [
            ("ceo", "CEO"),
            ("supervisor", "Accounting Supervisor"),
            ("reviewer", "Tax Reviewer"),
            ("intern", "Intern"),
        ],
    )
    def test_create_role_with_new_slugs(self, slug, name):
        role = RoleFactory(name=name, slug=slug)
        role.refresh_from_db()
        assert role.slug == slug
        assert role.name == name
        assert Role.objects.filter(slug=slug).exists()

    def test_create_ceo_role(self):
        role = RoleFactory(name="CEO", slug="ceo")
        assert role.pk is not None
        assert role.slug == "ceo"

    def test_create_supervisor_role(self):
        role = RoleFactory(name="Accounting Supervisor", slug="supervisor")
        assert role.pk is not None
        assert role.slug == "supervisor"

    def test_create_reviewer_role(self):
        role = RoleFactory(name="Tax Reviewer", slug="reviewer")
        assert role.pk is not None
        assert role.slug == "reviewer"

    def test_create_intern_role(self):
        role = RoleFactory(name="Intern", slug="intern")
        assert role.pk is not None
        assert role.slug == "intern"


@pytest.mark.django_db
class TestUserWithNewRole:
    """Verify that a user can be assigned one of the new roles."""

    def test_user_with_ceo_role(self):
        ceo_role = RoleFactory(name="CEO", slug="ceo")
        user = UserFactory(role=ceo_role)
        user.refresh_from_db()
        assert user.role == ceo_role
        assert user.role.slug == "ceo"
        assert user.role_slug == "ceo"

    def test_user_with_supervisor_role(self):
        role = RoleFactory(name="Accounting Supervisor", slug="supervisor")
        user = UserFactory(role=role)
        assert user.role_slug == "supervisor"

    def test_user_with_reviewer_role(self):
        role = RoleFactory(name="Tax Reviewer", slug="reviewer")
        user = UserFactory(role=role)
        assert user.role_slug == "reviewer"

    def test_user_with_intern_role(self):
        role = RoleFactory(name="Intern", slug="intern")
        user = UserFactory(role=role)
        assert user.role_slug == "intern"

    def test_ceo_user_is_not_admin(self):
        """CEO role should not trigger is_admin (only 'admin' slug does)."""
        ceo_role = RoleFactory(name="CEO", slug="ceo")
        user = UserFactory(role=ceo_role)
        assert not user.is_admin

    def test_ceo_role_users_reverse_relation(self):
        """Verify the role.users reverse relation works for new roles."""
        ceo_role = RoleFactory(name="CEO", slug="ceo")
        user = UserFactory(role=ceo_role)
        assert user in ceo_role.users.all()


@pytest.mark.django_db
class TestRoleSlugLabels:
    """Verify human-readable labels for the new RoleSlug choices."""

    def test_ceo_label(self):
        assert Role.RoleSlug("ceo").label == "CEO"

    def test_supervisor_label(self):
        assert Role.RoleSlug("supervisor").label == "Accounting Supervisor"

    def test_reviewer_label(self):
        assert Role.RoleSlug("reviewer").label == "Tax Reviewer"

    def test_intern_label(self):
        assert Role.RoleSlug("intern").label == "Intern"

    def test_original_admin_label(self):
        assert Role.RoleSlug("admin").label == "Administrator"

    def test_original_manager_label(self):
        assert Role.RoleSlug("manager").label == "Manager"

    def test_original_preparer_label(self):
        assert Role.RoleSlug("preparer").label == "Tax Preparer"

    def test_original_receptionist_label(self):
        assert Role.RoleSlug("receptionist").label == "Receptionist"
