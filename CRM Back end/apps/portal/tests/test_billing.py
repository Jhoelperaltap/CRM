"""
Tests for the billing portal API.
"""

from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.inventory.models import (
    TenantInvoice,
    TenantInvoiceLineItem,
    TenantProduct,
    TenantQuote,
    TenantService,
)
from apps.portal.models import BillingPortalAccess, ClientPortalAccess
from tests.factories import ContactFactory, CorporationFactory


def create_portal_access(contact, password="PortalPass123!"):
    """Helper to create portal access for a contact."""
    from django.contrib.auth.hashers import make_password

    return ClientPortalAccess.objects.create(
        contact=contact,
        email=contact.email,
        password_hash=make_password(password),
        is_active=True,
    )


@pytest.fixture
def corporation():
    """Create a corporation for testing."""
    return CorporationFactory(
        name="Test Corp",
        billing_street="123 Main St",
        billing_city="New York",
        billing_state="NY",
        billing_zip="10001",
    )


@pytest.fixture
def portal_access(corporation):
    """Create a portal access with billing access."""
    contact = ContactFactory(corporation=corporation)
    access = create_portal_access(contact)
    BillingPortalAccess.objects.create(
        portal_access=access,
        tenant=corporation,
        can_manage_products=True,
        can_manage_services=True,
        can_create_invoices=True,
        can_create_quotes=True,
        can_view_reports=True,
        is_active=True,
    )
    return access


@pytest.fixture
def portal_client(portal_access):
    """Client with portal authentication."""
    from rest_framework.test import APIClient

    from apps.portal.auth import create_portal_tokens

    client = APIClient()
    tokens = create_portal_tokens(portal_access)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return client


@pytest.fixture
def tenant_product(corporation):
    """Create a tenant product."""
    return TenantProduct.objects.create(
        tenant=corporation,
        name="Test Product",
        product_code="PROD-001",
        unit_price=Decimal("99.99"),
        unit="Units",
        qty_in_stock=100,
        is_active=True,
    )


@pytest.fixture
def tenant_service(corporation):
    """Create a tenant service."""
    return TenantService.objects.create(
        tenant=corporation,
        name="Consulting Service",
        service_code="SVC-001",
        unit_price=Decimal("150.00"),
        usage_unit="Hours",
        is_active=True,
    )


@pytest.mark.django_db
class TestBillingDashboard:
    """Tests for the billing dashboard endpoint."""

    def test_get_dashboard(self, portal_client, corporation):
        """Test getting dashboard metrics."""
        url = reverse("billing-dashboard")
        response = portal_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "total_revenue" in response.data
        assert "pending_invoices_count" in response.data
        assert "products_count" in response.data
        assert "tenant" in response.data
        assert response.data["tenant"]["name"] == corporation.name


@pytest.mark.django_db
class TestTenantProducts:
    """Tests for tenant product endpoints."""

    def test_list_products(self, portal_client, tenant_product):
        """Test listing products."""
        url = reverse("billing-product-list")
        response = portal_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response is paginated
        assert response.data["count"] == 1
        assert response.data["results"][0]["product_code"] == "PROD-001"

    def test_create_product(self, portal_client, corporation):
        """Test creating a product."""
        url = reverse("billing-product-list")
        data = {
            "name": "New Product",
            "product_code": "PROD-002",
            "unit_price": "49.99",
            "unit": "Pieces",
        }
        response = portal_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["product_code"] == "PROD-002"
        assert TenantProduct.objects.filter(tenant=corporation).count() == 1

    def test_update_product(self, portal_client, tenant_product):
        """Test updating a product."""
        url = reverse("billing-product-detail", args=[tenant_product.id])
        data = {"name": "Updated Product"}
        response = portal_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK, response.data
        tenant_product.refresh_from_db()
        assert tenant_product.name == "Updated Product"

    def test_delete_product(self, portal_client, tenant_product):
        """Test deleting a product."""
        url = reverse("billing-product-detail", args=[tenant_product.id])
        response = portal_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not TenantProduct.objects.filter(id=tenant_product.id).exists()


@pytest.mark.django_db
class TestTenantServices:
    """Tests for tenant service endpoints."""

    def test_list_services(self, portal_client, tenant_service):
        """Test listing services."""
        url = reverse("billing-service-list")
        response = portal_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response is paginated
        assert response.data["count"] == 1
        assert response.data["results"][0]["service_code"] == "SVC-001"

    def test_create_service(self, portal_client, corporation):
        """Test creating a service."""
        url = reverse("billing-service-list")
        data = {
            "name": "Design Service",
            "service_code": "SVC-002",
            "unit_price": "200.00",
            "usage_unit": "Hours",
        }
        response = portal_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["service_code"] == "SVC-002"


@pytest.mark.django_db
class TestTenantInvoices:
    """Tests for tenant invoice endpoints."""

    def test_create_invoice(self, portal_client, corporation, tenant_product):
        """Test creating an invoice with line items."""
        url = reverse("billing-invoice-list")
        data = {
            "invoice_number": "INV-0001",
            "subject": "Test Invoice",
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "invoice_date": date.today().isoformat(),
            "tax_percent": "8.00",
            "line_items": [
                {
                    "product": str(tenant_product.id),
                    "description": "Test product",
                    "quantity": 2,
                    "unit_price": "99.99",
                }
            ],
        }
        response = portal_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["invoice_number"] == "INV-0001"

        invoice = TenantInvoice.objects.get(invoice_number="INV-0001")
        assert invoice.tenant == corporation
        assert invoice.line_items.count() == 1

    def test_list_invoices(self, portal_client, corporation):
        """Test listing invoices."""
        TenantInvoice.objects.create(
            tenant=corporation,
            invoice_number="INV-0001",
            subject="Test",
            customer_name="John",
            invoice_date=date.today(),
        )

        url = reverse("billing-invoice-list")
        response = portal_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response is paginated
        assert response.data["count"] == 1

    def test_mark_invoice_paid(self, portal_client, corporation):
        """Test marking an invoice as paid."""
        invoice = TenantInvoice.objects.create(
            tenant=corporation,
            invoice_number="INV-0001",
            subject="Test",
            customer_name="John",
            invoice_date=date.today(),
            total=Decimal("100.00"),
            amount_due=Decimal("100.00"),
            status=TenantInvoice.Status.SENT,
        )

        url = reverse("billing-invoice-mark-paid", args=[invoice.id])
        response = portal_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        invoice.refresh_from_db()
        assert invoice.status == TenantInvoice.Status.PAID
        assert invoice.amount_due == Decimal("0.00")

    def test_next_invoice_number(self, portal_client, corporation):
        """Test getting next invoice number."""
        TenantInvoice.objects.create(
            tenant=corporation,
            invoice_number="INV-0005",
            subject="Test",
            customer_name="John",
            invoice_date=date.today(),
        )

        url = reverse("billing-invoice-next-number")
        response = portal_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["next_number"] == "INV0006"


@pytest.mark.django_db
class TestTenantQuotes:
    """Tests for tenant quote endpoints."""

    def test_create_quote(self, portal_client, corporation, tenant_service):
        """Test creating a quote."""
        url = reverse("billing-quote-list")
        data = {
            "quote_number": "QT-0001",
            "subject": "Test Quote",
            "customer_name": "Jane Doe",
            "quote_date": date.today().isoformat(),
            "valid_until": date.today().isoformat(),
            "line_items": [
                {
                    "service": str(tenant_service.id),
                    "description": "Consulting",
                    "quantity": 10,
                    "unit_price": "150.00",
                }
            ],
        }
        response = portal_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["quote_number"] == "QT-0001"

    def test_convert_quote_to_invoice(self, portal_client, corporation):
        """Test converting a quote to invoice."""
        quote = TenantQuote.objects.create(
            tenant=corporation,
            quote_number="QT-0001",
            subject="Test Quote",
            customer_name="Jane",
            customer_email="jane@example.com",
            quote_date=date.today(),
            subtotal=Decimal("1500.00"),
            total=Decimal("1500.00"),
        )

        url = reverse("billing-quote-convert", args=[quote.id])
        response = portal_client.post(url)

        assert response.status_code == status.HTTP_201_CREATED
        assert "invoice_id" in response.data

        quote.refresh_from_db()
        assert quote.status == TenantQuote.Status.CONVERTED
        assert quote.converted_invoice is not None


@pytest.mark.django_db
class TestBillingAccessPermissions:
    """Tests for billing access permissions."""

    def test_no_billing_access_denied(self, corporation):
        """Test that users without billing access are denied."""
        from rest_framework.test import APIClient

        from apps.portal.auth import create_portal_tokens

        contact = ContactFactory(corporation=corporation)
        access = create_portal_access(contact)
        # No BillingPortalAccess created

        client = APIClient()
        tokens = create_portal_tokens(access)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        url = reverse("billing-dashboard")
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_inactive_billing_access_denied(self, corporation):
        """Test that inactive billing access is denied."""
        from rest_framework.test import APIClient

        from apps.portal.auth import create_portal_tokens

        contact = ContactFactory(corporation=corporation)
        access = create_portal_access(contact)
        BillingPortalAccess.objects.create(
            portal_access=access,
            tenant=corporation,
            is_active=False,  # Inactive
        )

        client = APIClient()
        tokens = create_portal_tokens(access)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        url = reverse("billing-dashboard")
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTenantIsolation:
    """Tests for tenant data isolation."""

    def test_cannot_see_other_tenant_products(self, portal_client, corporation):
        """Test that products from other tenants are not visible."""
        other_corp = CorporationFactory(name="Other Corp")
        TenantProduct.objects.create(
            tenant=other_corp,
            name="Other Product",
            product_code="OTHER-001",
            unit_price=Decimal("50.00"),
        )
        TenantProduct.objects.create(
            tenant=corporation,
            name="My Product",
            product_code="MINE-001",
            unit_price=Decimal("100.00"),
        )

        url = reverse("billing-product-list")
        response = portal_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response is paginated
        assert response.data["count"] == 1
        assert response.data["results"][0]["product_code"] == "MINE-001"

    def test_unique_invoice_number_per_tenant(self, portal_client, corporation):
        """Test that invoice numbers are unique per tenant."""
        # Create invoice in another tenant with same number
        other_corp = CorporationFactory()
        TenantInvoice.objects.create(
            tenant=other_corp,
            invoice_number="INV-0001",
            subject="Other Invoice",
            customer_name="Other",
            invoice_date=date.today(),
        )

        # Should be able to create same number in our tenant
        url = reverse("billing-invoice-list")
        data = {
            "invoice_number": "INV-0001",
            "subject": "Our Invoice",
            "customer_name": "Our Customer",
            "invoice_date": date.today().isoformat(),
        }
        response = portal_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
