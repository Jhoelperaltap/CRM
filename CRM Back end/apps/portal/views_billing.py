"""
Views for the billing portal API.
"""

from datetime import date
from decimal import Decimal

from django.db.models import Q, Sum
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import (
    TenantInvoice,
    TenantInvoiceLineItem,
    TenantProduct,
    TenantQuote,
    TenantService,
)
from apps.portal.permissions import (
    CanCreateInvoices,
    CanCreateQuotes,
    CanManageProducts,
    CanManageServices,
    CanViewReports,
    HasBillingPortalAccess,
    IsPortalAuthenticated,
)
from apps.portal.serializers_billing import (
    BillingDashboardSerializer,
    TenantInvoiceCreateSerializer,
    TenantInvoiceListSerializer,
    TenantInvoiceSerializer,
    TenantProductListSerializer,
    TenantProductSerializer,
    TenantQuoteCreateSerializer,
    TenantQuoteListSerializer,
    TenantQuoteSerializer,
    TenantServiceListSerializer,
    TenantServiceSerializer,
)

# ---------------------------------------------------------------------------
# Dashboard View
# ---------------------------------------------------------------------------


class PortalBillingDashboardView(APIView):
    """
    GET /api/v1/portal/billing/dashboard/

    Returns billing metrics for the tenant:
    - Total revenue (all paid invoices)
    - Pending invoices count and amount
    - Overdue invoices count and amount
    - Revenue this month
    - Products and services count
    - Pending quotes count
    - Tenant info (name, logo)
    """

    authentication_classes = []
    permission_classes = [IsPortalAuthenticated, HasBillingPortalAccess, CanViewReports]

    def get(self, request):
        tenant = request.tenant
        today = date.today()
        first_of_month = today.replace(day=1)

        # Total revenue (paid invoices)
        paid_invoices = TenantInvoice.objects.filter(
            tenant=tenant, status=TenantInvoice.Status.PAID
        )
        total_revenue = paid_invoices.aggregate(total=Sum("total"))["total"] or Decimal(
            "0.00"
        )

        # Pending invoices (sent but not paid)
        pending_invoices = TenantInvoice.objects.filter(
            tenant=tenant, status=TenantInvoice.Status.SENT
        )
        pending_count = pending_invoices.count()
        pending_amount = pending_invoices.aggregate(total=Sum("amount_due"))[
            "total"
        ] or Decimal("0.00")

        # Overdue invoices
        overdue_invoices = TenantInvoice.objects.filter(
            tenant=tenant, status=TenantInvoice.Status.OVERDUE
        )
        overdue_count = overdue_invoices.count()
        overdue_amount = overdue_invoices.aggregate(total=Sum("amount_due"))[
            "total"
        ] or Decimal("0.00")

        # Revenue this month (paid invoices this month)
        revenue_this_month = TenantInvoice.objects.filter(
            tenant=tenant,
            status=TenantInvoice.Status.PAID,
            invoice_date__gte=first_of_month,
        ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")

        # Products and services count
        products_count = TenantProduct.objects.filter(
            tenant=tenant, is_active=True
        ).count()
        services_count = TenantService.objects.filter(
            tenant=tenant, is_active=True
        ).count()

        # Pending quotes
        quotes_pending = TenantQuote.objects.filter(
            tenant=tenant,
            status__in=[TenantQuote.Status.DRAFT, TenantQuote.Status.SENT],
        ).count()

        # Build tenant info
        tenant_info = {
            "id": str(tenant.id),
            "name": tenant.name,
            "logo_url": tenant.image.url if tenant.image else None,
            "billing_address": {
                "street": tenant.billing_street,
                "city": tenant.billing_city,
                "state": tenant.billing_state,
                "zip": tenant.billing_zip,
                "country": tenant.billing_country,
            },
        }

        data = {
            "total_revenue": total_revenue,
            "pending_invoices_count": pending_count,
            "pending_invoices_amount": pending_amount,
            "overdue_invoices_count": overdue_count,
            "overdue_invoices_amount": overdue_amount,
            "revenue_this_month": revenue_this_month,
            "products_count": products_count,
            "services_count": services_count,
            "quotes_pending_count": quotes_pending,
            "tenant": tenant_info,
        }

        serializer = BillingDashboardSerializer(data)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Product ViewSet
# ---------------------------------------------------------------------------


class PortalBillingProductViewSet(viewsets.ModelViewSet):
    """
    CRUD for tenant products.

    GET /api/v1/portal/billing/products/
    POST /api/v1/portal/billing/products/
    GET /api/v1/portal/billing/products/{id}/
    PUT /api/v1/portal/billing/products/{id}/
    DELETE /api/v1/portal/billing/products/{id}/
    """

    authentication_classes = []
    permission_classes = [
        IsPortalAuthenticated,
        HasBillingPortalAccess,
        CanManageProducts,
    ]

    def get_queryset(self):
        return TenantProduct.objects.filter(tenant=self.request.tenant)

    def get_serializer_class(self):
        if self.action == "list":
            return TenantProductListSerializer
        return TenantProductSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


# ---------------------------------------------------------------------------
# Service ViewSet
# ---------------------------------------------------------------------------


class PortalBillingServiceViewSet(viewsets.ModelViewSet):
    """
    CRUD for tenant services.

    GET /api/v1/portal/billing/services/
    POST /api/v1/portal/billing/services/
    GET /api/v1/portal/billing/services/{id}/
    PUT /api/v1/portal/billing/services/{id}/
    DELETE /api/v1/portal/billing/services/{id}/
    """

    authentication_classes = []
    permission_classes = [
        IsPortalAuthenticated,
        HasBillingPortalAccess,
        CanManageServices,
    ]

    def get_queryset(self):
        return TenantService.objects.filter(tenant=self.request.tenant)

    def get_serializer_class(self):
        if self.action == "list":
            return TenantServiceListSerializer
        return TenantServiceSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


# ---------------------------------------------------------------------------
# Invoice ViewSet
# ---------------------------------------------------------------------------


class PortalBillingInvoiceViewSet(viewsets.ModelViewSet):
    """
    CRUD for tenant invoices.

    GET /api/v1/portal/billing/invoices/
    POST /api/v1/portal/billing/invoices/
    GET /api/v1/portal/billing/invoices/{id}/
    PUT /api/v1/portal/billing/invoices/{id}/
    DELETE /api/v1/portal/billing/invoices/{id}/

    Additional actions:
    POST /api/v1/portal/billing/invoices/{id}/send/
    GET /api/v1/portal/billing/invoices/{id}/pdf/
    POST /api/v1/portal/billing/invoices/{id}/mark_paid/
    """

    authentication_classes = []
    permission_classes = [
        IsPortalAuthenticated,
        HasBillingPortalAccess,
        CanCreateInvoices,
    ]

    def get_queryset(self):
        qs = TenantInvoice.objects.filter(tenant=self.request.tenant)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Search
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(subject__icontains=search)
            )

        return qs.prefetch_related("line_items")

    def get_serializer_class(self):
        if self.action == "list":
            return TenantInvoiceListSerializer
        if self.action in ("create", "update", "partial_update"):
            return TenantInvoiceCreateSerializer
        return TenantInvoiceSerializer

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Mark invoice as sent."""
        invoice = self.get_object()
        if invoice.status not in (
            TenantInvoice.Status.DRAFT,
            TenantInvoice.Status.SENT,
        ):
            return Response(
                {"error": "Can only send draft or already sent invoices."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.status = TenantInvoice.Status.SENT
        invoice.save(update_fields=["status", "updated_at"])

        # TODO: Send email notification to customer

        return Response({"status": "sent"})

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid."""
        invoice = self.get_object()
        amount = request.data.get("amount")

        if amount:
            invoice.amount_paid += Decimal(str(amount))
        else:
            invoice.amount_paid = invoice.total

        invoice.amount_due = invoice.total - invoice.amount_paid

        if invoice.amount_due <= 0:
            invoice.status = TenantInvoice.Status.PAID
            invoice.amount_due = Decimal("0.00")
        else:
            invoice.status = TenantInvoice.Status.PARTIAL

        invoice.save()
        return Response(TenantInvoiceSerializer(invoice).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Generate and return PDF for invoice."""
        invoice = self.get_object()

        from apps.portal.services.pdf_generator import generate_invoice_pdf

        pdf_content = generate_invoice_pdf(invoice)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
        )
        return response

    @action(detail=False, methods=["get"])
    def next_number(self, request):
        """Get the next suggested invoice number."""
        tenant = request.tenant
        last_invoice = (
            TenantInvoice.objects.filter(tenant=tenant).order_by("-created_at").first()
        )

        if last_invoice:
            # Try to parse and increment
            try:
                prefix = "".join(filter(str.isalpha, last_invoice.invoice_number))
                number = int("".join(filter(str.isdigit, last_invoice.invoice_number)))
                next_number = f"{prefix}{number + 1:04d}"
            except (ValueError, TypeError):
                next_number = "INV-0001"
        else:
            next_number = "INV-0001"

        return Response({"next_number": next_number})


# ---------------------------------------------------------------------------
# Quote ViewSet
# ---------------------------------------------------------------------------


class PortalBillingQuoteViewSet(viewsets.ModelViewSet):
    """
    CRUD for tenant quotes.

    GET /api/v1/portal/billing/quotes/
    POST /api/v1/portal/billing/quotes/
    GET /api/v1/portal/billing/quotes/{id}/
    PUT /api/v1/portal/billing/quotes/{id}/
    DELETE /api/v1/portal/billing/quotes/{id}/

    Additional actions:
    POST /api/v1/portal/billing/quotes/{id}/send/
    GET /api/v1/portal/billing/quotes/{id}/pdf/
    POST /api/v1/portal/billing/quotes/{id}/convert/
    """

    authentication_classes = []
    permission_classes = [
        IsPortalAuthenticated,
        HasBillingPortalAccess,
        CanCreateQuotes,
    ]

    def get_queryset(self):
        qs = TenantQuote.objects.filter(tenant=self.request.tenant)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Search
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(quote_number__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(subject__icontains=search)
            )

        return qs.prefetch_related("line_items")

    def get_serializer_class(self):
        if self.action == "list":
            return TenantQuoteListSerializer
        if self.action in ("create", "update", "partial_update"):
            return TenantQuoteCreateSerializer
        return TenantQuoteSerializer

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Mark quote as sent."""
        quote = self.get_object()
        if quote.status not in (TenantQuote.Status.DRAFT, TenantQuote.Status.SENT):
            return Response(
                {"error": "Can only send draft or already sent quotes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = TenantQuote.Status.SENT
        quote.save(update_fields=["status", "updated_at"])

        # TODO: Send email notification to customer

        return Response({"status": "sent"})

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        """Convert quote to invoice."""
        quote = self.get_object()

        if quote.converted_invoice:
            return Response(
                {"error": "Quote has already been converted to an invoice."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate invoice number
        tenant = request.tenant
        last_invoice = (
            TenantInvoice.objects.filter(tenant=tenant).order_by("-created_at").first()
        )
        if last_invoice:
            try:
                prefix = "".join(filter(str.isalpha, last_invoice.invoice_number))
                number = int("".join(filter(str.isdigit, last_invoice.invoice_number)))
                invoice_number = f"{prefix}{number + 1:04d}"
            except (ValueError, TypeError):
                invoice_number = "INV-0001"
        else:
            invoice_number = "INV-0001"

        # Create invoice from quote
        invoice = TenantInvoice.objects.create(
            tenant=tenant,
            invoice_number=invoice_number,
            subject=quote.subject,
            status=TenantInvoice.Status.DRAFT,
            customer_name=quote.customer_name,
            customer_email=quote.customer_email,
            customer_phone=quote.customer_phone,
            customer_address=quote.customer_address,
            invoice_date=date.today(),
            due_date=None,
            tax_percent=quote.tax_percent,
            discount_amount=quote.discount_amount,
            notes=quote.notes,
            terms_conditions=quote.terms_conditions,
        )

        # Copy line items
        for item in quote.line_items.all():
            TenantInvoiceLineItem.objects.create(
                invoice=invoice,
                product=item.product,
                service=item.service,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_percent=item.discount_percent,
                sort_order=item.sort_order,
            )

        invoice.calculate_totals()
        invoice.save()

        # Update quote status
        quote.status = TenantQuote.Status.CONVERTED
        quote.converted_invoice = invoice
        quote.save()

        return Response(
            {
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Generate and return PDF for quote."""
        quote = self.get_object()

        from apps.portal.services.pdf_generator import generate_quote_pdf

        pdf_content = generate_quote_pdf(quote)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="quote_{quote.quote_number}.pdf"'
        )
        return response

    @action(detail=False, methods=["get"])
    def next_number(self, request):
        """Get the next suggested quote number."""
        tenant = request.tenant
        last_quote = (
            TenantQuote.objects.filter(tenant=tenant).order_by("-created_at").first()
        )

        if last_quote:
            try:
                prefix = "".join(filter(str.isalpha, last_quote.quote_number))
                number = int("".join(filter(str.isdigit, last_quote.quote_number)))
                next_number = f"{prefix}{number + 1:04d}"
            except (ValueError, TypeError):
                next_number = "QT-0001"
        else:
            next_number = "QT-0001"

        return Response({"next_number": next_number})
