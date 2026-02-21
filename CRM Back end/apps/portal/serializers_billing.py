"""
Serializers for the billing portal API.
"""


from django.db import transaction
from rest_framework import serializers

from apps.inventory.models import (
    TenantInvoice,
    TenantInvoiceLineItem,
    TenantProduct,
    TenantQuote,
    TenantQuoteLineItem,
    TenantService,
)

# ---------------------------------------------------------------------------
# Product Serializers
# ---------------------------------------------------------------------------


class TenantProductSerializer(serializers.ModelSerializer):
    """Serializer for TenantProduct CRUD operations."""

    class Meta:
        model = TenantProduct
        fields = [
            "id",
            "name",
            "product_code",
            "category",
            "unit_price",
            "cost_price",
            "unit",
            "qty_in_stock",
            "description",
            "is_active",
            "image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product lists."""

    class Meta:
        model = TenantProduct
        fields = [
            "id",
            "name",
            "product_code",
            "category",
            "unit_price",
            "unit",
            "qty_in_stock",
            "is_active",
        ]


# ---------------------------------------------------------------------------
# Service Serializers
# ---------------------------------------------------------------------------


class TenantServiceSerializer(serializers.ModelSerializer):
    """Serializer for TenantService CRUD operations."""

    class Meta:
        model = TenantService
        fields = [
            "id",
            "name",
            "service_code",
            "category",
            "unit_price",
            "usage_unit",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantServiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for service lists."""

    class Meta:
        model = TenantService
        fields = [
            "id",
            "name",
            "service_code",
            "category",
            "unit_price",
            "usage_unit",
            "is_active",
        ]


# ---------------------------------------------------------------------------
# Invoice Line Item Serializers
# ---------------------------------------------------------------------------


class TenantInvoiceLineItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice line items."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = TenantInvoiceLineItem
        fields = [
            "id",
            "product",
            "product_name",
            "service",
            "service_name",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "total",
            "sort_order",
        ]
        read_only_fields = ["id", "total"]


class TenantInvoiceLineItemWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating invoice line items."""

    class Meta:
        model = TenantInvoiceLineItem
        fields = [
            "product",
            "service",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "sort_order",
        ]


# ---------------------------------------------------------------------------
# Invoice Serializers
# ---------------------------------------------------------------------------


class TenantInvoiceSerializer(serializers.ModelSerializer):
    """Full serializer for TenantInvoice with line items."""

    line_items = TenantInvoiceLineItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = TenantInvoice
        fields = [
            "id",
            "invoice_number",
            "subject",
            "status",
            "status_display",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "invoice_date",
            "due_date",
            "subtotal",
            "tax_percent",
            "tax_amount",
            "discount_amount",
            "total",
            "amount_paid",
            "amount_due",
            "notes",
            "terms_conditions",
            "line_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "tax_amount",
            "total",
            "amount_due",
            "created_at",
            "updated_at",
        ]


class TenantInvoiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for invoice lists."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = TenantInvoice
        fields = [
            "id",
            "invoice_number",
            "subject",
            "status",
            "status_display",
            "customer_name",
            "invoice_date",
            "due_date",
            "total",
            "amount_due",
            "created_at",
        ]


class TenantInvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoices with nested line items."""

    line_items = TenantInvoiceLineItemWriteSerializer(many=True, required=False)
    invoice_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = TenantInvoice
        fields = [
            "invoice_number",
            "subject",
            "status",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "invoice_date",
            "due_date",
            "tax_percent",
            "discount_amount",
            "amount_paid",
            "notes",
            "terms_conditions",
            "line_items",
        ]

    def validate_invoice_number(self, value):
        if not value:
            return value  # Will be auto-generated in create()
        tenant = self.context["request"].tenant
        qs = TenantInvoice.objects.filter(tenant=tenant, invoice_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "An invoice with this number already exists."
            )
        return value

    def _generate_invoice_number(self, tenant):
        """Generate the next invoice number for the tenant."""
        last_invoice = (
            TenantInvoice.objects.filter(tenant=tenant)
            .order_by("-created_at")
            .first()
        )
        if last_invoice:
            try:
                prefix = "".join(filter(str.isalpha, last_invoice.invoice_number))
                number = int("".join(filter(str.isdigit, last_invoice.invoice_number)))
                return f"{prefix or 'INV-'}{number + 1:04d}"
            except (ValueError, TypeError):
                pass
        return "INV-0001"

    @transaction.atomic
    def create(self, validated_data):
        line_items_data = validated_data.pop("line_items", [])
        tenant = self.context["request"].tenant

        # Auto-generate invoice number if not provided
        if not validated_data.get("invoice_number"):
            validated_data["invoice_number"] = self._generate_invoice_number(tenant)

        invoice = TenantInvoice.objects.create(tenant=tenant, **validated_data)

        for item_data in line_items_data:
            TenantInvoiceLineItem.objects.create(invoice=invoice, **item_data)

        invoice.calculate_totals()
        invoice.save()
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        line_items_data = validated_data.pop("line_items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if line_items_data is not None:
            instance.line_items.all().delete()
            for item_data in line_items_data:
                TenantInvoiceLineItem.objects.create(invoice=instance, **item_data)

        instance.calculate_totals()
        instance.save()
        return instance


# ---------------------------------------------------------------------------
# Quote Line Item Serializers
# ---------------------------------------------------------------------------


class TenantQuoteLineItemSerializer(serializers.ModelSerializer):
    """Serializer for quote line items."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = TenantQuoteLineItem
        fields = [
            "id",
            "product",
            "product_name",
            "service",
            "service_name",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "total",
            "sort_order",
        ]
        read_only_fields = ["id", "total"]


class TenantQuoteLineItemWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating quote line items."""

    class Meta:
        model = TenantQuoteLineItem
        fields = [
            "product",
            "service",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "sort_order",
        ]


# ---------------------------------------------------------------------------
# Quote Serializers
# ---------------------------------------------------------------------------


class TenantQuoteSerializer(serializers.ModelSerializer):
    """Full serializer for TenantQuote with line items."""

    line_items = TenantQuoteLineItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    converted_invoice_number = serializers.CharField(
        source="converted_invoice.invoice_number", read_only=True
    )

    class Meta:
        model = TenantQuote
        fields = [
            "id",
            "quote_number",
            "subject",
            "status",
            "status_display",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "quote_date",
            "valid_until",
            "subtotal",
            "tax_percent",
            "tax_amount",
            "discount_amount",
            "total",
            "notes",
            "terms_conditions",
            "converted_invoice",
            "converted_invoice_number",
            "line_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "tax_amount",
            "total",
            "converted_invoice",
            "created_at",
            "updated_at",
        ]


class TenantQuoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for quote lists."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = TenantQuote
        fields = [
            "id",
            "quote_number",
            "subject",
            "status",
            "status_display",
            "customer_name",
            "quote_date",
            "valid_until",
            "total",
            "created_at",
        ]


class TenantQuoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating quotes with nested line items."""

    line_items = TenantQuoteLineItemWriteSerializer(many=True, required=False)
    quote_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = TenantQuote
        fields = [
            "quote_number",
            "subject",
            "status",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "quote_date",
            "valid_until",
            "tax_percent",
            "discount_amount",
            "notes",
            "terms_conditions",
            "line_items",
        ]

    def validate_quote_number(self, value):
        if not value:
            return value  # Will be auto-generated in create()
        tenant = self.context["request"].tenant
        qs = TenantQuote.objects.filter(tenant=tenant, quote_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A quote with this number already exists."
            )
        return value

    def _generate_quote_number(self, tenant):
        """Generate the next quote number for the tenant."""
        last_quote = (
            TenantQuote.objects.filter(tenant=tenant)
            .order_by("-created_at")
            .first()
        )
        if last_quote:
            try:
                prefix = "".join(filter(str.isalpha, last_quote.quote_number))
                number = int("".join(filter(str.isdigit, last_quote.quote_number)))
                return f"{prefix or 'QT-'}{number + 1:04d}"
            except (ValueError, TypeError):
                pass
        return "QT-0001"

    @transaction.atomic
    def create(self, validated_data):
        line_items_data = validated_data.pop("line_items", [])
        tenant = self.context["request"].tenant

        # Auto-generate quote number if not provided
        if not validated_data.get("quote_number"):
            validated_data["quote_number"] = self._generate_quote_number(tenant)

        quote = TenantQuote.objects.create(tenant=tenant, **validated_data)

        for item_data in line_items_data:
            TenantQuoteLineItem.objects.create(quote=quote, **item_data)

        quote.calculate_totals()
        quote.save()
        return quote

    @transaction.atomic
    def update(self, instance, validated_data):
        line_items_data = validated_data.pop("line_items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if line_items_data is not None:
            instance.line_items.all().delete()
            for item_data in line_items_data:
                TenantQuoteLineItem.objects.create(quote=instance, **item_data)

        instance.calculate_totals()
        instance.save()
        return instance


# ---------------------------------------------------------------------------
# Dashboard Serializer
# ---------------------------------------------------------------------------


class BillingDashboardSerializer(serializers.Serializer):
    """Serializer for billing dashboard metrics."""

    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    pending_invoices_count = serializers.IntegerField()
    pending_invoices_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    overdue_invoices_count = serializers.IntegerField()
    overdue_invoices_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    revenue_this_month = serializers.DecimalField(max_digits=14, decimal_places=2)
    products_count = serializers.IntegerField()
    services_count = serializers.IntegerField()
    quotes_pending_count = serializers.IntegerField()
    tenant = serializers.DictField()
