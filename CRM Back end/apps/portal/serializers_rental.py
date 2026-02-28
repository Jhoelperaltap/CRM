"""
Serializers for Rental Properties in the Client Portal.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.portal.models_rental import (
    RentalExpenseCategory,
    RentalProperty,
    RentalTransaction,
)

# -----------------------------------------------------------------------
# Expense Categories
# -----------------------------------------------------------------------


class RentalExpenseCategorySerializer(serializers.ModelSerializer):
    """Serializer for expense categories (system + custom)."""

    class Meta:
        model = RentalExpenseCategory
        fields = [
            "id",
            "name",
            "slug",
            "is_system",
            "is_active",
            "sort_order",
        ]
        read_only_fields = ["id", "is_system"]


class RentalExpenseCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating custom expense categories."""

    class Meta:
        model = RentalExpenseCategory
        fields = ["name", "slug"]

    def validate_slug(self, value):
        """Ensure slug is unique for this contact or system categories."""
        contact = self.context.get("contact")
        # Check if slug exists as system category
        if RentalExpenseCategory.objects.filter(
            slug=value, contact__isnull=True
        ).exists():
            raise serializers.ValidationError(
                "A system category with this slug already exists."
            )
        # Check if slug exists for this contact
        if (
            contact
            and RentalExpenseCategory.objects.filter(
                slug=value, contact=contact
            ).exists()
        ):
            raise serializers.ValidationError(
                "You already have a category with this slug."
            )
        return value


# -----------------------------------------------------------------------
# Properties
# -----------------------------------------------------------------------


class RentalPropertyListSerializer(serializers.ModelSerializer):
    """Serializer for property list view with YTD summary."""

    full_address = serializers.CharField(read_only=True)
    property_type_display = serializers.CharField(
        source="get_property_type_display", read_only=True
    )
    # YTD summary fields - populated by the view
    ytd_income = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, default=Decimal("0.00")
    )
    ytd_expenses = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, default=Decimal("0.00")
    )
    ytd_net_profit = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, default=Decimal("0.00")
    )

    class Meta:
        model = RentalProperty
        fields = [
            "id",
            "name",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "full_address",
            "property_type",
            "property_type_display",
            "units_count",
            "is_active",
            "ytd_income",
            "ytd_expenses",
            "ytd_net_profit",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RentalPropertyDetailSerializer(serializers.ModelSerializer):
    """Serializer for property detail view."""

    full_address = serializers.CharField(read_only=True)
    property_type_display = serializers.CharField(
        source="get_property_type_display", read_only=True
    )

    class Meta:
        model = RentalProperty
        fields = [
            "id",
            "name",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "full_address",
            "property_type",
            "property_type_display",
            "units_count",
            "purchase_date",
            "purchase_price",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RentalPropertyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating properties."""

    class Meta:
        model = RentalProperty
        fields = [
            "name",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "property_type",
            "units_count",
            "purchase_date",
            "purchase_price",
            "is_active",
        ]


# -----------------------------------------------------------------------
# Transactions
# -----------------------------------------------------------------------


class RentalTransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions."""

    category_name = serializers.CharField(
        source="category.name", read_only=True, allow_null=True
    )
    category_slug = serializers.CharField(
        source="category.slug", read_only=True, allow_null=True
    )
    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display", read_only=True
    )
    property_name = serializers.CharField(source="property.name", read_only=True)
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = RentalTransaction
        fields = [
            "id",
            "property",
            "property_name",
            "transaction_type",
            "transaction_type_display",
            "category",
            "category_name",
            "category_slug",
            "transaction_date",
            "amount",
            "description",
            "receipt",
            "receipt_url",
            "debit_amount",
            "credit_amount",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "debit_amount",
            "credit_amount",
            "created_at",
        ]

    def get_receipt_url(self, obj):
        """Return the full URL for the receipt file."""
        if obj.receipt:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None


class RentalTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating transactions."""

    class Meta:
        model = RentalTransaction
        fields = [
            "property",
            "transaction_type",
            "category",
            "transaction_date",
            "amount",
            "description",
            "receipt",
        ]

    def validate(self, attrs):
        """Validate transaction data."""
        transaction_type = attrs.get("transaction_type")
        category = attrs.get("category")

        # Expenses require a category
        if (
            transaction_type == RentalTransaction.TransactionType.EXPENSE
            and not category
        ):
            raise serializers.ValidationError(
                {"category": "Category is required for expense transactions."}
            )

        # Income should not have a category
        if transaction_type == RentalTransaction.TransactionType.INCOME and category:
            attrs["category"] = None

        # Amount must be positive
        if attrs.get("amount", 0) <= 0:
            raise serializers.ValidationError(
                {"amount": "Amount must be greater than zero."}
            )

        return attrs


# -----------------------------------------------------------------------
# Monthly Summary (for Excel-like grid)
# -----------------------------------------------------------------------


class MonthlyValuesSerializer(serializers.Serializer):
    """Values for each month of the year plus total."""

    jan = serializers.DecimalField(max_digits=12, decimal_places=2)
    feb = serializers.DecimalField(max_digits=12, decimal_places=2)
    mar = serializers.DecimalField(max_digits=12, decimal_places=2)
    apr = serializers.DecimalField(max_digits=12, decimal_places=2)
    may = serializers.DecimalField(max_digits=12, decimal_places=2)
    jun = serializers.DecimalField(max_digits=12, decimal_places=2)
    jul = serializers.DecimalField(max_digits=12, decimal_places=2)
    aug = serializers.DecimalField(max_digits=12, decimal_places=2)
    sep = serializers.DecimalField(max_digits=12, decimal_places=2)
    oct = serializers.DecimalField(max_digits=12, decimal_places=2)
    nov = serializers.DecimalField(max_digits=12, decimal_places=2)
    dec = serializers.DecimalField(max_digits=12, decimal_places=2)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)


class CategoryMonthlySerializer(serializers.Serializer):
    """Monthly values for an expense category."""

    category_id = serializers.UUIDField()
    category_name = serializers.CharField()
    category_slug = serializers.CharField()
    values = MonthlyValuesSerializer()


class RentalMonthlySummarySerializer(serializers.Serializer):
    """
    Complete monthly summary for a property.
    Used to render the Excel-like grid view.
    """

    year = serializers.IntegerField()
    property_id = serializers.UUIDField()
    property_name = serializers.CharField()
    income = MonthlyValuesSerializer()
    expenses = CategoryMonthlySerializer(many=True)
    total_expenses = MonthlyValuesSerializer()
    net_cash_flow = MonthlyValuesSerializer()


# -----------------------------------------------------------------------
# Dashboard
# -----------------------------------------------------------------------


class PropertyProfitSerializer(serializers.Serializer):
    """Profit data for a single property (for dashboard chart)."""

    property_id = serializers.UUIDField()
    property_name = serializers.CharField()
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)


class RentalDashboardSerializer(serializers.Serializer):
    """
    Dashboard data for all rental properties.
    Includes totals and per-property breakdown for charts.
    """

    year = serializers.IntegerField()
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    properties_count = serializers.IntegerField()
    properties = PropertyProfitSerializer(many=True)
