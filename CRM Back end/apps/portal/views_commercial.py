"""
Views for Commercial Buildings in the Client Portal.
"""

import calendar
from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.portal.models_commercial import (
    CommercialBuilding,
    CommercialFloor,
    CommercialLease,
    CommercialPayment,
    CommercialTenant,
    CommercialUnit,
)
from apps.portal.permissions import IsPortalAuthenticated
from apps.portal.serializers_commercial import (
    BuildingDashboardSerializer,
    BuildingPaymentSummarySerializer,
    CommercialBuildingCreateSerializer,
    CommercialBuildingDetailSerializer,
    CommercialBuildingListSerializer,
    CommercialDashboardSerializer,
    CommercialFloorCreateSerializer,
    CommercialFloorSerializer,
    CommercialLeaseCreateSerializer,
    CommercialLeaseSerializer,
    CommercialPaymentCreateSerializer,
    CommercialPaymentSerializer,
    CommercialTenantCreateSerializer,
    CommercialTenantSerializer,
    CommercialUnitCreateSerializer,
    CommercialUnitSerializer,
)
from apps.portal.services.licensing import LicensingService


def _calculate_building_dashboard(building):
    """Calculate dashboard data for a single building."""
    floors_count = building.floors.count()
    units = CommercialUnit.objects.filter(floor__building=building)
    units_count = units.count()
    occupied_units = units.filter(is_available=False).count()
    available_units = units_count - occupied_units

    # Calculate occupancy rate
    occupancy_rate = Decimal("0.0")
    if units_count > 0:
        occupancy_rate = Decimal(str(round((occupied_units / units_count) * 100, 1)))

    # Calculate monthly income from active leases
    monthly_income = Decimal("0.00")
    active_leases = CommercialLease.objects.filter(
        unit__floor__building=building,
        status=CommercialLease.Status.ACTIVE,
    )
    for lease in active_leases:
        monthly_income += lease.monthly_rent

    annual_income = monthly_income * 12

    # Count leases expiring in next 90 days
    today = timezone.now().date()
    ninety_days = today + timezone.timedelta(days=90)
    leases_expiring_soon = active_leases.filter(
        end_date__gte=today,
        end_date__lte=ninety_days,
    ).count()

    # Calculate vacant square footage
    vacant_sqft = Decimal("0.00")
    for unit in units.filter(is_available=True):
        if unit.sqft:
            vacant_sqft += unit.sqft

    return {
        "building_id": building.id,
        "building_name": building.name,
        "total_sqft": building.total_sqft,
        "floors_count": floors_count,
        "units_count": units_count,
        "occupied_units": occupied_units,
        "available_units": available_units,
        "occupancy_rate": occupancy_rate,
        "monthly_income": monthly_income,
        "annual_income": annual_income,
        "leases_expiring_soon": leases_expiring_soon,
        "vacant_sqft": vacant_sqft,
    }


def _get_expected_months(lease, year):
    """
    Return list of months that the tenant should pay in the given year.
    Considers start_date and end_date of the lease contract.
    """
    months = []
    for month in range(1, 13):
        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])

        # Month should be paid if the lease is active at any point during the month
        if lease.start_date <= month_end and lease.end_date >= month_start:
            months.append(month)

    return months


def _get_paid_months(lease, year):
    """
    Return dict of {month: payment_info} for months paid in the given year.
    """
    payments = CommercialPayment.objects.filter(
        lease=lease,
        payment_year=year,
    )
    result = {}
    for payment in payments:
        # If multiple payments for same month, sum them
        if payment.payment_month in result:
            result[payment.payment_month]["amount"] += payment.amount
            # Keep the latest payment date
            if payment.payment_date > result[payment.payment_month]["date"]:
                result[payment.payment_month]["date"] = payment.payment_date
        else:
            result[payment.payment_month] = {
                "amount": payment.amount,
                "date": payment.payment_date,
            }
    return result


def _calculate_payment_summary(building, year, month=None):
    """Calculate payment summary for a building."""
    today = timezone.now().date()
    current_month = (
        today.month if today.year == year else (12 if today.year > year else 0)
    )

    # Get all units in the building
    units = (
        CommercialUnit.objects.filter(floor__building=building)
        .select_related("floor")
        .prefetch_related("tenants", "leases", "leases__payments")
    )

    # Calculate totals
    building_expected_monthly = Decimal("0.00")
    building_expected_ytd = Decimal("0.00")
    building_collected_ytd = Decimal("0.00")

    floors_data = {}
    units_data = []
    delinquent_data = []

    for unit in units:
        floor = unit.floor
        if floor.id not in floors_data:
            floors_data[floor.id] = {
                "id": floor.id,
                "floor_number": floor.floor_number,
                "display_name": floor.display_name,
                "expected_monthly": Decimal("0.00"),
                "collected_ytd": Decimal("0.00"),
                "pending_ytd": Decimal("0.00"),
                "units_paid": 0,
                "units_pending": 0,
            }

        # Get current active lease
        lease = unit.leases.filter(status=CommercialLease.Status.ACTIVE).first()
        if not lease:
            continue

        tenant = unit.current_tenant
        if not tenant:
            continue

        monthly_rent = lease.monthly_rent
        building_expected_monthly += monthly_rent
        floors_data[floor.id]["expected_monthly"] += monthly_rent

        # Get expected and paid months
        expected_months = _get_expected_months(lease, year)
        paid_months = _get_paid_months(lease, year)

        # Calculate months to consider (up to current month or specified month)
        max_month = month if month else current_month

        # Build months status
        months_status = []
        total_expected = Decimal("0.00")
        total_paid = Decimal("0.00")
        owed_months = []

        for m in expected_months:
            if m in paid_months:
                months_status.append(
                    {
                        "month": m,
                        "paid": True,
                        "amount": paid_months[m]["amount"],
                        "payment_date": paid_months[m]["date"],
                    }
                )
                total_paid += paid_months[m]["amount"]
            else:
                months_status.append(
                    {
                        "month": m,
                        "paid": False,
                        "amount": None,
                        "payment_date": None,
                    }
                )
            # Count as expected only for months up to current
            if m <= max_month:
                total_expected += monthly_rent
                if m not in paid_months and m < current_month:
                    owed_months.append(m)

        # Add to building totals
        building_expected_ytd += total_expected
        building_collected_ytd += total_paid
        floors_data[floor.id]["collected_ytd"] += total_paid
        floors_data[floor.id]["pending_ytd"] += total_expected - total_paid

        # Check if unit is fully paid for the period
        if total_paid >= total_expected:
            floors_data[floor.id]["units_paid"] += 1
        else:
            floors_data[floor.id]["units_pending"] += 1

        # Build unit data
        units_data.append(
            {
                "id": unit.id,
                "unit_number": unit.unit_number,
                "floor_number": floor.floor_number,
                "tenant_name": tenant.tenant_name if tenant else None,
                "business_name": tenant.business_name if tenant else None,
                "monthly_rent": monthly_rent,
                "months_status": months_status,
                "total_expected_ytd": total_expected,
                "total_paid_ytd": total_paid,
                "balance_due": max(Decimal("0.00"), total_expected - total_paid),
            }
        )

        # Add to delinquent if has owed months
        if owed_months:
            delinquent_data.append(
                {
                    "unit_id": unit.id,
                    "unit_number": unit.unit_number,
                    "tenant_name": tenant.tenant_name if tenant else "Unknown",
                    "business_name": tenant.business_name if tenant else None,
                    "months_owed": owed_months,
                    "total_owed": len(owed_months) * monthly_rent,
                    "monthly_rent": monthly_rent,
                }
            )

    # Calculate collection rate
    collection_rate = Decimal("0.0")
    if building_expected_ytd > 0:
        collection_rate = (building_collected_ytd / building_expected_ytd) * 100

    return {
        "year": year,
        "month": month,
        "building": {
            "id": str(building.id),
            "name": building.name,
            "expected_monthly": building_expected_monthly,
            "expected_ytd": building_expected_ytd,
            "collected_ytd": building_collected_ytd,
            "pending_ytd": building_expected_ytd - building_collected_ytd,
            "collection_rate": round(collection_rate, 1),
        },
        "floors": sorted(floors_data.values(), key=lambda x: x["floor_number"]),
        "units": sorted(
            units_data, key=lambda x: (x["floor_number"], x["unit_number"])
        ),
        "delinquent": sorted(delinquent_data, key=lambda x: -x["total_owed"]),
    }


# -----------------------------------------------------------------------
# Buildings ViewSet
# -----------------------------------------------------------------------


class PortalCommercialBuildingViewSet(viewsets.ViewSet):
    """CRUD operations for commercial buildings."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        """List all buildings for the portal client."""
        buildings = CommercialBuilding.objects.filter(
            contact_id=request.portal_contact_id,
            is_active=True,
        ).order_by("name")

        serializer = CommercialBuildingListSerializer(buildings, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get a single building with floors and units."""
        try:
            building = CommercialBuilding.objects.prefetch_related(
                "floors__units__tenants",
                "floors__units__leases",
            ).get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except CommercialBuilding.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialBuildingDetailSerializer(building)
        return Response(serializer.data)

    def create(self, request):
        """Create a new building."""
        # Check licensing limit
        contact = request.portal_access.contact
        can_create, error_msg = LicensingService.can_create_building(contact)
        if not can_create:
            return Response(
                {"detail": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CommercialBuildingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        building = CommercialBuilding.objects.create(
            contact_id=request.portal_contact_id,
            **serializer.validated_data,
        )

        return Response(
            CommercialBuildingDetailSerializer(building).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        """Update a building."""
        try:
            building = CommercialBuilding.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except CommercialBuilding.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialBuildingCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(building, field, value)
        building.save()

        return Response(CommercialBuildingDetailSerializer(building).data)

    def partial_update(self, request, pk=None):
        """Partial update a building."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete (deactivate) a building."""
        try:
            building = CommercialBuilding.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except CommercialBuilding.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Soft delete
        building.is_active = False
        building.save(update_fields=["is_active", "updated_at"])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        """Get dashboard data for a single building."""
        try:
            building = CommercialBuilding.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except CommercialBuilding.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        dashboard_data = _calculate_building_dashboard(building)
        serializer = BuildingDashboardSerializer(dashboard_data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="payment-summary")
    def payment_summary(self, request, pk=None):
        """
        Get payment summary for a building.

        Query params:
        - year: Year to query (default: current year)
        - month: Specific month (optional, if not sent shows full year)
        """
        try:
            building = CommercialBuilding.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except CommercialBuilding.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Get year from query params (default: current year)
        year = request.query_params.get("year")
        if year:
            try:
                year = int(year)
            except ValueError:
                return Response(
                    {"detail": "Invalid year parameter"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            year = timezone.now().year

        # Get month from query params (optional)
        month = request.query_params.get("month")
        if month:
            try:
                month = int(month)
                if month < 1 or month > 12:
                    raise ValueError()
            except ValueError:
                return Response(
                    {"detail": "Invalid month parameter (must be 1-12)"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            month = None

        summary = _calculate_payment_summary(building, year, month)
        serializer = BuildingPaymentSummarySerializer(summary)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def floors(self, request, pk=None):
        """List or create floors for a building."""
        try:
            building = CommercialBuilding.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except CommercialBuilding.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            floors = building.floors.prefetch_related("units").all()
            serializer = CommercialFloorSerializer(floors, many=True)
            return Response(serializer.data)

        # POST - create a new floor
        # Check licensing limit
        contact = request.portal_access.contact
        can_create, error_msg = LicensingService.can_create_floor(contact, building)
        if not can_create:
            return Response(
                {"detail": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CommercialFloorCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Remove building from validated_data if present (we set it ourselves)
        validated_data = serializer.validated_data.copy()
        validated_data.pop("building", None)

        floor = CommercialFloor.objects.create(
            building=building,
            **validated_data,
        )

        return Response(
            CommercialFloorSerializer(floor).data,
            status=status.HTTP_201_CREATED,
        )


# -----------------------------------------------------------------------
# Floors ViewSet
# -----------------------------------------------------------------------


class PortalCommercialFloorViewSet(viewsets.ViewSet):
    """CRUD operations for commercial floors."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def _get_floor(self, request, pk):
        """Helper to get a floor that belongs to the contact."""
        try:
            return CommercialFloor.objects.select_related("building").get(
                pk=pk,
                building__contact_id=request.portal_contact_id,
            )
        except CommercialFloor.DoesNotExist:
            return None

    def retrieve(self, request, pk=None):
        """Get a single floor with units."""
        floor = self._get_floor(request, pk)
        if not floor:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialFloorSerializer(floor)
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update a floor."""
        floor = self._get_floor(request, pk)
        if not floor:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialFloorCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Don't allow changing the building
        validated_data = serializer.validated_data.copy()
        validated_data.pop("building", None)

        for field, value in validated_data.items():
            setattr(floor, field, value)
        floor.save()

        return Response(CommercialFloorSerializer(floor).data)

    def partial_update(self, request, pk=None):
        """Partial update a floor."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a floor (only if no units)."""
        floor = self._get_floor(request, pk)
        if not floor:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if floor.units.exists():
            return Response(
                {"detail": "Cannot delete floor that has units."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        floor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"])
    def units(self, request, pk=None):
        """List or create units for a floor."""
        floor = self._get_floor(request, pk)
        if not floor:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            units = floor.units.prefetch_related("tenants", "leases").all()
            serializer = CommercialUnitSerializer(units, many=True)
            return Response(serializer.data)

        # POST - create a new unit
        # Check licensing limit
        contact = request.portal_access.contact
        building = floor.building
        can_create, error_msg = LicensingService.can_create_unit(contact, building)
        if not can_create:
            return Response(
                {"detail": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CommercialUnitCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data.copy()
        validated_data.pop("floor", None)

        unit = CommercialUnit.objects.create(
            floor=floor,
            **validated_data,
        )

        return Response(
            CommercialUnitSerializer(unit).data,
            status=status.HTTP_201_CREATED,
        )


# -----------------------------------------------------------------------
# Units ViewSet
# -----------------------------------------------------------------------


class PortalCommercialUnitViewSet(viewsets.ViewSet):
    """CRUD operations for commercial units."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def _get_unit(self, request, pk):
        """Helper to get a unit that belongs to the contact."""
        try:
            return CommercialUnit.objects.select_related(
                "floor", "floor__building"
            ).get(
                pk=pk,
                floor__building__contact_id=request.portal_contact_id,
            )
        except CommercialUnit.DoesNotExist:
            return None

    def retrieve(self, request, pk=None):
        """Get a single unit with tenant and lease info."""
        unit = self._get_unit(request, pk)
        if not unit:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialUnitSerializer(unit)
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update a unit."""
        unit = self._get_unit(request, pk)
        if not unit:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialUnitCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data.copy()
        validated_data.pop("floor", None)

        for field, value in validated_data.items():
            setattr(unit, field, value)
        unit.save()

        return Response(CommercialUnitSerializer(unit).data)

    def partial_update(self, request, pk=None):
        """Partial update a unit."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a unit (only if no tenants/leases)."""
        unit = self._get_unit(request, pk)
        if not unit:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if unit.tenants.exists() or unit.leases.exists():
            return Response(
                {"detail": "Cannot delete unit that has tenants or leases."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unit.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"])
    def tenant(self, request, pk=None):
        """Get current tenant or create a new tenant for a unit."""
        unit = self._get_unit(request, pk)
        if not unit:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            tenant = unit.current_tenant
            if not tenant:
                return Response(
                    {"detail": "No current tenant for this unit."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = CommercialTenantSerializer(tenant)
            return Response(serializer.data)

        # POST - create a new tenant
        serializer = CommercialTenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Mark previous tenants as not current
        unit.tenants.filter(is_current=True).update(is_current=False)

        # Mark unit as not available
        unit.is_available = False
        unit.save(update_fields=["is_available", "updated_at"])

        tenant = CommercialTenant.objects.create(
            unit=unit,
            **serializer.validated_data,
        )

        return Response(
            CommercialTenantSerializer(tenant).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"])
    def leases(self, request, pk=None):
        """List leases or create a new lease for a unit."""
        unit = self._get_unit(request, pk)
        if not unit:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            leases = unit.leases.select_related("tenant").all()
            serializer = CommercialLeaseSerializer(
                leases, many=True, context={"request": request}
            )
            return Response(serializer.data)

        # POST - create a new lease
        serializer = CommercialLeaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data.copy()
        validated_data.pop("unit", None)

        # Mark previous active leases as expired
        unit.leases.filter(status=CommercialLease.Status.ACTIVE).update(
            status=CommercialLease.Status.EXPIRED
        )

        lease = CommercialLease.objects.create(
            unit=unit,
            **validated_data,
        )

        return Response(
            CommercialLeaseSerializer(lease, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# -----------------------------------------------------------------------
# Tenants ViewSet
# -----------------------------------------------------------------------


class PortalCommercialTenantViewSet(viewsets.ViewSet):
    """CRUD operations for commercial tenants."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def _get_tenant(self, request, pk):
        """Helper to get a tenant that belongs to the contact."""
        try:
            return CommercialTenant.objects.select_related(
                "unit", "unit__floor", "unit__floor__building"
            ).get(
                pk=pk,
                unit__floor__building__contact_id=request.portal_contact_id,
            )
        except CommercialTenant.DoesNotExist:
            return None

    def retrieve(self, request, pk=None):
        """Get a single tenant."""
        tenant = self._get_tenant(request, pk)
        if not tenant:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialTenantSerializer(tenant)
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update a tenant."""
        tenant = self._get_tenant(request, pk)
        if not tenant:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialTenantCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(tenant, field, value)
        tenant.save()

        # If tenant is no longer current, update unit availability
        if not tenant.is_current:
            # Check if there are other current tenants
            if not tenant.unit.tenants.filter(is_current=True).exists():
                tenant.unit.is_available = True
                tenant.unit.save(update_fields=["is_available", "updated_at"])

        return Response(CommercialTenantSerializer(tenant).data)

    def partial_update(self, request, pk=None):
        """Partial update a tenant."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a tenant (only if no leases)."""
        tenant = self._get_tenant(request, pk)
        if not tenant:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if tenant.leases.exists():
            return Response(
                {"detail": "Cannot delete tenant that has leases."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unit = tenant.unit
        tenant.delete()

        # Update unit availability if no more current tenants
        if not unit.tenants.filter(is_current=True).exists():
            unit.is_available = True
            unit.save(update_fields=["is_available", "updated_at"])

        return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------
# Leases ViewSet
# -----------------------------------------------------------------------


class PortalCommercialLeaseViewSet(viewsets.ViewSet):
    """CRUD operations for commercial leases."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def _get_lease(self, request, pk):
        """Helper to get a lease that belongs to the contact."""
        try:
            return CommercialLease.objects.select_related(
                "unit", "tenant", "unit__floor__building"
            ).get(
                pk=pk,
                unit__floor__building__contact_id=request.portal_contact_id,
            )
        except CommercialLease.DoesNotExist:
            return None

    def retrieve(self, request, pk=None):
        """Get a single lease."""
        lease = self._get_lease(request, pk)
        if not lease:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialLeaseSerializer(lease, context={"request": request})
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update a lease."""
        lease = self._get_lease(request, pk)
        if not lease:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialLeaseCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data.copy()
        validated_data.pop("unit", None)
        validated_data.pop("tenant", None)

        for field, value in validated_data.items():
            setattr(lease, field, value)
        lease.save()

        return Response(
            CommercialLeaseSerializer(lease, context={"request": request}).data
        )

    def partial_update(self, request, pk=None):
        """Partial update a lease."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a lease (only if no payments)."""
        lease = self._get_lease(request, pk)
        if not lease:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if lease.payments.exists():
            return Response(
                {"detail": "Cannot delete lease that has payments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lease.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        """Renew a lease with the configured increase percentage."""
        lease = self._get_lease(request, pk)
        if not lease:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Calculate new rent
        new_rent = lease.next_rent_after_renewal

        # Get new dates from request or calculate from current end date
        new_start_date = request.data.get("start_date", str(lease.end_date))
        months = int(request.data.get("months", 12))

        # Parse new start date
        from datetime import datetime, timedelta

        if isinstance(new_start_date, str):
            new_start = datetime.strptime(new_start_date, "%Y-%m-%d").date()
        else:
            new_start = new_start_date

        # Calculate end date
        new_end = new_start + timedelta(days=months * 30)

        # Mark old lease as expired
        lease.status = CommercialLease.Status.EXPIRED
        lease.save(update_fields=["status", "updated_at"])

        # Create new lease
        new_lease = CommercialLease.objects.create(
            unit=lease.unit,
            tenant=lease.tenant,
            start_date=new_start,
            end_date=new_end,
            monthly_rent=new_rent,
            renewal_increase_percent=lease.renewal_increase_percent,
            status=CommercialLease.Status.ACTIVE,
        )

        return Response(
            CommercialLeaseSerializer(new_lease, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"])
    def payments(self, request, pk=None):
        """List payments or create a new payment for a lease."""
        lease = self._get_lease(request, pk)
        if not lease:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            # Optional filtering by year
            year = request.query_params.get("year")
            payments = lease.payments.all()
            if year:
                payments = payments.filter(payment_year=int(year))

            serializer = CommercialPaymentSerializer(
                payments, many=True, context={"request": request}
            )
            return Response(serializer.data)

        # POST - create a new payment
        serializer = CommercialPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data.copy()
        validated_data.pop("lease", None)

        payment = CommercialPayment.objects.create(
            lease=lease,
            **validated_data,
        )

        return Response(
            CommercialPaymentSerializer(payment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# -----------------------------------------------------------------------
# Payments ViewSet
# -----------------------------------------------------------------------


class PortalCommercialPaymentViewSet(viewsets.ViewSet):
    """CRUD operations for commercial payments."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def _get_payment(self, request, pk):
        """Helper to get a payment that belongs to the contact."""
        try:
            return CommercialPayment.objects.select_related(
                "lease", "lease__unit__floor__building"
            ).get(
                pk=pk,
                lease__unit__floor__building__contact_id=request.portal_contact_id,
            )
        except CommercialPayment.DoesNotExist:
            return None

    def retrieve(self, request, pk=None):
        """Get a single payment."""
        payment = self._get_payment(request, pk)
        if not payment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialPaymentSerializer(payment, context={"request": request})
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update a payment."""
        payment = self._get_payment(request, pk)
        if not payment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CommercialPaymentCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data.copy()
        validated_data.pop("lease", None)

        for field, value in validated_data.items():
            setattr(payment, field, value)
        payment.save()

        return Response(
            CommercialPaymentSerializer(payment, context={"request": request}).data
        )

    def partial_update(self, request, pk=None):
        """Partial update a payment."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a payment."""
        payment = self._get_payment(request, pk)
        if not payment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------
# Dashboard View
# -----------------------------------------------------------------------


class PortalCommercialDashboardView(APIView):
    """Dashboard data for all commercial buildings."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def get(self, request):
        """Get dashboard summary for all commercial buildings."""
        contact_id = request.portal_contact_id

        buildings = CommercialBuilding.objects.filter(
            contact_id=contact_id,
            is_active=True,
        )

        # Calculate totals
        buildings_data = []
        total_units = 0
        total_occupied = 0
        total_monthly_income = Decimal("0.00")

        for building in buildings:
            dashboard = _calculate_building_dashboard(building)
            buildings_data.append(dashboard)
            total_units += dashboard["units_count"]
            total_occupied += dashboard["occupied_units"]
            total_monthly_income += dashboard["monthly_income"]

        total_available = total_units - total_occupied
        overall_occupancy = Decimal("0.0")
        if total_units > 0:
            overall_occupancy = Decimal(
                str(round((total_occupied / total_units) * 100, 1))
            )

        dashboard_data = {
            "total_buildings": len(buildings_data),
            "total_units": total_units,
            "total_occupied": total_occupied,
            "total_available": total_available,
            "overall_occupancy_rate": overall_occupancy,
            "total_monthly_income": total_monthly_income,
            "total_annual_income": total_monthly_income * 12,
            "buildings": buildings_data,
        }

        serializer = CommercialDashboardSerializer(dashboard_data)
        return Response(serializer.data)
