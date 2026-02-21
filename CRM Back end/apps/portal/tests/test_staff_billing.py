"""
Tests for staff billing access management endpoints.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.portal.models import BillingPortalAccess, ClientPortalAccess
from tests.factories import (
    ClientPortalAccessFactory,
    ContactFactory,
    CorporationFactory,
    UserFactory,
)


@pytest.fixture
def admin_user(admin_role):
    """Create an admin user."""
    return UserFactory(role=admin_role)


@pytest.fixture
def admin_client(admin_user):
    """APIClient authenticated as admin."""
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def corporation(db):
    """Create a corporation."""
    return CorporationFactory(name="Test Corporation")


@pytest.fixture
def contact_with_corp(corporation):
    """Create a contact linked to the corporation."""
    return ContactFactory(corporation=corporation)


@pytest.fixture
def portal_access(contact_with_corp):
    """Create portal access for a contact."""
    from django.contrib.auth.hashers import make_password

    return ClientPortalAccessFactory(
        contact=contact_with_corp,
        email=contact_with_corp.email,
        password_hash=make_password("TestPass123!"),
    )


@pytest.mark.django_db
class TestStaffBillingAccessViewSet:
    """Tests for StaffBillingAccessViewSet."""

    def test_list_billing_accesses(self, admin_client, portal_access, corporation):
        """Test listing all billing accesses."""
        # Create billing access
        BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse("staff-billing-access-list")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_create_billing_access(self, admin_client, portal_access, corporation):
        """Test creating billing access for a portal account."""
        url = reverse("staff-billing-access-list")
        data = {
            "portal_access": str(portal_access.id),
            "tenant": str(corporation.id),
            "can_manage_products": True,
            "can_manage_services": True,
            "can_create_invoices": True,
            "can_create_quotes": False,
            "can_view_reports": True,
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["can_create_quotes"] is False
        assert BillingPortalAccess.objects.filter(portal_access=portal_access).exists()

    def test_create_billing_access_duplicate_fails(
        self, admin_client, portal_access, corporation
    ):
        """Test that duplicate billing access creation fails."""
        BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse("staff-billing-access-list")
        data = {
            "portal_access": str(portal_access.id),
            "tenant": str(corporation.id),
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_billing_access_wrong_corporation_fails(
        self, admin_client, portal_access
    ):
        """Test that creating billing access with wrong corporation fails."""
        other_corp = CorporationFactory(name="Other Corp")

        url = reverse("staff-billing-access-list")
        data = {
            "portal_access": str(portal_access.id),
            "tenant": str(other_corp.id),
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tenant" in response.data

    def test_update_billing_access_permissions(
        self, admin_client, portal_access, corporation
    ):
        """Test updating billing access permissions."""
        billing_access = BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
            can_create_invoices=True,
        )

        url = reverse("staff-billing-access-detail", args=[billing_access.id])
        data = {
            "can_create_invoices": False,
            "can_view_reports": False,
        }
        response = admin_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        billing_access.refresh_from_db()
        assert billing_access.can_create_invoices is False
        assert billing_access.can_view_reports is False

    def test_delete_billing_access(self, admin_client, portal_access, corporation):
        """Test deleting billing access."""
        billing_access = BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse("staff-billing-access-detail", args=[billing_access.id])
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not BillingPortalAccess.objects.filter(id=billing_access.id).exists()

    def test_get_by_portal_access(self, admin_client, portal_access, corporation):
        """Test getting billing access by portal access ID."""
        BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse(
            "staff-billing-access-by-portal-access",
            args=[portal_access.id],
        )
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["tenant_name"] == corporation.name

    def test_get_by_tenant(self, admin_client, portal_access, corporation):
        """Test listing billing accesses by tenant."""
        BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse("staff-billing-access-by-tenant", args=[corporation.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


@pytest.mark.django_db
class TestStaffPortalAccessBillingActions:
    """Tests for billing actions on StaffPortalAccessViewSet."""

    def test_enable_billing_action(self, admin_client, portal_access, corporation):
        """Test enabling billing via action on portal access."""
        url = reverse("staff-portal-access-enable-billing", args=[portal_access.id])
        data = {
            "tenant": str(corporation.id),
            "can_manage_products": True,
            "can_create_invoices": False,
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["can_create_invoices"] is False
        assert BillingPortalAccess.objects.filter(portal_access=portal_access).exists()

    def test_enable_billing_already_enabled_fails(
        self, admin_client, portal_access, corporation
    ):
        """Test that enabling billing twice fails."""
        BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse("staff-portal-access-enable-billing", args=[portal_access.id])
        data = {"tenant": str(corporation.id)}
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_disable_billing_action(self, admin_client, portal_access, corporation):
        """Test disabling billing via action."""
        billing_access = BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
            is_active=True,
        )

        url = reverse("staff-portal-access-disable-billing", args=[portal_access.id])
        response = admin_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        billing_access.refresh_from_db()
        assert billing_access.is_active is False

    def test_retrieve_portal_access_includes_billing(
        self, admin_client, portal_access, corporation
    ):
        """Test that retrieving portal access includes billing info."""
        BillingPortalAccess.objects.create(
            portal_access=portal_access,
            tenant=corporation,
        )

        url = reverse("staff-portal-access-detail", args=[portal_access.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "billing_access" in response.data
        assert response.data["billing_access"] is not None
        assert response.data["billing_access"]["tenant_name"] == corporation.name

    def test_retrieve_portal_access_no_billing(self, admin_client, portal_access):
        """Test that portal access without billing returns null."""
        url = reverse("staff-portal-access-detail", args=[portal_access.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["billing_access"] is None


@pytest.mark.django_db
class TestStaffBillingAccessPermissions:
    """Tests for permission checks on staff billing endpoints."""

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated access is denied."""
        client = APIClient()
        url = reverse("staff-billing-access-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_admin_access_denied(self, preparer_user):
        """Test that non-admin users are denied."""
        client = APIClient()
        refresh = RefreshToken.for_user(preparer_user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        url = reverse("staff-billing-access-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
