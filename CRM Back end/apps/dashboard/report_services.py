"""
Report aggregation services.

Provides data for the dedicated report pages with support for
date filtering, grouping, and CSV export.
"""

import csv
import io
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, DecimalField, F, Q, Sum
from django.db.models.functions import (
    Coalesce,
    ExtractMonth,
    ExtractYear,
    TruncMonth,
    TruncQuarter,
    TruncYear,
)
from django.http import HttpResponse
from django.utils import timezone


def _get_models():
    from apps.cases.models import TaxCase
    from apps.contacts.models import Contact
    return TaxCase, Contact


def _parse_dates(date_from=None, date_to=None):
    now = timezone.now()
    if date_from is None:
        date_from = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if date_to is None:
        date_to = now
    return date_from, date_to


TRUNC_MAP = {
    "monthly": TruncMonth,
    "quarterly": TruncQuarter,
    "yearly": TruncYear,
}


# ---------------------------------------------------------------------------
# Revenue Report
# ---------------------------------------------------------------------------
def get_revenue_report(date_from=None, date_to=None, group_by="monthly", filters=None):
    """
    Revenue by period, filterable by preparer and case_type.
    Returns list of {"period": ..., "estimated": ..., "actual": ..., "count": ...}
    """
    TaxCase, _ = _get_models()
    date_from, date_to = _parse_dates(date_from, date_to)

    qs = TaxCase.objects.filter(created_at__gte=date_from, created_at__lte=date_to)

    if filters:
        if filters.get("case_type"):
            qs = qs.filter(case_type=filters["case_type"])
        if filters.get("preparer"):
            qs = qs.filter(assigned_preparer_id=filters["preparer"])
        if filters.get("status"):
            qs = qs.filter(status=filters["status"])

    trunc_fn = TRUNC_MAP.get(group_by, TruncMonth)

    rows = (
        qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(
            estimated=Coalesce(Sum("estimated_fee"), Decimal("0"), output_field=DecimalField()),
            actual=Coalesce(Sum("actual_fee"), Decimal("0"), output_field=DecimalField()),
            count=Count("id"),
        )
        .order_by("period")
    )

    totals = qs.aggregate(
        total_estimated=Coalesce(Sum("estimated_fee"), Decimal("0"), output_field=DecimalField()),
        total_actual=Coalesce(Sum("actual_fee"), Decimal("0"), output_field=DecimalField()),
        total_count=Count("id"),
    )

    return {
        "rows": [
            {
                "period": row["period"].strftime("%Y-%m-%d"),
                "estimated": float(row["estimated"]),
                "actual": float(row["actual"]),
                "count": row["count"],
            }
            for row in rows
        ],
        "totals": {
            "estimated": float(totals["total_estimated"]),
            "actual": float(totals["total_actual"]),
            "count": totals["total_count"],
        },
    }


# ---------------------------------------------------------------------------
# Case Report
# ---------------------------------------------------------------------------
def get_case_report(date_from=None, date_to=None, filters=None):
    """
    Case analytics: completion rate, status breakdown, aging buckets.
    """
    TaxCase, _ = _get_models()
    date_from, date_to = _parse_dates(date_from, date_to)
    today = timezone.now().date()

    qs = TaxCase.objects.filter(created_at__gte=date_from, created_at__lte=date_to)
    if filters:
        if filters.get("case_type"):
            qs = qs.filter(case_type=filters["case_type"])
        if filters.get("preparer"):
            qs = qs.filter(assigned_preparer_id=filters["preparer"])

    total = qs.count()
    completed = qs.filter(status="completed").count()
    completion_rate = round(completed / total * 100) if total else 0

    status_breakdown = list(
        qs.values("status").annotate(count=Count("id")).order_by("status")
    )

    # Aging buckets for active cases
    active_qs = qs.filter(status__in=["new", "in_progress", "under_review"])
    buckets = {"0-30": 0, "30-60": 0, "60-90": 0, "90+": 0}
    for case in active_qs.only("created_at"):
        age = (today - case.created_at.date()).days
        if age <= 30:
            buckets["0-30"] += 1
        elif age <= 60:
            buckets["30-60"] += 1
        elif age <= 90:
            buckets["60-90"] += 1
        else:
            buckets["90+"] += 1

    by_type = list(
        qs.values("case_type").annotate(count=Count("id")).order_by("-count")
    )

    return {
        "total": total,
        "completed": completed,
        "completion_rate": completion_rate,
        "status_breakdown": status_breakdown,
        "aging_buckets": [
            {"bucket": k, "count": v} for k, v in buckets.items()
        ],
        "by_type": by_type,
    }


# ---------------------------------------------------------------------------
# Preparer Performance
# ---------------------------------------------------------------------------
def get_preparer_performance(date_from=None, date_to=None):
    """
    Per-preparer: cases assigned, completed, avg completion time, revenue.
    """
    TaxCase, _ = _get_models()
    date_from, date_to = _parse_dates(date_from, date_to)

    rows = (
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
            assigned_preparer__isnull=False,
        )
        .values(
            preparer_id=F("assigned_preparer__id"),
            preparer_first=F("assigned_preparer__first_name"),
            preparer_last=F("assigned_preparer__last_name"),
        )
        .annotate(
            assigned=Count("id"),
            completed=Count("id", filter=Q(status="completed")),
            revenue_estimated=Coalesce(Sum("estimated_fee"), Decimal("0"), output_field=DecimalField()),
            revenue_actual=Coalesce(Sum("actual_fee"), Decimal("0"), output_field=DecimalField()),
        )
        .order_by("-assigned")
    )

    return [
        {
            "preparer_id": str(row["preparer_id"]),
            "preparer_name": f"{row['preparer_first'] or ''} {row['preparer_last'] or ''}".strip(),
            "assigned": row["assigned"],
            "completed": row["completed"],
            "completion_rate": round(row["completed"] / row["assigned"] * 100) if row["assigned"] else 0,
            "revenue_estimated": float(row["revenue_estimated"]),
            "revenue_actual": float(row["revenue_actual"]),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Contact Acquisition
# ---------------------------------------------------------------------------
def get_contact_acquisition(date_from=None, date_to=None):
    """
    New contacts by month, by source, and conversion rate.
    """
    _, Contact = _get_models()
    TaxCase = __import__("apps.cases.models", fromlist=["TaxCase"]).TaxCase
    date_from, date_to = _parse_dates(date_from, date_to)

    qs = Contact.objects.filter(created_at__gte=date_from, created_at__lte=date_to)

    by_month = list(
        qs.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    by_source = list(
        qs.values("source")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    total_contacts = qs.count()
    contacts_with_cases = (
        qs.filter(tax_cases__isnull=False).distinct().count()
    )
    conversion_rate = round(contacts_with_cases / total_contacts * 100) if total_contacts else 0

    return {
        "by_month": [
            {"month": row["month"].strftime("%Y-%m"), "count": row["count"]}
            for row in by_month
        ],
        "by_source": by_source,
        "total": total_contacts,
        "converted": contacts_with_cases,
        "conversion_rate": conversion_rate,
    }


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------
def export_to_csv(data, columns, filename="report.csv"):
    """
    Convert a list of dicts to a CSV HttpResponse.
    """
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    writer = csv.DictWriter(response, fieldnames=columns)
    writer.writeheader()
    for row in data:
        writer.writerow({col: row.get(col, "") for col in columns})

    return response
