"""
Tests for PDF generation service.
"""

from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth.hashers import make_password

from apps.inventory.models import (
    TenantInvoice,
    TenantInvoiceLineItem,
    TenantProduct,
    TenantQuote,
    TenantQuoteLineItem,
    TenantService,
)
from apps.portal.models import BillingPortalAccess, ClientPortalAccess
from apps.portal.services.pdf_generator import generate_invoice_pdf, generate_quote_pdf
from tests.factories import ContactFactory, CorporationFactory


@pytest.fixture
def corporation(db):
    """Create a corporation with billing info."""
    return CorporationFactory(
        name="Test Corporation",
        phone="555-123-4567",
        email="billing@testcorp.com",
        billing_street="123 Main St",
        billing_city="Anytown",
        billing_state="CA",
        billing_zip="90210",
        billing_country="United States",
    )


@pytest.fixture
def contact(corporation):
    """Create a contact linked to the corporation."""
    return ContactFactory(corporation=corporation)


@pytest.fixture
def portal_access(contact):
    """Create portal access for the contact."""
    return ClientPortalAccess.objects.create(
        contact=contact,
        email=contact.email,
        password_hash=make_password("TestPass123!"),
    )


@pytest.fixture
def billing_access(portal_access, corporation):
    """Create billing access for the portal user."""
    return BillingPortalAccess.objects.create(
        portal_access=portal_access,
        tenant=corporation,
    )


@pytest.fixture
def product(corporation):
    """Create a tenant product."""
    return TenantProduct.objects.create(
        tenant=corporation,
        name="Test Product",
        product_code="PROD-001",
        unit_price=Decimal("99.99"),
        unit="Units",
    )


@pytest.fixture
def service(corporation):
    """Create a tenant service."""
    return TenantService.objects.create(
        tenant=corporation,
        name="Test Service",
        service_code="SVC-001",
        unit_price=Decimal("150.00"),
        usage_unit="Hours",
    )


@pytest.fixture
def invoice(corporation, product, service):
    """Create a tenant invoice with line items."""
    invoice = TenantInvoice.objects.create(
        tenant=corporation,
        invoice_number="INV-0001",
        subject="Test Invoice",
        status=TenantInvoice.Status.DRAFT,
        customer_name="John Doe",
        customer_email="john@example.com",
        customer_phone="555-987-6543",
        customer_address="456 Oak Ave\nSuite 100\nAnother City, NY 10001",
        invoice_date=date.today(),
        due_date=date.today(),
        tax_percent=Decimal("8.25"),
        discount_amount=Decimal("10.00"),
        notes="Thank you for your business!",
        terms_conditions="Payment due within 30 days.",
    )

    # Add line items
    TenantInvoiceLineItem.objects.create(
        invoice=invoice,
        product=product,
        description="Test Product Item",
        quantity=Decimal("2"),
        unit_price=Decimal("99.99"),
        discount_percent=Decimal("0"),
        sort_order=1,
    )
    TenantInvoiceLineItem.objects.create(
        invoice=invoice,
        service=service,
        description="Test Service Item",
        quantity=Decimal("3"),
        unit_price=Decimal("150.00"),
        discount_percent=Decimal("5"),
        sort_order=2,
    )

    # Calculate totals
    invoice.calculate_totals()
    invoice.save()

    return invoice


@pytest.fixture
def quote(corporation, product, service):
    """Create a tenant quote with line items."""
    quote = TenantQuote.objects.create(
        tenant=corporation,
        quote_number="QT-0001",
        subject="Test Quote",
        status=TenantQuote.Status.DRAFT,
        customer_name="Jane Smith",
        customer_email="jane@example.com",
        customer_phone="555-111-2222",
        customer_address="789 Pine St\nTown, CA 94000",
        quote_date=date.today(),
        valid_until=date.today(),
        tax_percent=Decimal("8.25"),
        discount_amount=Decimal("25.00"),
        notes="This quote is valid for 30 days.",
        terms_conditions="50% deposit required to begin work.",
    )

    # Add line items
    TenantQuoteLineItem.objects.create(
        quote=quote,
        product=product,
        description="Quoted Product",
        quantity=Decimal("5"),
        unit_price=Decimal("99.99"),
        discount_percent=Decimal("10"),
        sort_order=1,
    )
    TenantQuoteLineItem.objects.create(
        quote=quote,
        service=service,
        description="Quoted Service",
        quantity=Decimal("10"),
        unit_price=Decimal("150.00"),
        discount_percent=Decimal("0"),
        sort_order=2,
    )

    # Calculate totals
    quote.calculate_totals()
    quote.save()

    return quote


@pytest.mark.django_db
class TestInvoicePdfGeneration:
    """Tests for invoice PDF generation."""

    def test_generate_invoice_pdf_returns_bytes(self, invoice):
        """Test that generate_invoice_pdf returns bytes."""
        pdf_content = generate_invoice_pdf(invoice)

        assert isinstance(pdf_content, bytes)
        assert len(pdf_content) > 0

    def test_generate_invoice_pdf_starts_with_pdf_header(self, invoice):
        """Test that the generated PDF has valid PDF header."""
        pdf_content = generate_invoice_pdf(invoice)

        # PDF files start with %PDF-
        assert pdf_content[:5] == b"%PDF-"

    def test_generate_invoice_pdf_is_valid_pdf_size(self, invoice):
        """Test that the generated PDF has reasonable size."""
        pdf_content = generate_invoice_pdf(invoice)

        # A valid invoice PDF should be at least 1KB
        assert len(pdf_content) > 1000
        # But not excessively large (should be under 500KB without images)
        assert len(pdf_content) < 500000

    def test_generate_invoice_pdf_with_no_line_items(self, corporation):
        """Test generating PDF for invoice with no line items."""
        invoice = TenantInvoice.objects.create(
            tenant=corporation,
            invoice_number="INV-EMPTY",
            subject="Empty Invoice",
            customer_name="Empty Customer",
            invoice_date=date.today(),
        )

        pdf_content = generate_invoice_pdf(invoice)

        assert isinstance(pdf_content, bytes)
        assert len(pdf_content) > 0

    def test_generate_invoice_pdf_with_partial_payment(self, invoice):
        """Test generating PDF for partially paid invoice."""
        invoice.amount_paid = Decimal("100.00")
        invoice.amount_due = invoice.total - invoice.amount_paid
        invoice.status = TenantInvoice.Status.PARTIAL
        invoice.save()

        pdf_content = generate_invoice_pdf(invoice)

        assert isinstance(pdf_content, bytes)
        assert len(pdf_content) > 0


@pytest.mark.django_db
class TestQuotePdfGeneration:
    """Tests for quote PDF generation."""

    def test_generate_quote_pdf_returns_bytes(self, quote):
        """Test that generate_quote_pdf returns bytes."""
        pdf_content = generate_quote_pdf(quote)

        assert isinstance(pdf_content, bytes)
        assert len(pdf_content) > 0

    def test_generate_quote_pdf_starts_with_pdf_header(self, quote):
        """Test that the generated PDF has valid PDF header."""
        pdf_content = generate_quote_pdf(quote)

        # PDF files start with %PDF-
        assert pdf_content[:5] == b"%PDF-"

    def test_generate_quote_pdf_is_valid_pdf_size(self, quote):
        """Test that the generated PDF has reasonable size."""
        pdf_content = generate_quote_pdf(quote)

        # A valid quote PDF should be at least 1KB
        assert len(pdf_content) > 1000
        # But not excessively large (should be under 500KB without images)
        assert len(pdf_content) < 500000

    def test_generate_quote_pdf_with_no_line_items(self, corporation):
        """Test generating PDF for quote with no line items."""
        quote = TenantQuote.objects.create(
            tenant=corporation,
            quote_number="QT-EMPTY",
            subject="Empty Quote",
            customer_name="Empty Customer",
            quote_date=date.today(),
        )

        pdf_content = generate_quote_pdf(quote)

        assert isinstance(pdf_content, bytes)
        assert len(pdf_content) > 0

    def test_generate_quote_pdf_without_valid_until(self, quote):
        """Test generating PDF for quote without valid_until date."""
        quote.valid_until = None
        quote.save()

        pdf_content = generate_quote_pdf(quote)

        assert isinstance(pdf_content, bytes)
        assert len(pdf_content) > 0


@pytest.mark.django_db
class TestPdfEndpoints:
    """Tests for PDF download endpoints."""

    def test_invoice_pdf_endpoint_returns_pdf(
        self, client, portal_access, billing_access, invoice
    ):
        """Test that the invoice PDF endpoint returns a PDF file."""
        from apps.portal.views import create_portal_tokens

        tokens = create_portal_tokens(portal_access)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {tokens['access']}"

        response = client.get(f"/api/v1/portal/billing/invoices/{invoice.id}/pdf/")

        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert "attachment" in response["Content-Disposition"]
        assert f"invoice_{invoice.invoice_number}.pdf" in response["Content-Disposition"]

    def test_quote_pdf_endpoint_returns_pdf(
        self, client, portal_access, billing_access, quote
    ):
        """Test that the quote PDF endpoint returns a PDF file."""
        from apps.portal.views import create_portal_tokens

        tokens = create_portal_tokens(portal_access)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {tokens['access']}"

        response = client.get(f"/api/v1/portal/billing/quotes/{quote.id}/pdf/")

        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert "attachment" in response["Content-Disposition"]
        assert f"quote_{quote.quote_number}.pdf" in response["Content-Disposition"]

    def test_invoice_pdf_requires_authentication(self, client, invoice):
        """Test that the invoice PDF endpoint requires authentication."""
        response = client.get(f"/api/v1/portal/billing/invoices/{invoice.id}/pdf/")

        # Should be denied (401 or 403)
        assert response.status_code in (401, 403)

    def test_quote_pdf_requires_authentication(self, client, quote):
        """Test that the quote PDF endpoint requires authentication."""
        response = client.get(f"/api/v1/portal/billing/quotes/{quote.id}/pdf/")

        # Should be denied (401 or 403)
        assert response.status_code in (401, 403)
