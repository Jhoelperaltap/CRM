from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Tax Rate
# ---------------------------------------------------------------------------
class TaxRate(TimeStampedModel):
    class TaxType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        GROUP = "group", "Group"

    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage")
    is_active = models.BooleanField(default=True)
    is_compound = models.BooleanField(default=False)
    tax_type = models.CharField(
        max_length=20, choices=TaxType.choices, default=TaxType.INDIVIDUAL
    )
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "crm_tax_rates"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


# ---------------------------------------------------------------------------
# Terms and Conditions
# ---------------------------------------------------------------------------
class TermsAndConditions(TimeStampedModel):
    name = models.CharField(max_length=255)
    content = models.TextField()
    module = models.CharField(max_length=50, blank=True, default="")
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "crm_terms_conditions"
        ordering = ["name"]
        verbose_name_plural = "Terms and conditions"

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Vendor
# ---------------------------------------------------------------------------
class Vendor(TimeStampedModel):
    name = models.CharField(max_length=255, db_index=True)
    vendor_code = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    website = models.URLField(blank=True, default="")
    category = models.CharField(max_length=100, blank=True, default="")
    street = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    zip_code = models.CharField(max_length=20, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_vendors",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_vendors",
    )

    class Meta:
        db_table = "crm_vendors"
        ordering = ["name"]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------
class Product(TimeStampedModel):
    name = models.CharField(max_length=255, db_index=True)
    product_code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=100, blank=True, default="")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=50, default="Units")
    qty_in_stock = models.IntegerField(default=0)
    qty_ordered = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    manufacturer = models.CharField(max_length=255, blank=True, default="")
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    image_url = models.URLField(blank=True, default="")

    class Meta:
        db_table = "crm_products"
        ordering = ["name"]

    def __str__(self):
        return f"{self.product_code} – {self.name}"


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class Service(TimeStampedModel):
    name = models.CharField(max_length=255, db_index=True)
    service_code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=100, blank=True, default="")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    usage_unit = models.CharField(max_length=50, default="Hours")
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services",
    )

    class Meta:
        db_table = "crm_services"
        ordering = ["name"]

    def __str__(self):
        return f"{self.service_code} – {self.name}"


# ---------------------------------------------------------------------------
# Price Book
# ---------------------------------------------------------------------------
class PriceBook(TimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    currency = models.CharField(max_length=3, default="USD")

    class Meta:
        db_table = "crm_price_books"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PriceBookEntry(TimeStampedModel):
    price_book = models.ForeignKey(
        PriceBook, on_delete=models.CASCADE, related_name="entries"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="price_entries",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="price_entries",
    )
    list_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "crm_price_book_entries"
        ordering = ["price_book", "id"]

    def __str__(self):
        item = self.product or self.service
        return f"{self.price_book.name}: {item} @ {self.list_price}"


# ---------------------------------------------------------------------------
# Abstract base for order documents (Invoice / SO / PO)
# ---------------------------------------------------------------------------
class AbstractOrderDocument(TimeStampedModel):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        APPROVED = "approved", "Approved"
        CANCELLED = "cancelled", "Cancelled"

    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=20, db_index=True)
    order_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    terms_and_conditions = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_%(class)ss",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_%(class)ss",
    )

    class Meta:
        abstract = True


class AbstractLineItem(TimeStampedModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    description = models.CharField(max_length=500, blank=True, default="")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sort_order = models.IntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ["sort_order"]


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------
class Invoice(AbstractOrderDocument):
    class InvoiceStatus(models.TextChoices):
        CREATED = "created", "Created"
        APPROVED = "approved", "Approved"
        SENT = "sent", "Sent"
        CREDIT_MEMO = "credit_memo", "Credit Memo"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    sales_order = models.ForeignKey(
        "inventory.SalesOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    customer_no = models.CharField(max_length=50, blank=True, default="")
    purchase_order_ref = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="External purchase order reference",
    )
    sales_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    excise_duty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Billing address
    billing_street = models.CharField(max_length=255, blank=True, default="")
    billing_city = models.CharField(max_length=100, blank=True, default="")
    billing_state = models.CharField(max_length=100, blank=True, default="")
    billing_zip = models.CharField(max_length=20, blank=True, default="")
    billing_country = models.CharField(max_length=100, blank=True, default="")
    billing_po_box = models.CharField(max_length=50, blank=True, default="")
    # Shipping address
    shipping_street = models.CharField(max_length=255, blank=True, default="")
    shipping_city = models.CharField(max_length=100, blank=True, default="")
    shipping_state = models.CharField(max_length=100, blank=True, default="")
    shipping_zip = models.CharField(max_length=20, blank=True, default="")
    shipping_country = models.CharField(max_length=100, blank=True, default="")
    shipping_po_box = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "crm_invoices"
        ordering = ["-created_at"]

    def __str__(self):
        return self.invoice_number


class InvoiceLineItem(AbstractLineItem):
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="line_items"
    )

    class Meta(AbstractLineItem.Meta):
        db_table = "crm_invoice_line_items"


# ---------------------------------------------------------------------------
# Sales Order
# ---------------------------------------------------------------------------
class SalesOrder(AbstractOrderDocument):
    class SOStatus(models.TextChoices):
        CREATED = "created", "Created"
        APPROVED = "approved", "Approved"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    so_number = models.CharField(max_length=50, unique=True, db_index=True)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_orders",
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_orders",
    )
    quote = models.ForeignKey(
        "quotes.Quote",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_orders",
    )
    customer_no = models.CharField(max_length=50, blank=True, default="")
    purchase_order_ref = models.CharField(max_length=100, blank=True, default="")
    carrier = models.CharField(max_length=100, blank=True, default="")
    pending = models.CharField(max_length=100, blank=True, default="")
    sales_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    excise_duty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Billing address
    billing_street = models.CharField(max_length=255, blank=True, default="")
    billing_city = models.CharField(max_length=100, blank=True, default="")
    billing_state = models.CharField(max_length=100, blank=True, default="")
    billing_zip = models.CharField(max_length=20, blank=True, default="")
    billing_country = models.CharField(max_length=100, blank=True, default="")
    billing_po_box = models.CharField(max_length=50, blank=True, default="")
    # Shipping address
    shipping_street = models.CharField(max_length=255, blank=True, default="")
    shipping_city = models.CharField(max_length=100, blank=True, default="")
    shipping_state = models.CharField(max_length=100, blank=True, default="")
    shipping_zip = models.CharField(max_length=20, blank=True, default="")
    shipping_country = models.CharField(max_length=100, blank=True, default="")
    shipping_po_box = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "crm_sales_orders"
        ordering = ["-created_at"]

    def __str__(self):
        return self.so_number


class SalesOrderLineItem(AbstractLineItem):
    sales_order = models.ForeignKey(
        SalesOrder, on_delete=models.CASCADE, related_name="line_items"
    )

    class Meta(AbstractLineItem.Meta):
        db_table = "crm_sales_order_line_items"


# ---------------------------------------------------------------------------
# Purchase Order
# ---------------------------------------------------------------------------
class PurchaseOrder(AbstractOrderDocument):
    class POStatus(models.TextChoices):
        CREATED = "created", "Created"
        APPROVED = "approved", "Approved"
        RECEIVED = "received", "Received"
        CANCELLED = "cancelled", "Cancelled"

    po_number = models.CharField(max_length=50, unique=True, db_index=True)
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders",
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders",
    )
    sales_order = models.ForeignKey(
        "inventory.SalesOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders",
    )
    requisition_number = models.CharField(max_length=100, blank=True, default="")
    sales_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    excise_duty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    carrier = models.CharField(max_length=100, blank=True, default="")
    tracking_number = models.CharField(max_length=255, blank=True, default="")
    # Billing address
    billing_street = models.CharField(max_length=255, blank=True, default="")
    billing_city = models.CharField(max_length=100, blank=True, default="")
    billing_state = models.CharField(max_length=100, blank=True, default="")
    billing_zip = models.CharField(max_length=20, blank=True, default="")
    billing_country = models.CharField(max_length=100, blank=True, default="")
    billing_po_box = models.CharField(max_length=50, blank=True, default="")
    # Shipping address
    shipping_street = models.CharField(max_length=255, blank=True, default="")
    shipping_city = models.CharField(max_length=100, blank=True, default="")
    shipping_state = models.CharField(max_length=100, blank=True, default="")
    shipping_zip = models.CharField(max_length=20, blank=True, default="")
    shipping_country = models.CharField(max_length=100, blank=True, default="")
    shipping_po_box = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "crm_purchase_orders"
        ordering = ["-created_at"]

    def __str__(self):
        return self.po_number


class PurchaseOrderLineItem(AbstractLineItem):
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="line_items"
    )

    class Meta(AbstractLineItem.Meta):
        db_table = "crm_purchase_order_line_items"


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------
class Payment(TimeStampedModel):
    class PaymentMode(models.TextChoices):
        CASH = "cash", "Cash"
        CHECK = "check", "Check"
        WIRE_TRANSFER = "wire_transfer", "Wire Transfer"
        CREDIT_CARD = "credit_card", "Credit Card"
        ONLINE = "online", "Online"
        OTHER = "other", "Other"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    payment_number = models.CharField(max_length=50, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_mode = models.CharField(
        max_length=20, choices=PaymentMode.choices, default=PaymentMode.CASH
    )
    reference_number = models.CharField(max_length=100, blank=True, default="")
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payments",
    )

    class Meta:
        db_table = "crm_payments"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.payment_number} – ${self.amount}"


# ---------------------------------------------------------------------------
# Work Order
# ---------------------------------------------------------------------------
class WorkOrder(TimeStampedModel):
    class WOStatus(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    wo_number = models.CharField(max_length=50, unique=True, db_index=True)
    subject = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=WOStatus.choices,
        default=WOStatus.OPEN,
        db_index=True,
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.MEDIUM
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_work_orders",
    )
    sales_order = models.ForeignKey(
        SalesOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_orders",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_work_orders",
    )

    class Meta:
        db_table = "crm_work_orders"
        ordering = ["-created_at"]

    def __str__(self):
        return self.wo_number


# ---------------------------------------------------------------------------
# Asset
# ---------------------------------------------------------------------------
class Asset(TimeStampedModel):
    class AssetStatus(models.TextChoices):
        IN_SERVICE = "in_service", "In Service"
        OUT_OF_SERVICE = "out_of_service", "Out of Service"
        RETIRED = "retired", "Retired"

    name = models.CharField(max_length=255, db_index=True)
    serial_number = models.CharField(max_length=100, blank=True, default="")
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assets",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assets",
    )
    corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assets",
    )
    status = models.CharField(
        max_length=20,
        choices=AssetStatus.choices,
        default=AssetStatus.IN_SERVICE,
        db_index=True,
    )
    purchase_date = models.DateField(null=True, blank=True)
    warranty_end_date = models.DateField(null=True, blank=True)
    date_in_service = models.DateField(null=True, blank=True)
    date_sold = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default="")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_assets",
    )

    class Meta:
        db_table = "crm_assets"
        ordering = ["name"]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Stock Transaction
# ---------------------------------------------------------------------------
class StockTransaction(TimeStampedModel):
    class TransactionType(models.TextChoices):
        STOCK_IN = "stock_in", "Stock In"
        STOCK_OUT = "stock_out", "Stock Out"
        ADJUSTMENT = "adjustment", "Adjustment"

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="stock_transactions"
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.IntegerField()
    reference = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_transactions",
    )

    class Meta:
        db_table = "crm_stock_transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} – {self.product.name} x{self.quantity}"
