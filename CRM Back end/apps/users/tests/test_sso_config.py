"""
Tests for the SSO configuration fields on the AuthenticationPolicy singleton.

Verifies that the SSO fields (sso_enabled, sso_provider, sso_entity_id,
sso_login_url, sso_certificate) are present, default correctly, are
exposed through the API, and respect admin-only access.
"""

import pytest
from rest_framework import status

from apps.users.models import AuthenticationPolicy
from tests.factories import AuthenticationPolicyFactory

BASE = "/api/v1/settings/auth-policy/"


@pytest.mark.django_db
class TestAuthPolicyHasSSOFields:
    """Verify SSO fields exist on the model with correct defaults."""

    def test_auth_policy_has_sso_fields(self):
        policy = AuthenticationPolicyFactory()
        assert policy.sso_enabled is False
        assert policy.sso_provider == ""
        assert policy.sso_entity_id == ""
        assert policy.sso_login_url == ""
        assert policy.sso_certificate == ""

    def test_sso_enabled_defaults_false(self):
        policy = AuthenticationPolicy.load()
        assert policy.sso_enabled is False

    def test_sso_fields_are_blank_by_default(self):
        policy = AuthenticationPolicy.load()
        assert policy.sso_provider == ""
        assert policy.sso_entity_id == ""
        assert policy.sso_login_url == ""
        assert policy.sso_certificate == ""

    def test_sso_fields_can_be_set(self):
        policy = AuthenticationPolicyFactory()
        policy.sso_enabled = True
        policy.sso_provider = "saml"
        policy.sso_entity_id = "https://idp.example.com/entity"
        policy.sso_login_url = "https://idp.example.com/sso/login"
        policy.sso_certificate = "MIIBkTCB+wIJALRiMLAh..."
        policy.save()

        policy.refresh_from_db()
        assert policy.sso_enabled is True
        assert policy.sso_provider == "saml"
        assert policy.sso_entity_id == "https://idp.example.com/entity"
        assert policy.sso_login_url == "https://idp.example.com/sso/login"
        assert policy.sso_certificate == "MIIBkTCB+wIJALRiMLAh..."


@pytest.mark.django_db
class TestUpdateSSOConfigViaAPI:
    """Test PATCH to update SSO configuration through the API."""

    def test_update_sso_config_via_api(self, admin_client, auth_policy):
        resp = admin_client.patch(
            BASE,
            {
                "sso_enabled": True,
                "sso_provider": "saml",
                "sso_entity_id": "https://idp.example.com/entity",
                "sso_login_url": "https://idp.example.com/sso/login",
                "sso_certificate": "MIIC8DCCAdigAwIBAgIQc...",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["sso_enabled"] is True
        assert resp.data["sso_provider"] == "saml"
        assert resp.data["sso_entity_id"] == "https://idp.example.com/entity"
        assert resp.data["sso_login_url"] == "https://idp.example.com/sso/login"
        assert resp.data["sso_certificate"] == "MIIC8DCCAdigAwIBAgIQc..."

    def test_update_sso_partial_fields(self, admin_client, auth_policy):
        """PATCH only sso_enabled without touching other SSO fields."""
        resp = admin_client.patch(
            BASE,
            {"sso_enabled": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["sso_enabled"] is True
        # Other SSO fields should remain at defaults
        assert resp.data["sso_provider"] == ""

    def test_update_sso_provider_oauth2(self, admin_client, auth_policy):
        """Verify oauth2 provider works as well."""
        resp = admin_client.patch(
            BASE,
            {
                "sso_enabled": True,
                "sso_provider": "oauth2",
                "sso_login_url": "https://auth.example.com/oauth2/authorize",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["sso_provider"] == "oauth2"

    def test_disable_sso_after_enabling(self, admin_client, auth_policy):
        """Enable then disable SSO; fields persist but sso_enabled is False."""
        admin_client.patch(
            BASE,
            {
                "sso_enabled": True,
                "sso_provider": "saml",
                "sso_login_url": "https://idp.example.com/sso/login",
            },
            format="json",
        )
        resp = admin_client.patch(
            BASE,
            {"sso_enabled": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["sso_enabled"] is False
        # Provider info should still be saved
        assert resp.data["sso_provider"] == "saml"


@pytest.mark.django_db
class TestSSOFieldsInAPIResponse:
    """Verify the SSO fields appear in the GET response."""

    def test_sso_fields_in_api_response(self, admin_client, auth_policy):
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert "sso_enabled" in resp.data
        assert "sso_provider" in resp.data
        assert "sso_entity_id" in resp.data
        assert "sso_login_url" in resp.data
        assert "sso_certificate" in resp.data

    def test_sso_defaults_in_get_response(self, admin_client, auth_policy):
        resp = admin_client.get(BASE)
        assert resp.data["sso_enabled"] is False
        assert resp.data["sso_provider"] == ""
        assert resp.data["sso_entity_id"] == ""
        assert resp.data["sso_login_url"] == ""
        assert resp.data["sso_certificate"] == ""


@pytest.mark.django_db
class TestNonAdminCannotUpdateSSO:
    """Verify preparer users cannot access or modify SSO settings."""

    def test_non_admin_cannot_update_sso(self, authenticated_client, auth_policy):
        resp = authenticated_client.patch(
            BASE,
            {"sso_enabled": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_non_admin_cannot_read_sso(self, authenticated_client, auth_policy):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
