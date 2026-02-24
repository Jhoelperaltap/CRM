"""
Tests for backup-related API views.

Tests cover:
- GET /api/v1/ai-agent/backup/workload/
- POST /api/v1/ai-agent/backup/analyze/
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.ai_agent.models import AgentConfiguration
from apps.users.models import Role, User


@pytest.fixture
def api_client():
    """Create an API client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    admin_role, _ = Role.objects.get_or_create(
        slug=Role.RoleSlug.ADMIN,
        defaults={"name": "Admin", "description": "Administrator role"},
    )
    user = User.objects.create_user(
        email="admin@test.com",
        password="testpass123",
        first_name="Test",
        last_name="Admin",
        role=admin_role,
    )
    return user


@pytest.fixture
def regular_user(db):
    """Create a regular (non-admin) user for testing."""
    preparer_role, _ = Role.objects.get_or_create(
        slug=Role.RoleSlug.MARKETING_MANAGER,
        defaults={"name": "Marketing Manager", "description": "Marketing Manager role"},
    )
    user = User.objects.create_user(
        email="preparer@test.com",
        password="testpass123",
        first_name="Test",
        last_name="Preparer",
        role=preparer_role,
    )
    return user


@pytest.fixture
def config(db):
    """Get or create AgentConfiguration with auto backup enabled."""
    config = AgentConfiguration.get_config()
    config.is_active = True
    config.auto_backup_enabled = True
    config.save()
    return config


@pytest.mark.django_db
class TestBackupWorkloadView:
    """Tests for GET /api/v1/ai-agent/backup/workload/."""

    def test_get_workload_authenticated(self, api_client, admin_user, config):
        """Test that authenticated users can get workload metrics."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.get("/api/v1/ai-agent/backup/workload/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "metrics" in data
        assert "decision" in data
        assert "thresholds" in data
        assert "auto_backup_enabled" in data

        # Verify metrics structure
        metrics = data["metrics"]
        assert "contacts_created" in metrics
        assert "cases_created" in metrics
        assert "documents_created" in metrics
        assert "api_activity" in metrics
        assert "days_since_last_backup" in metrics

        # Verify decision structure
        decision = data["decision"]
        assert "should_backup" in decision
        assert "reason" in decision
        assert "thresholds_exceeded" in decision

    def test_get_workload_unauthenticated(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get("/api/v1/ai-agent/backup/workload/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_workload_regular_user(self, api_client, regular_user, config):
        """Test that regular users can view workload (read-only)."""
        api_client.force_authenticate(user=regular_user)

        response = api_client.get("/api/v1/ai-agent/backup/workload/")

        # Regular users should be able to view workload
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestRunBackupAnalysisView:
    """Tests for POST /api/v1/ai-agent/backup/analyze/."""

    def test_analyze_dry_run(self, api_client, admin_user, config):
        """Test backup analysis without creating backup (dry run)."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.post(
            "/api/v1/ai-agent/backup/analyze/",
            {"create_backup": False},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "analysis_complete"
        assert "metrics" in data
        assert "decision" in data
        assert "thresholds" in data

    def test_analyze_with_create_backup_true(self, api_client, admin_user, config):
        """Test that backup is created when create_backup=True."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.post(
            "/api/v1/ai-agent/backup/analyze/",
            {"create_backup": True},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "backup_created"
        assert "action_id" in data
        assert "backup_id" in data
        assert "metrics" in data
        assert "decision" in data

    def test_analyze_unauthenticated(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.post(
            "/api/v1/ai-agent/backup/analyze/",
            {"create_backup": False},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analyze_regular_user_forbidden(self, api_client, regular_user, config):
        """Test that regular users cannot run backup analysis."""
        api_client.force_authenticate(user=regular_user)

        response = api_client.post(
            "/api/v1/ai-agent/backup/analyze/",
            {"create_backup": False},
            format="json",
        )

        # Only admins should be able to run analysis
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_analyze_default_no_create(self, api_client, admin_user, config):
        """Test that default behavior is dry run (no backup creation)."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.post(
            "/api/v1/ai-agent/backup/analyze/",
            {},  # No create_backup specified
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should not create backup by default (analysis only)
        assert data["status"] == "analysis_complete"
