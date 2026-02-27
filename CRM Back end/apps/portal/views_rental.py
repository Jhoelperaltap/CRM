"""
Views for Rental Properties in the Client Portal.
"""

import csv
from collections import defaultdict
from decimal import Decimal
from io import StringIO

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.portal.models_rental import (
    RentalExpenseCategory,
    RentalProperty,
    RentalTransaction,
)
from apps.portal.permissions import IsPortalAuthenticated
from apps.portal.serializers_rental import (
    RentalExpenseCategoryCreateSerializer,
    RentalExpenseCategorySerializer,
    RentalMonthlySummarySerializer,
    RentalPropertyCreateSerializer,
    RentalPropertyDetailSerializer,
    RentalPropertyListSerializer,
    RentalTransactionCreateSerializer,
    RentalTransactionSerializer,
    RentalDashboardSerializer,
)


# Month mapping for summary calculations
MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def _empty_monthly_values():
    """Return a dict with zero values for all months."""
    return {month: Decimal("0.00") for month in MONTH_NAMES + ["total"]}


def _calculate_property_summary(property_obj, year):
    """
    Calculate monthly summary for a property in a given year.
    Returns data suitable for the Excel-like grid view.
    """
    # Get all transactions for this property and year
    transactions = RentalTransaction.objects.filter(
        property=property_obj,
        transaction_date__year=year,
    ).select_related("category")

    # Initialize data structures
    income = _empty_monthly_values()
    expenses_by_category = defaultdict(lambda: _empty_monthly_values())
    total_expenses = _empty_monthly_values()

    # Process transactions
    for txn in transactions:
        month_idx = txn.transaction_date.month - 1
        month_name = MONTH_NAMES[month_idx]
        amount = txn.amount

        if txn.transaction_type == RentalTransaction.TransactionType.INCOME:
            income[month_name] += amount
            income["total"] += amount
        else:  # EXPENSE
            if txn.category:
                category_key = str(txn.category_id)
                expenses_by_category[category_key][month_name] += amount
                expenses_by_category[category_key]["total"] += amount
                expenses_by_category[category_key]["_category"] = txn.category

            total_expenses[month_name] += amount
            total_expenses["total"] += amount

    # Calculate net cash flow (income - expenses)
    net_cash_flow = _empty_monthly_values()
    for month in MONTH_NAMES + ["total"]:
        net_cash_flow[month] = income[month] - total_expenses[month]

    # Build expense categories list with all active categories
    contact = property_obj.contact
    all_categories = RentalExpenseCategory.objects.filter(
        is_active=True
    ).filter(
        # System categories OR this contact's categories
        contact__isnull=True
    ) | RentalExpenseCategory.objects.filter(
        is_active=True,
        contact=contact,
    )
    all_categories = all_categories.order_by("sort_order", "name")

    expenses_list = []
    for cat in all_categories:
        cat_key = str(cat.id)
        if cat_key in expenses_by_category:
            values = expenses_by_category[cat_key]
        else:
            values = _empty_monthly_values()

        expenses_list.append({
            "category_id": cat.id,
            "category_name": cat.name,
            "category_slug": cat.slug,
            "values": {k: v for k, v in values.items() if k != "_category"},
        })

    return {
        "year": year,
        "property_id": property_obj.id,
        "property_name": property_obj.name,
        "income": income,
        "expenses": expenses_list,
        "total_expenses": total_expenses,
        "net_cash_flow": net_cash_flow,
    }


def _calculate_ytd_for_property(property_obj, year):
    """Calculate YTD totals for a property."""
    aggregates = RentalTransaction.objects.filter(
        property=property_obj,
        transaction_date__year=year,
    ).aggregate(
        total_income=Sum("credit_amount"),
        total_expenses=Sum("debit_amount"),
    )

    total_income = aggregates["total_income"] or Decimal("0.00")
    total_expenses = aggregates["total_expenses"] or Decimal("0.00")

    return {
        "ytd_income": total_income,
        "ytd_expenses": total_expenses,
        "ytd_net_profit": total_income - total_expenses,
    }


# -----------------------------------------------------------------------
# Properties ViewSet
# -----------------------------------------------------------------------


class PortalRentalPropertyViewSet(viewsets.ViewSet):
    """CRUD operations for rental properties."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        """List all properties for the portal client with YTD summary."""
        year = int(request.query_params.get("year", timezone.now().year))

        properties = RentalProperty.objects.filter(
            contact_id=request.portal_contact_id,
            is_active=True,
        ).order_by("name")

        # Add YTD data to each property
        data = []
        for prop in properties:
            ytd = _calculate_ytd_for_property(prop, year)
            prop.ytd_income = ytd["ytd_income"]
            prop.ytd_expenses = ytd["ytd_expenses"]
            prop.ytd_net_profit = ytd["ytd_net_profit"]
            data.append(prop)

        serializer = RentalPropertyListSerializer(data, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get a single property."""
        try:
            prop = RentalProperty.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except RentalProperty.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = RentalPropertyDetailSerializer(prop)
        return Response(serializer.data)

    def create(self, request):
        """Create a new rental property."""
        serializer = RentalPropertyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        prop = RentalProperty.objects.create(
            contact_id=request.portal_contact_id,
            **serializer.validated_data,
        )

        return Response(
            RentalPropertyDetailSerializer(prop).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        """Update a rental property."""
        try:
            prop = RentalProperty.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except RentalProperty.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = RentalPropertyCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(prop, field, value)
        prop.save()

        return Response(RentalPropertyDetailSerializer(prop).data)

    def partial_update(self, request, pk=None):
        """Partial update a rental property."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete (deactivate) a rental property."""
        try:
            prop = RentalProperty.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except RentalProperty.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Soft delete
        prop.is_active = False
        prop.save(update_fields=["is_active", "updated_at"])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        """Get monthly summary for the Excel-like grid view."""
        try:
            prop = RentalProperty.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except RentalProperty.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        year = int(request.query_params.get("year", timezone.now().year))
        summary_data = _calculate_property_summary(prop, year)

        serializer = RentalMonthlySummarySerializer(summary_data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        """Export property transactions to CSV."""
        try:
            prop = RentalProperty.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
            )
        except RentalProperty.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        year = int(request.query_params.get("year", timezone.now().year))

        transactions = RentalTransaction.objects.filter(
            property=prop,
            transaction_date__year=year,
        ).select_related("category").order_by("transaction_date")

        # Create CSV
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "Date", "Type", "Category", "Amount", "Debit", "Credit", "Description"
        ])

        # Data rows
        for txn in transactions:
            writer.writerow([
                txn.transaction_date.strftime("%Y-%m-%d"),
                txn.get_transaction_type_display(),
                txn.category.name if txn.category else "",
                str(txn.amount),
                str(txn.debit_amount),
                str(txn.credit_amount),
                txn.description,
            ])

        # Create response
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        filename = f"{prop.name.replace(' ', '_')}_{year}_transactions.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response


# -----------------------------------------------------------------------
# Transactions ViewSet
# -----------------------------------------------------------------------


class PortalRentalTransactionViewSet(viewsets.ViewSet):
    """CRUD operations for rental transactions."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        """List transactions, optionally filtered by property, year, or month."""
        contact_id = request.portal_contact_id

        # Start with all transactions for this contact's properties
        qs = RentalTransaction.objects.filter(
            property__contact_id=contact_id,
        ).select_related("property", "category")

        # Filter by property if specified
        property_id = request.query_params.get("property")
        if property_id:
            qs = qs.filter(property_id=property_id)

        # Filter by year
        year = request.query_params.get("year")
        if year:
            qs = qs.filter(transaction_date__year=int(year))

        # Filter by month
        month = request.query_params.get("month")
        if month:
            qs = qs.filter(transaction_date__month=int(month))

        # Filter by type
        transaction_type = request.query_params.get("type")
        if transaction_type:
            qs = qs.filter(transaction_type=transaction_type)

        # Filter by category
        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        qs = qs.order_by("-transaction_date", "-created_at")

        serializer = RentalTransactionSerializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get a single transaction."""
        try:
            txn = RentalTransaction.objects.select_related("property", "category").get(
                pk=pk,
                property__contact_id=request.portal_contact_id,
            )
        except RentalTransaction.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = RentalTransactionSerializer(txn)
        return Response(serializer.data)

    def create(self, request):
        """Create a new transaction."""
        serializer = RentalTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verify property belongs to this contact
        property_id = serializer.validated_data.get("property")
        if property_id:
            try:
                prop = RentalProperty.objects.get(
                    id=property_id.id if hasattr(property_id, "id") else property_id,
                    contact_id=request.portal_contact_id,
                )
            except RentalProperty.DoesNotExist:
                return Response(
                    {"property": ["Property not found."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        txn = serializer.save()

        return Response(
            RentalTransactionSerializer(txn).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        """Update a transaction."""
        try:
            txn = RentalTransaction.objects.get(
                pk=pk,
                property__contact_id=request.portal_contact_id,
            )
        except RentalTransaction.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = RentalTransactionCreateSerializer(
            txn, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(RentalTransactionSerializer(txn).data)

    def partial_update(self, request, pk=None):
        """Partial update a transaction."""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a transaction."""
        try:
            txn = RentalTransaction.objects.get(
                pk=pk,
                property__contact_id=request.portal_contact_id,
            )
        except RentalTransaction.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        txn.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------
# Categories ViewSet
# -----------------------------------------------------------------------


class PortalRentalCategoryViewSet(viewsets.ViewSet):
    """List and create expense categories."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def list(self, request):
        """List all available categories (system + custom for this contact)."""
        contact_id = request.portal_contact_id

        categories = RentalExpenseCategory.objects.filter(
            is_active=True,
        ).filter(
            # System categories OR this contact's categories
            contact__isnull=True
        ) | RentalExpenseCategory.objects.filter(
            is_active=True,
            contact_id=contact_id,
        )

        categories = categories.order_by("sort_order", "name")

        serializer = RentalExpenseCategorySerializer(categories, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Create a custom category for this contact."""
        from apps.contacts.models import Contact

        contact_id = request.portal_contact_id
        contact = Contact.objects.get(id=contact_id)

        serializer = RentalExpenseCategoryCreateSerializer(
            data=request.data,
            context={"contact": contact},
        )
        serializer.is_valid(raise_exception=True)

        category = RentalExpenseCategory.objects.create(
            contact=contact,
            is_system=False,
            **serializer.validated_data,
        )

        return Response(
            RentalExpenseCategorySerializer(category).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, pk=None):
        """Delete a custom category (only if not system and not in use)."""
        try:
            category = RentalExpenseCategory.objects.get(
                pk=pk,
                contact_id=request.portal_contact_id,
                is_system=False,
            )
        except RentalExpenseCategory.DoesNotExist:
            return Response(
                {"detail": "Category not found or cannot be deleted."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if category is in use
        if category.transactions.exists():
            return Response(
                {"detail": "Cannot delete category that has transactions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------
# Dashboard View
# -----------------------------------------------------------------------


class PortalRentalDashboardView(APIView):
    """Dashboard data for all rental properties."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def get(self, request):
        """Get dashboard summary for all properties."""
        contact_id = request.portal_contact_id
        year = int(request.query_params.get("year", timezone.now().year))

        properties = RentalProperty.objects.filter(
            contact_id=contact_id,
            is_active=True,
        )

        # Calculate totals for each property
        properties_data = []
        total_income = Decimal("0.00")
        total_expenses = Decimal("0.00")

        for prop in properties:
            ytd = _calculate_ytd_for_property(prop, year)

            properties_data.append({
                "property_id": prop.id,
                "property_name": prop.name,
                "total_income": ytd["ytd_income"],
                "total_expenses": ytd["ytd_expenses"],
                "net_profit": ytd["ytd_net_profit"],
            })

            total_income += ytd["ytd_income"]
            total_expenses += ytd["ytd_expenses"]

        dashboard_data = {
            "year": year,
            "total_income": total_income,
            "total_expenses": total_expenses,
            "total_net_profit": total_income - total_expenses,
            "properties_count": len(properties_data),
            "properties": properties_data,
        }

        serializer = RentalDashboardSerializer(dashboard_data)
        return Response(serializer.data)
