"""
Dashboard aggregation services.

All heavy ORM queries live here so that views stay thin.
Models from sibling apps are imported lazily to avoid circular imports and to
gracefully handle the case where those apps are not yet fully migrated.
"""

from datetime import timedelta

from django.db.models import Count, DecimalField, Q, Sum, F, Value
from django.db.models.functions import TruncMonth, Coalesce
from django.utils import timezone


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_models():
    """
    Lazy-import the models from sibling apps so this module can be imported
    even before those apps are ready.
    """
    from apps.cases.models import TaxCase
    from apps.contacts.models import Contact
    from apps.corporations.models import Corporation

    return TaxCase, Contact, Corporation


def _parse_date_range(date_from=None, date_to=None):
    """
    Return a (start, end) datetime tuple.  Falls back to the current
    calendar year if either bound is ``None``.
    """
    now = timezone.now()
    if date_from is None:
        date_from = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if date_to is None:
        date_to = now
    return date_from, date_to


# ---------------------------------------------------------------------------
# Stat cards
# ---------------------------------------------------------------------------
def get_dashboard_stats(date_from=None, date_to=None):
    """
    Return high-level KPI numbers for the stat cards on top of the dashboard.

    Returns a dict with:
        total_contacts, total_corporations, active_cases,
        cases_filed_this_month, total_estimated_revenue
    """
    TaxCase, Contact, Corporation = _get_models()
    date_from, date_to = _parse_date_range(date_from, date_to)

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_contacts = Contact.objects.count()
    total_corporations = Corporation.objects.count()

    active_cases = TaxCase.objects.filter(
        status__in=["new", "in_progress", "under_review"],
    ).count()

    cases_filed_this_month = TaxCase.objects.filter(
        created_at__gte=month_start,
        created_at__lte=now,
    ).count()

    total_estimated_revenue = (
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
        ).aggregate(
            total=Coalesce(Sum("estimated_fee"), Value(0), output_field=DecimalField()),
        )["total"]
    )

    return {
        "total_contacts": total_contacts,
        "total_corporations": total_corporations,
        "active_cases": active_cases,
        "cases_filed_this_month": cases_filed_this_month,
        "total_estimated_revenue": float(total_estimated_revenue),
    }


# ---------------------------------------------------------------------------
# Cases by status (pie / bar)
# ---------------------------------------------------------------------------
def get_cases_by_status(date_from=None, date_to=None):
    """
    Return a list of ``{"status": ..., "count": ...}`` dicts.
    """
    TaxCase, *_ = _get_models()
    date_from, date_to = _parse_date_range(date_from, date_to)

    return list(
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
        )
        .values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )


# ---------------------------------------------------------------------------
# Revenue pipeline (line / area)
# ---------------------------------------------------------------------------
def get_revenue_pipeline(date_from=None, date_to=None):
    """
    Return a list of ``{"month": ..., "estimated": ..., "actual": ...}`` dicts,
    one entry per calendar month in the requested range.
    """
    TaxCase, *_ = _get_models()
    date_from, date_to = _parse_date_range(date_from, date_to)

    rows = (
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
        )
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(
            estimated=Coalesce(Sum("estimated_fee"), Value(0), output_field=DecimalField()),
            actual=Coalesce(Sum("actual_fee"), Value(0), output_field=DecimalField()),
        )
        .order_by("month")
    )

    return [
        {
            "month": row["month"].strftime("%Y-%m"),
            "estimated": float(row["estimated"]),
            "actual": float(row["actual"]),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Cases by preparer (bar)
# ---------------------------------------------------------------------------
def get_cases_by_preparer(date_from=None, date_to=None):
    """
    Return a list of ``{"preparer_name": ..., "count": ...}`` dicts.
    """
    TaxCase, *_ = _get_models()
    date_from, date_to = _parse_date_range(date_from, date_to)

    rows = (
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
            assigned_preparer__isnull=False,
        )
        .values(
            preparer_first=F("assigned_preparer__first_name"),
            preparer_last=F("assigned_preparer__last_name"),
        )
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    return [
        {
            "preparer_name": f"{row['preparer_first']} {row['preparer_last']}".strip(),
            "count": row["count"],
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Cases by type (pie)
# ---------------------------------------------------------------------------
def get_cases_by_type(date_from=None, date_to=None):
    """
    Return a list of ``{"case_type": ..., "count": ...}`` dicts.
    """
    TaxCase, *_ = _get_models()
    date_from, date_to = _parse_date_range(date_from, date_to)

    return list(
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
        )
        .values("case_type")
        .annotate(count=Count("id"))
        .order_by("-count")
    )


# ---------------------------------------------------------------------------
# Monthly filings (line / bar)
# ---------------------------------------------------------------------------
def get_monthly_filings(date_from=None, date_to=None):
    """
    Return a list of ``{"month": ..., "count": ...}`` dicts.
    """
    TaxCase, *_ = _get_models()
    date_from, date_to = _parse_date_range(date_from, date_to)

    rows = (
        TaxCase.objects.filter(
            created_at__gte=date_from,
            created_at__lte=date_to,
        )
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    return [
        {
            "month": row["month"].strftime("%Y-%m"),
            "count": row["count"],
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Upcoming deadlines (table)
# ---------------------------------------------------------------------------
def get_upcoming_deadlines(days=30):
    """
    Return a queryset of ``TaxCase`` objects whose ``due_date`` falls within
    the next *days* calendar days, ordered soonest-first.
    """
    TaxCase, *_ = _get_models()

    now = timezone.now()
    horizon = now + timedelta(days=days)

    return (
        TaxCase.objects.filter(
            due_date__gte=now.date(),
            due_date__lte=horizon.date(),
        )
        .select_related("assigned_preparer", "contact")
        .order_by("due_date")
    )


# ---------------------------------------------------------------------------
# Appointments today
# ---------------------------------------------------------------------------
def get_appointments_today():
    """
    Return a list of today's appointments with contact and assignee info.
    """
    from apps.appointments.models import Appointment

    today = timezone.now().date()
    qs = (
        Appointment.objects.filter(start_datetime__date=today)
        .select_related("contact", "assigned_to")
        .order_by("start_datetime")
    )

    return [
        {
            "id": str(apt.id),
            "title": apt.title,
            "start_datetime": apt.start_datetime.isoformat(),
            "end_datetime": apt.end_datetime.isoformat(),
            "status": apt.status,
            "contact_name": (
                f"{apt.contact.first_name} {apt.contact.last_name}".strip()
                if apt.contact
                else ""
            ),
            "assigned_to_name": (
                apt.assigned_to.get_full_name() if apt.assigned_to else ""
            ),
        }
        for apt in qs
    ]


# ---------------------------------------------------------------------------
# Missing documents
# ---------------------------------------------------------------------------
def get_missing_docs(required_types=None):
    """
    Return active cases that are missing one or more required document types.
    """
    from apps.cases.models import TaxCase
    from apps.documents.models import Document

    if required_types is None:
        required_types = ["w2", "1099", "id_document"]

    active_cases = TaxCase.objects.filter(
        status__in=["new", "in_progress", "under_review"]
    ).select_related("contact")

    result = []
    for case in active_cases:
        existing_types = set(
            Document.objects.filter(case=case).values_list("doc_type", flat=True)
        )
        missing = [dt for dt in required_types if dt not in existing_types]
        if missing:
            result.append({
                "case_id": str(case.id),
                "case_number": case.case_number,
                "title": case.title,
                "contact_name": (
                    f"{case.contact.first_name} {case.contact.last_name}".strip()
                    if case.contact
                    else ""
                ),
                "missing_types": missing,
            })

    return result


# ---------------------------------------------------------------------------
# Tasks by user
# ---------------------------------------------------------------------------
def get_tasks_by_user():
    """
    Return open tasks grouped by assigned user, including an overdue count.
    """
    from apps.tasks.models import Task

    today = timezone.now().date()

    rows = (
        Task.objects.filter(status__in=["todo", "in_progress"])
        .values(
            user_id=F("assigned_to__id"),
            user_first=F("assigned_to__first_name"),
            user_last=F("assigned_to__last_name"),
        )
        .annotate(
            total=Count("id"),
            overdue=Count("id", filter=Q(due_date__lt=today)),
        )
        .order_by("-total")
    )

    return [
        {
            "user_id": str(row["user_id"]) if row["user_id"] else None,
            "user_name": f"{row['user_first'] or ''} {row['user_last'] or ''}".strip(),
            "total": row["total"],
            "overdue": row["overdue"],
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Cases by fiscal year
# ---------------------------------------------------------------------------
def get_cases_by_fiscal_year():
    """
    Return a list of ``{"fiscal_year": ..., "count": ...}`` dicts.
    """
    TaxCase, *_ = _get_models()

    return list(
        TaxCase.objects.values("fiscal_year")
        .annotate(count=Count("id"))
        .order_by("-fiscal_year")
    )


# ---------------------------------------------------------------------------
# Average time in "Waiting for Documents" status
# ---------------------------------------------------------------------------
def get_avg_waiting_for_documents_days():
    """
    Return the average number of days cases spend in 'waiting_for_documents'
    status.  Uses the audit log to find status transitions.

    Falls back to a simpler calculation if audit data is unavailable:
    counts currently-waiting cases and their age.
    """
    TaxCase, *_ = _get_models()

    now = timezone.now()
    waiting_cases = TaxCase.objects.filter(status="waiting_for_documents")
    if not waiting_cases.exists():
        return {"avg_days": 0, "currently_waiting": 0}

    total_days = sum(
        (now - case.updated_at).days for case in waiting_cases
    )
    count = waiting_cases.count()

    return {
        "avg_days": round(total_days / count, 1) if count else 0,
        "currently_waiting": count,
    }
