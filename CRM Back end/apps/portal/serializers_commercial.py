"""
Serializers for Commercial Buildings in the Client Portal.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.portal.models_commercial import (
    CommercialBuilding,
    CommercialFloor,
    CommercialLease,
    CommercialPayment,
    CommercialTenant,
    CommercialUnit,
)

# -----------------------------------------------------------------------
# Tenants
# -----------------------------------------------------------------------


class CommercialTenantSerializer(serializers.ModelSerializer):
    """Serializer for commercial tenants."""

    class Meta:
        model = CommercialTenant
        fields = [
            "id",
            "unit",
            "tenant_name",
            "business_name",
            "email",
            "phone",
            "is_current",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CommercialTenantCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating tenants."""

    class Meta:
        model = CommercialTenant
        fields = [
            "tenant_name",
            "business_name",
            "email",
            "phone",
            "is_current",
        ]


# -----------------------------------------------------------------------
# Leases
# -----------------------------------------------------------------------


class CommercialLeaseSerializer(serializers.ModelSerializer):
    """Serializer for commercial leases."""

    tenant_name = serializers.CharField(source="tenant.tenant_name", read_only=True)
    business_name = serializers.CharField(source="tenant.business_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    next_rent_after_renewal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    days_until_expiration = serializers.IntegerField(read_only=True)
    lease_document_url = serializers.SerializerMethodField()

    class Meta:
        model = CommercialLease
        fields = [
            "id",
            "unit",
            "tenant",
            "tenant_name",
            "business_name",
            "start_date",
            "end_date",
            "monthly_rent",
            "renewal_increase_percent",
            "next_rent_after_renewal",
            "days_until_expiration",
            "status",
            "status_display",
            "lease_document",
            "lease_document_url",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_lease_document_url(self, obj):
        """Return the full URL for the lease document."""
        if obj.lease_document:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.lease_document.url)
            return obj.lease_document.url
        return None


class CommercialLeaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating leases."""

    class Meta:
        model = CommercialLease
        fields = [
            "unit",
            "tenant",
            "start_date",
            "end_date",
            "monthly_rent",
            "renewal_increase_percent",
            "status",
            "lease_document",
            "notes",
        ]
        extra_kwargs = {
            "unit": {"required": False},
        }

    def validate(self, attrs):
        """Validate lease data."""
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date."}
            )

        monthly_rent = attrs.get("monthly_rent")
        if monthly_rent is not None and monthly_rent <= 0:
            raise serializers.ValidationError(
                {"monthly_rent": "Monthly rent must be greater than zero."}
            )

        return attrs


# -----------------------------------------------------------------------
# Payments
# -----------------------------------------------------------------------


class CommercialPaymentSerializer(serializers.ModelSerializer):
    """Serializer for commercial payments."""

    lease_id = serializers.UUIDField(source="lease.id", read_only=True)
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = CommercialPayment
        fields = [
            "id",
            "lease",
            "lease_id",
            "payment_date",
            "amount",
            "payment_month",
            "payment_year",
            "receipt",
            "receipt_url",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_receipt_url(self, obj):
        """Return the full URL for the receipt file."""
        if obj.receipt:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None


class CommercialPaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating payments."""

    class Meta:
        model = CommercialPayment
        fields = [
            "lease",
            "payment_date",
            "amount",
            "payment_month",
            "payment_year",
            "receipt",
            "notes",
        ]
        extra_kwargs = {
            "lease": {"required": False},
        }

    def validate_payment_month(self, value):
        """Ensure payment month is valid (1-12)."""
        if value < 1 or value > 12:
            raise serializers.ValidationError("Payment month must be between 1 and 12.")
        return value

    def validate_amount(self, value):
        """Ensure amount is positive."""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


# -----------------------------------------------------------------------
# Units
# -----------------------------------------------------------------------


class CommercialTenantNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for tenant info within unit."""

    class Meta:
        model = CommercialTenant
        fields = [
            "id",
            "tenant_name",
            "business_name",
            "email",
            "phone",
        ]


class CommercialLeaseNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for lease info within unit."""

    next_rent_after_renewal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    days_until_expiration = serializers.IntegerField(read_only=True)

    class Meta:
        model = CommercialLease
        fields = [
            "id",
            "start_date",
            "end_date",
            "monthly_rent",
            "renewal_increase_percent",
            "next_rent_after_renewal",
            "days_until_expiration",
            "status",
        ]


class CommercialUnitSerializer(serializers.ModelSerializer):
    """Serializer for commercial units."""

    current_tenant = CommercialTenantNestedSerializer(read_only=True)
    current_lease = CommercialLeaseNestedSerializer(read_only=True)
    floor_number = serializers.IntegerField(source="floor.floor_number", read_only=True)
    floor_name = serializers.CharField(source="floor.display_name", read_only=True)

    class Meta:
        model = CommercialUnit
        fields = [
            "id",
            "floor",
            "floor_number",
            "floor_name",
            "unit_number",
            "sqft",
            "door_code",
            "is_available",
            "notes",
            "current_tenant",
            "current_lease",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CommercialUnitCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating units."""

    class Meta:
        model = CommercialUnit
        fields = [
            "floor",
            "unit_number",
            "sqft",
            "door_code",
            "is_available",
            "notes",
        ]
        extra_kwargs = {
            "floor": {"required": False},
        }


class CommercialUnitListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for unit list in floor table."""

    tenant_name = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    monthly_rent = serializers.SerializerMethodField()

    class Meta:
        model = CommercialUnit
        fields = [
            "id",
            "unit_number",
            "sqft",
            "door_code",
            "is_available",
            "tenant_name",
            "business_name",
            "email",
            "phone",
            "monthly_rent",
        ]

    def get_tenant_name(self, obj):
        tenant = obj.current_tenant
        return tenant.tenant_name if tenant else None

    def get_business_name(self, obj):
        tenant = obj.current_tenant
        return tenant.business_name if tenant else None

    def get_email(self, obj):
        tenant = obj.current_tenant
        return tenant.email if tenant else None

    def get_phone(self, obj):
        tenant = obj.current_tenant
        return tenant.phone if tenant else None

    def get_monthly_rent(self, obj):
        lease = obj.current_lease
        return lease.monthly_rent if lease else None


# -----------------------------------------------------------------------
# Floors
# -----------------------------------------------------------------------


class CommercialFloorSerializer(serializers.ModelSerializer):
    """Serializer for commercial floors."""

    display_name = serializers.CharField(read_only=True)
    units = CommercialUnitListSerializer(many=True, read_only=True)
    units_count = serializers.SerializerMethodField()
    occupied_count = serializers.SerializerMethodField()

    class Meta:
        model = CommercialFloor
        fields = [
            "id",
            "building",
            "floor_number",
            "name",
            "display_name",
            "total_sqft",
            "units",
            "units_count",
            "occupied_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_units_count(self, obj):
        return obj.units.count()

    def get_occupied_count(self, obj):
        return obj.units.filter(is_available=False).count()


class CommercialFloorCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating floors."""

    class Meta:
        model = CommercialFloor
        fields = [
            "building",
            "floor_number",
            "name",
            "total_sqft",
        ]
        extra_kwargs = {
            "building": {"required": False},
        }
        # Disable automatic UniqueTogetherValidator since building comes from URL
        validators = []


class CommercialFloorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for floor list."""

    display_name = serializers.CharField(read_only=True)
    units_count = serializers.SerializerMethodField()

    class Meta:
        model = CommercialFloor
        fields = [
            "id",
            "floor_number",
            "name",
            "display_name",
            "total_sqft",
            "units_count",
        ]

    def get_units_count(self, obj):
        return obj.units.count()


# -----------------------------------------------------------------------
# Buildings
# -----------------------------------------------------------------------


class CommercialBuildingListSerializer(serializers.ModelSerializer):
    """Serializer for building list view with summary stats."""

    full_address = serializers.CharField(read_only=True)
    floors_count = serializers.SerializerMethodField()
    units_count = serializers.SerializerMethodField()
    occupied_units = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()
    monthly_income = serializers.SerializerMethodField()

    class Meta:
        model = CommercialBuilding
        fields = [
            "id",
            "name",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "full_address",
            "total_sqft",
            "floors_count",
            "units_count",
            "occupied_units",
            "occupancy_rate",
            "monthly_income",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_floors_count(self, obj):
        return obj.floors.count()

    def get_units_count(self, obj):
        return CommercialUnit.objects.filter(floor__building=obj).count()

    def get_occupied_units(self, obj):
        return CommercialUnit.objects.filter(
            floor__building=obj, is_available=False
        ).count()

    def get_occupancy_rate(self, obj):
        total = self.get_units_count(obj)
        if total == 0:
            return 0
        occupied = self.get_occupied_units(obj)
        return round((occupied / total) * 100, 1)

    def get_monthly_income(self, obj):
        # Sum of monthly rent from all active leases in this building
        total = Decimal("0.00")
        active_leases = CommercialLease.objects.filter(
            unit__floor__building=obj,
            status=CommercialLease.Status.ACTIVE,
        )
        for lease in active_leases:
            total += lease.monthly_rent
        return total


class CommercialBuildingDetailSerializer(serializers.ModelSerializer):
    """Serializer for building detail view with nested floors."""

    full_address = serializers.CharField(read_only=True)
    floors = CommercialFloorSerializer(many=True, read_only=True)
    floors_count = serializers.SerializerMethodField()
    units_count = serializers.SerializerMethodField()
    occupied_units = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()
    monthly_income = serializers.SerializerMethodField()

    class Meta:
        model = CommercialBuilding
        fields = [
            "id",
            "name",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "full_address",
            "total_sqft",
            "floors",
            "floors_count",
            "units_count",
            "occupied_units",
            "occupancy_rate",
            "monthly_income",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_floors_count(self, obj):
        return obj.floors.count()

    def get_units_count(self, obj):
        return CommercialUnit.objects.filter(floor__building=obj).count()

    def get_occupied_units(self, obj):
        return CommercialUnit.objects.filter(
            floor__building=obj, is_available=False
        ).count()

    def get_occupancy_rate(self, obj):
        total = self.get_units_count(obj)
        if total == 0:
            return 0
        occupied = self.get_occupied_units(obj)
        return round((occupied / total) * 100, 1)

    def get_monthly_income(self, obj):
        total = Decimal("0.00")
        active_leases = CommercialLease.objects.filter(
            unit__floor__building=obj,
            status=CommercialLease.Status.ACTIVE,
        )
        for lease in active_leases:
            total += lease.monthly_rent
        return total


class CommercialBuildingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating buildings."""

    class Meta:
        model = CommercialBuilding
        fields = [
            "name",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "total_sqft",
            "is_active",
        ]


# -----------------------------------------------------------------------
# Dashboard
# -----------------------------------------------------------------------


class BuildingDashboardSerializer(serializers.Serializer):
    """Dashboard data for a single building."""

    building_id = serializers.UUIDField()
    building_name = serializers.CharField()
    total_sqft = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )
    floors_count = serializers.IntegerField()
    units_count = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    available_units = serializers.IntegerField()
    occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=1)
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    annual_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    leases_expiring_soon = serializers.IntegerField()
    vacant_sqft = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )


class CommercialDashboardSerializer(serializers.Serializer):
    """Overall dashboard for all commercial buildings."""

    total_buildings = serializers.IntegerField()
    total_units = serializers.IntegerField()
    total_occupied = serializers.IntegerField()
    total_available = serializers.IntegerField()
    overall_occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=1)
    total_monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_annual_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    buildings = BuildingDashboardSerializer(many=True)


# -----------------------------------------------------------------------
# Payment Summary Serializers
# -----------------------------------------------------------------------


class MonthPaymentStatusSerializer(serializers.Serializer):
    """Payment status for a single month."""

    month = serializers.IntegerField()
    paid = serializers.BooleanField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    payment_date = serializers.DateField(allow_null=True)


class UnitPaymentSummarySerializer(serializers.Serializer):
    """Payment summary for a single unit."""

    id = serializers.UUIDField()
    unit_number = serializers.CharField()
    floor_number = serializers.IntegerField()
    tenant_name = serializers.CharField(allow_null=True)
    business_name = serializers.CharField(allow_null=True)
    monthly_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    months_status = MonthPaymentStatusSerializer(many=True)
    total_expected_ytd = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid_ytd = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2)


class FloorPaymentSummarySerializer(serializers.Serializer):
    """Payment summary for a single floor."""

    id = serializers.UUIDField()
    floor_number = serializers.IntegerField()
    display_name = serializers.CharField()
    expected_monthly = serializers.DecimalField(max_digits=12, decimal_places=2)
    collected_ytd = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_ytd = serializers.DecimalField(max_digits=12, decimal_places=2)
    units_paid = serializers.IntegerField()
    units_pending = serializers.IntegerField()


class DelinquentTenantSerializer(serializers.Serializer):
    """Delinquent tenant information."""

    unit_id = serializers.UUIDField()
    unit_number = serializers.CharField()
    tenant_name = serializers.CharField()
    business_name = serializers.CharField(allow_null=True)
    months_owed = serializers.ListField(child=serializers.IntegerField())
    total_owed = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_rent = serializers.DecimalField(max_digits=12, decimal_places=2)


class BuildingPaymentSummarySerializer(serializers.Serializer):
    """Complete payment summary for a building."""

    year = serializers.IntegerField()
    month = serializers.IntegerField(allow_null=True)
    building = serializers.DictField()
    floors = FloorPaymentSummarySerializer(many=True)
    units = UnitPaymentSummarySerializer(many=True)
    delinquent = DelinquentTenantSerializer(many=True)
