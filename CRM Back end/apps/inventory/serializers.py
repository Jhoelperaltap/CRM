from rest_framework import serializers

from apps.inventory.models import (
    Asset,
    Invoice,
    InvoiceLineItem,
    Payment,
    PriceBook,
    PriceBookEntry,
    Product,
    PurchaseOrder,
    PurchaseOrderLineItem,
    SalesOrder,
    SalesOrderLineItem,
    Service,
    StockTransaction,
    TaxRate,
    TermsAndConditions,
    Vendor,
    WorkOrder,
)


# ---------------------------------------------------------------------------
# Tax Rate
# ---------------------------------------------------------------------------
class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = [
            "id", "name", "rate", "is_active", "is_compound",
            "tax_type", "description", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Terms and Conditions
# ---------------------------------------------------------------------------
class TermsAndConditionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TermsAndConditions
        fields = [
            "id", "name", "content", "module", "is_default",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Vendor
# ---------------------------------------------------------------------------
class VendorListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = Vendor
        fields = [
            "id", "name", "vendor_code", "email", "phone",
            "category", "city", "country", "is_active",
            "assigned_to", "assigned_to_name", "created_at",
        ]


class VendorDetailSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = Vendor
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class VendorCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            "name", "vendor_code", "email", "phone", "website",
            "category", "street", "city", "state", "zip_code",
            "country", "description", "is_active", "assigned_to",
        ]

    def to_representation(self, instance):
        return VendorDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------
class ProductListSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source="vendor.name", read_only=True, default=""
    )
    tax_rate_name = serializers.CharField(
        source="tax_rate.name", read_only=True, default=""
    )

    class Meta:
        model = Product
        fields = [
            "id", "name", "product_code", "category", "unit_price",
            "cost_price", "unit", "qty_in_stock", "reorder_level",
            "is_active", "vendor", "vendor_name",
            "tax_rate", "tax_rate_name", "created_at",
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source="vendor.name", read_only=True, default=""
    )
    tax_rate_name = serializers.CharField(
        source="tax_rate.name", read_only=True, default=""
    )

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "name", "product_code", "category", "unit_price", "cost_price",
            "unit", "qty_in_stock", "qty_ordered", "reorder_level",
            "description", "is_active", "manufacturer", "vendor",
            "tax_rate", "image_url",
        ]

    def to_representation(self, instance):
        return ProductDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class ServiceListSerializer(serializers.ModelSerializer):
    tax_rate_name = serializers.CharField(
        source="tax_rate.name", read_only=True, default=""
    )

    class Meta:
        model = Service
        fields = [
            "id", "name", "service_code", "category", "unit_price",
            "usage_unit", "is_active", "tax_rate", "tax_rate_name",
            "created_at",
        ]


class ServiceDetailSerializer(serializers.ModelSerializer):
    tax_rate_name = serializers.CharField(
        source="tax_rate.name", read_only=True, default=""
    )

    class Meta:
        model = Service
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ServiceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            "name", "service_code", "category", "unit_price",
            "usage_unit", "description", "is_active", "tax_rate",
        ]

    def to_representation(self, instance):
        return ServiceDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Price Book
# ---------------------------------------------------------------------------
class PriceBookEntrySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    service_name = serializers.CharField(
        source="service.name", read_only=True, default=""
    )

    class Meta:
        model = PriceBookEntry
        fields = [
            "id", "product", "product_name", "service", "service_name",
            "list_price",
        ]
        read_only_fields = ["id"]


class PriceBookListSerializer(serializers.ModelSerializer):
    entry_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = PriceBook
        fields = [
            "id", "name", "description", "is_active", "currency",
            "entry_count", "created_at",
        ]


class PriceBookDetailSerializer(serializers.ModelSerializer):
    entries = PriceBookEntrySerializer(many=True, read_only=True)

    class Meta:
        model = PriceBook
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class PriceBookCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceBook
        fields = ["name", "description", "is_active", "currency"]

    def to_representation(self, instance):
        return PriceBookDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Line Item serializers (shared structure)
# ---------------------------------------------------------------------------
class LineItemSerializer(serializers.Serializer):
    """Read serializer for any line item."""
    id = serializers.UUIDField(read_only=True)
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), allow_null=True, required=False
    )
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), allow_null=True, required=False
    )
    service_name = serializers.CharField(
        source="service.name", read_only=True, default=""
    )
    description = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, default=0
    )
    tax_rate = serializers.PrimaryKeyRelatedField(
        queryset=TaxRate.objects.all(), allow_null=True, required=False
    )
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    sort_order = serializers.IntegerField(required=False, default=0)


class LineItemWriteSerializer(serializers.Serializer):
    """Write serializer for line item input."""
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), allow_null=True, required=False
    )
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), allow_null=True, required=False
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, default=0
    )
    tax_rate = serializers.PrimaryKeyRelatedField(
        queryset=TaxRate.objects.all(), allow_null=True, required=False
    )
    sort_order = serializers.IntegerField(required=False, default=0)


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------
class InvoiceLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    service_name = serializers.CharField(
        source="service.name", read_only=True, default=""
    )

    class Meta:
        model = InvoiceLineItem
        fields = [
            "id", "product", "product_name", "service", "service_name",
            "description", "quantity", "unit_price", "discount_percent",
            "tax_rate", "total", "sort_order",
        ]
        read_only_fields = ["id"]


class InvoiceListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    invoice_date = serializers.DateField(source="order_date", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "subject", "status",
            "contact", "contact_name", "corporation", "corporation_name",
            "invoice_date", "due_date", "total",
            "assigned_to", "assigned_to_name", "created_at",
        ]

    def get_contact_name(self, obj):
        if obj.contact:
            return obj.contact.full_name
        return ""


class InvoiceDetailSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        if obj.contact:
            return obj.contact.full_name
        return ""


class InvoiceCreateUpdateSerializer(serializers.ModelSerializer):
    line_items = LineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            "invoice_number", "subject", "status", "contact", "corporation",
            "sales_order", "order_date", "due_date",
            "customer_no", "purchase_order_ref",
            "sales_commission", "excise_duty",
            "billing_street", "billing_city", "billing_state",
            "billing_zip", "billing_country", "billing_po_box",
            "shipping_street", "shipping_city", "shipping_state",
            "shipping_zip", "shipping_country", "shipping_po_box",
            "subtotal", "discount_percent", "discount_amount",
            "tax_amount", "adjustment", "total",
            "terms_and_conditions", "description", "assigned_to",
            "line_items",
        ]

    def _save_line_items(self, invoice, items_data):
        invoice.line_items.all().delete()
        for idx, item_data in enumerate(items_data):
            qty = item_data.get("quantity", 1)
            price = item_data.get("unit_price", 0)
            disc = item_data.get("discount_percent", 0)
            line_total = float(qty) * float(price) * (1 - float(disc) / 100)
            InvoiceLineItem.objects.create(
                invoice=invoice,
                sort_order=item_data.get("sort_order", idx),
                total=round(line_total, 2),
                **{k: v for k, v in item_data.items()
                   if k not in ("sort_order", "total")},
            )

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        validated_data["created_by"] = self.context["request"].user
        invoice = Invoice.objects.create(**validated_data)
        self._save_line_items(invoice, items_data)
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items_data is not None:
            self._save_line_items(instance, items_data)
        return instance

    def to_representation(self, instance):
        return InvoiceDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Sales Order
# ---------------------------------------------------------------------------
class SalesOrderLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    service_name = serializers.CharField(
        source="service.name", read_only=True, default=""
    )

    class Meta:
        model = SalesOrderLineItem
        fields = [
            "id", "product", "product_name", "service", "service_name",
            "description", "quantity", "unit_price", "discount_percent",
            "tax_rate", "total", "sort_order",
        ]
        read_only_fields = ["id"]


class SalesOrderListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = SalesOrder
        fields = [
            "id", "so_number", "subject", "status",
            "contact", "contact_name", "corporation", "corporation_name",
            "quote", "order_date", "due_date", "total",
            "assigned_to", "assigned_to_name", "created_at",
        ]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class SalesOrderDetailSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )
    line_items = SalesOrderLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = SalesOrder
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class SalesOrderCreateUpdateSerializer(serializers.ModelSerializer):
    line_items = LineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = SalesOrder
        fields = [
            "so_number", "subject", "status", "contact", "corporation",
            "quote", "order_date", "due_date",
            "customer_no", "purchase_order_ref", "carrier", "pending",
            "sales_commission", "excise_duty",
            "billing_street", "billing_city", "billing_state",
            "billing_zip", "billing_country", "billing_po_box",
            "shipping_street", "shipping_city", "shipping_state",
            "shipping_zip", "shipping_country", "shipping_po_box",
            "subtotal", "discount_percent", "discount_amount",
            "tax_amount", "adjustment", "total",
            "terms_and_conditions", "description", "assigned_to",
            "line_items",
        ]

    def _save_line_items(self, so, items_data):
        so.line_items.all().delete()
        for idx, item_data in enumerate(items_data):
            qty = item_data.get("quantity", 1)
            price = item_data.get("unit_price", 0)
            disc = item_data.get("discount_percent", 0)
            line_total = float(qty) * float(price) * (1 - float(disc) / 100)
            SalesOrderLineItem.objects.create(
                sales_order=so,
                sort_order=item_data.get("sort_order", idx),
                total=round(line_total, 2),
                **{k: v for k, v in item_data.items()
                   if k not in ("sort_order", "total")},
            )

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        validated_data["created_by"] = self.context["request"].user
        so = SalesOrder.objects.create(**validated_data)
        self._save_line_items(so, items_data)
        return so

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items_data is not None:
            self._save_line_items(instance, items_data)
        return instance

    def to_representation(self, instance):
        return SalesOrderDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Purchase Order
# ---------------------------------------------------------------------------
class PurchaseOrderLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    service_name = serializers.CharField(
        source="service.name", read_only=True, default=""
    )

    class Meta:
        model = PurchaseOrderLineItem
        fields = [
            "id", "product", "product_name", "service", "service_name",
            "description", "quantity", "unit_price", "discount_percent",
            "tax_rate", "total", "sort_order",
        ]
        read_only_fields = ["id"]


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source="vendor.name", read_only=True, default=""
    )
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "subject", "status",
            "vendor", "vendor_name", "contact", "contact_name",
            "corporation", "corporation_name",
            "order_date", "due_date", "total",
            "assigned_to", "assigned_to_name", "created_at",
        ]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(
        source="vendor.name", read_only=True, default=""
    )
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )
    line_items = PurchaseOrderLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class PurchaseOrderCreateUpdateSerializer(serializers.ModelSerializer):
    line_items = LineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = [
            "po_number", "subject", "status", "vendor", "contact",
            "corporation", "sales_order", "order_date", "due_date",
            "requisition_number", "sales_commission", "excise_duty",
            "carrier", "tracking_number",
            "billing_street", "billing_city", "billing_state",
            "billing_zip", "billing_country", "billing_po_box",
            "shipping_street", "shipping_city", "shipping_state",
            "shipping_zip", "shipping_country", "shipping_po_box",
            "subtotal", "discount_percent", "discount_amount",
            "tax_amount", "adjustment", "total",
            "terms_and_conditions", "description", "assigned_to",
            "line_items",
        ]

    def _save_line_items(self, po, items_data):
        po.line_items.all().delete()
        for idx, item_data in enumerate(items_data):
            qty = item_data.get("quantity", 1)
            price = item_data.get("unit_price", 0)
            disc = item_data.get("discount_percent", 0)
            line_total = float(qty) * float(price) * (1 - float(disc) / 100)
            PurchaseOrderLineItem.objects.create(
                purchase_order=po,
                sort_order=item_data.get("sort_order", idx),
                total=round(line_total, 2),
                **{k: v for k, v in item_data.items()
                   if k not in ("sort_order", "total")},
            )

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        validated_data["created_by"] = self.context["request"].user
        po = PurchaseOrder.objects.create(**validated_data)
        self._save_line_items(po, items_data)
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items_data is not None:
            self._save_line_items(instance, items_data)
        return instance

    def to_representation(self, instance):
        return PurchaseOrderDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------
class PaymentListSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True, default=""
    )

    class Meta:
        model = Payment
        fields = [
            "id", "payment_number", "amount", "payment_date",
            "payment_mode", "status", "reference_number",
            "invoice", "invoice_number",
            "contact", "contact_name", "created_at",
        ]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class PaymentDetailSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(
        source="invoice.invoice_number", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class PaymentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "payment_number", "amount", "payment_date", "payment_mode",
            "reference_number", "invoice", "contact", "status", "notes",
        ]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def to_representation(self, instance):
        return PaymentDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Work Order
# ---------------------------------------------------------------------------
class WorkOrderListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = WorkOrder
        fields = [
            "id", "wo_number", "subject", "status", "priority",
            "assigned_to", "assigned_to_name",
            "start_date", "end_date", "created_at",
        ]


class WorkOrderDetailSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )
    so_number = serializers.CharField(
        source="sales_order.so_number", read_only=True, default=""
    )

    class Meta:
        model = WorkOrder
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class WorkOrderCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = [
            "wo_number", "subject", "status", "priority",
            "assigned_to", "sales_order", "start_date", "end_date",
            "description",
        ]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def to_representation(self, instance):
        return WorkOrderDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Asset
# ---------------------------------------------------------------------------
class AssetListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )

    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = Asset
        fields = [
            "id", "name", "serial_number", "status",
            "product", "product_name",
            "contact", "contact_name",
            "corporation", "corporation_name",
            "assigned_to", "assigned_to_name",
            "purchase_date", "warranty_end_date",
            "date_in_service", "date_sold", "created_at",
        ]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class AssetDetailSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.CharField(
        source="corporation.name", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = Asset
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        return obj.contact.full_name if obj.contact else ""


class AssetCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            "name", "serial_number", "product", "contact", "corporation",
            "status", "purchase_date", "warranty_end_date",
            "date_in_service", "date_sold",
            "description", "assigned_to",
        ]

    def to_representation(self, instance):
        return AssetDetailSerializer(instance).data


# ---------------------------------------------------------------------------
# Stock Transaction
# ---------------------------------------------------------------------------
class StockTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name", read_only=True, default=""
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = StockTransaction
        fields = [
            "id", "product", "product_name", "transaction_type",
            "quantity", "reference", "notes",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        transaction = super().create(validated_data)
        # Update product stock
        product = transaction.product
        if transaction.transaction_type == "stock_in":
            product.qty_in_stock += transaction.quantity
        elif transaction.transaction_type == "stock_out":
            product.qty_in_stock -= transaction.quantity
        else:  # adjustment
            product.qty_in_stock += transaction.quantity  # can be negative
        product.save(update_fields=["qty_in_stock", "updated_at"])
        return transaction
