"""
Analytics service functions for Sales Insights.
Queries TaxCase, Task, and Appointment models to produce
time-series and aggregate data for the Sales Insights dashboard.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import (
    ExtractMonth,
    ExtractWeek,
    ExtractYear,
    TruncMonth,
    TruncWeek,
)
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.cases.models import TaxCase
from apps.tasks.models import Task


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _default_date_range():
    """Default to the last 6 months."""
    today = date.today()
    return today - timedelta(days=180), today


def _parse_dates(date_from, date_to):
    if date_from and date_to:
        return date_from, date_to
    return _default_date_range()


def _trunc_and_label(group_by):
    """Return (TruncFunction, label_format) for grouping."""
    if group_by == "weekly":
        return TruncWeek, "week"
    return TruncMonth, "month"


def _format_period(dt, group_by):
    if not dt:
        return ""
    if group_by == "weekly":
        return dt.strftime("%Y-W%V")
    return dt.strftime("%Y-%m")


def _format_label(dt, group_by):
    if not dt:
        return ""
    if group_by == "weekly":
        return f"Week {dt.strftime('%V')}, {dt.strftime('%Y')}"
    return dt.strftime("%b %Y")


def _base_filters(qs, date_from, date_to, date_field, user_id=None,
                  user_field="assigned_to"):
    """Apply date range and optional user filter."""
    date_from, date_to = _parse_dates(date_from, date_to)
    qs = qs.filter(**{
        f"{date_field}__date__gte": date_from,
        f"{date_field}__date__lte": date_to,
    })
    if user_id:
        qs = qs.filter(**{user_field: user_id})
    return qs


# ---------------------------------------------------------------------------
# Activity Reports
# ---------------------------------------------------------------------------
def get_activities_added(date_from=None, date_to=None, group_by="monthly",
                         user_id=None):
    """Count of appointments + tasks created per time period."""
    date_from, date_to = _parse_dates(date_from, date_to)
    trunc_fn, _ = _trunc_and_label(group_by)

    appt_qs = Appointment.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    task_qs = Task.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    if user_id:
        appt_qs = appt_qs.filter(assigned_to=user_id)
        task_qs = task_qs.filter(assigned_to=user_id)

    appt_data = dict(
        appt_qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(count=Count("id"))
        .values_list("period", "count")
    )
    task_data = dict(
        task_qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(count=Count("id"))
        .values_list("period", "count")
    )

    all_periods = sorted(set(list(appt_data.keys()) + list(task_data.keys())))
    rows = []
    total = 0
    for p in all_periods:
        appt_count = appt_data.get(p, 0)
        task_count = task_data.get(p, 0)
        combined = appt_count + task_count
        total += combined
        rows.append({
            "period": _format_period(p, group_by),
            "label": _format_label(p, group_by),
            "appointments": appt_count,
            "tasks": task_count,
            "count": combined,
        })

    return {"data": rows, "total": total}


def get_activities_completed(date_from=None, date_to=None, group_by="monthly",
                              user_id=None):
    """Count of completed appointments + tasks per time period."""
    date_from, date_to = _parse_dates(date_from, date_to)
    trunc_fn, _ = _trunc_and_label(group_by)

    appt_qs = Appointment.objects.filter(
        status="completed",
        start_datetime__date__gte=date_from,
        start_datetime__date__lte=date_to,
    )
    task_qs = Task.objects.filter(
        status="completed",
        completed_at__date__gte=date_from,
        completed_at__date__lte=date_to,
    )
    if user_id:
        appt_qs = appt_qs.filter(assigned_to=user_id)
        task_qs = task_qs.filter(assigned_to=user_id)

    appt_data = dict(
        appt_qs.annotate(period=trunc_fn("start_datetime"))
        .values("period")
        .annotate(count=Count("id"))
        .values_list("period", "count")
    )
    task_data = dict(
        task_qs.annotate(period=trunc_fn("completed_at"))
        .values("period")
        .annotate(count=Count("id"))
        .values_list("period", "count")
    )

    all_periods = sorted(set(list(appt_data.keys()) + list(task_data.keys())))
    rows = []
    total = 0
    for p in all_periods:
        combined = appt_data.get(p, 0) + task_data.get(p, 0)
        total += combined
        rows.append({
            "period": _format_period(p, group_by),
            "label": _format_label(p, group_by),
            "count": combined,
        })

    return {"data": rows, "total": total}


def get_activity_efficiency(date_from=None, date_to=None, user_id=None):
    """Ratio of completed to total activities in the period."""
    date_from, date_to = _parse_dates(date_from, date_to)

    appt_base = Appointment.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    task_base = Task.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    if user_id:
        appt_base = appt_base.filter(assigned_to=user_id)
        task_base = task_base.filter(assigned_to=user_id)

    total_appts = appt_base.count()
    completed_appts = appt_base.filter(status="completed").count()
    total_tasks = task_base.count()
    completed_tasks = task_base.filter(status="completed").count()

    total = total_appts + total_tasks
    completed = completed_appts + completed_tasks
    rate = round(completed / total * 100, 1) if total > 0 else 0

    return {
        "total_activities": total,
        "completed_activities": completed,
        "efficiency_rate": rate,
        "breakdown": {
            "appointments": {"total": total_appts, "completed": completed_appts},
            "tasks": {"total": total_tasks, "completed": completed_tasks},
        },
    }


# ---------------------------------------------------------------------------
# Pipeline Performance
# ---------------------------------------------------------------------------
def get_cases_added(date_from=None, date_to=None, group_by="monthly",
                    user_id=None, case_type=None):
    """Count of cases created per time period."""
    date_from, date_to = _parse_dates(date_from, date_to)
    trunc_fn, _ = _trunc_and_label(group_by)

    qs = TaxCase.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)
    if case_type:
        qs = qs.filter(case_type=case_type)

    rows_qs = (
        qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(count=Count("id"))
        .order_by("period")
    )
    rows = []
    total = 0
    for r in rows_qs:
        total += r["count"]
        rows.append({
            "period": _format_period(r["period"], group_by),
            "label": _format_label(r["period"], group_by),
            "count": r["count"],
        })

    return {"data": rows, "total": total}


def get_pipeline_value(date_from=None, date_to=None, user_id=None,
                       case_type=None):
    """Sum of estimated_fee grouped by case status (pipeline stages)."""
    date_from, date_to = _parse_dates(date_from, date_to)
    qs = TaxCase.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)
    if case_type:
        qs = qs.filter(case_type=case_type)

    STATUS_LABELS = dict(TaxCase.Status.choices)
    rows_qs = (
        qs.values("status")
        .annotate(
            count=Count("id"),
            estimated=Sum("estimated_fee"),
            actual=Sum("actual_fee"),
        )
        .order_by("status")
    )
    rows = []
    for r in rows_qs:
        rows.append({
            "status": r["status"],
            "label": STATUS_LABELS.get(r["status"], r["status"]),
            "count": r["count"],
            "estimated": float(r["estimated"] or 0),
            "actual": float(r["actual"] or 0),
        })

    return {"data": rows}


def get_pipeline_activity(date_from=None, date_to=None, group_by="monthly",
                           user_id=None):
    """Activities (appointments + tasks) linked to cases, per time period."""
    date_from, date_to = _parse_dates(date_from, date_to)
    trunc_fn, _ = _trunc_and_label(group_by)

    appt_qs = Appointment.objects.filter(
        case__isnull=False,
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )
    task_qs = Task.objects.filter(
        case__isnull=False,
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )
    if user_id:
        appt_qs = appt_qs.filter(assigned_to=user_id)
        task_qs = task_qs.filter(assigned_to=user_id)

    appt_data = dict(
        appt_qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(count=Count("id"))
        .values_list("period", "count")
    )
    task_data = dict(
        task_qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(count=Count("id"))
        .values_list("period", "count")
    )

    all_periods = sorted(set(list(appt_data.keys()) + list(task_data.keys())))
    rows = []
    for p in all_periods:
        rows.append({
            "period": _format_period(p, group_by),
            "label": _format_label(p, group_by),
            "appointments": appt_data.get(p, 0),
            "tasks": task_data.get(p, 0),
            "count": appt_data.get(p, 0) + task_data.get(p, 0),
        })

    return {"data": rows}


def get_funnel_progression(date_from=None, date_to=None, user_id=None,
                            case_type=None):
    """Case count per status — shows pipeline funnel."""
    date_from, date_to = _parse_dates(date_from, date_to)
    qs = TaxCase.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)
    if case_type:
        qs = qs.filter(case_type=case_type)

    STATUS_ORDER = [s[0] for s in TaxCase.Status.choices]
    STATUS_LABELS = dict(TaxCase.Status.choices)

    counts = dict(
        qs.values("status").annotate(count=Count("id")).values_list("status", "count")
    )
    rows = []
    for s in STATUS_ORDER:
        rows.append({
            "status": s,
            "label": STATUS_LABELS[s],
            "count": counts.get(s, 0),
        })

    return {"data": rows}


def get_product_pipeline(date_from=None, date_to=None, user_id=None):
    """Case count and value grouped by case_type."""
    date_from, date_to = _parse_dates(date_from, date_to)
    qs = TaxCase.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)

    TYPE_LABELS = dict(TaxCase.CaseType.choices)
    rows_qs = (
        qs.values("case_type")
        .annotate(count=Count("id"), estimated=Sum("estimated_fee"))
        .order_by("-count")
    )
    rows = []
    for r in rows_qs:
        rows.append({
            "case_type": r["case_type"],
            "label": TYPE_LABELS.get(r["case_type"], r["case_type"]),
            "count": r["count"],
            "estimated": float(r["estimated"] or 0),
        })

    return {"data": rows}


# ---------------------------------------------------------------------------
# Sales Results
# ---------------------------------------------------------------------------
def get_closed_vs_goals(date_from=None, date_to=None, group_by="monthly",
                         user_id=None):
    """Closed/completed cases per period (goals are a frontend overlay)."""
    date_from, date_to = _parse_dates(date_from, date_to)
    trunc_fn, _ = _trunc_and_label(group_by)

    qs = TaxCase.objects.filter(
        status__in=["completed", "closed"],
        closed_date__gte=date_from,
        closed_date__lte=date_to,
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)

    rows_qs = (
        qs.annotate(period=trunc_fn("closed_date"))
        .values("period")
        .annotate(
            count=Count("id"),
            revenue=Sum("actual_fee"),
        )
        .order_by("period")
    )
    rows = []
    for r in rows_qs:
        rows.append({
            "period": _format_period(r["period"], group_by),
            "label": _format_label(r["period"], group_by),
            "count": r["count"],
            "revenue": float(r["revenue"] or 0),
        })

    return {"data": rows}


def get_product_revenue(date_from=None, date_to=None, user_id=None):
    """Revenue (actual_fee) grouped by case_type."""
    date_from, date_to = _parse_dates(date_from, date_to)
    qs = TaxCase.objects.filter(
        status__in=["completed", "closed", "filed"],
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)

    TYPE_LABELS = dict(TaxCase.CaseType.choices)
    rows_qs = (
        qs.values("case_type")
        .annotate(
            count=Count("id"),
            estimated=Sum("estimated_fee"),
            actual=Sum("actual_fee"),
        )
        .order_by("-actual")
    )
    rows = []
    for r in rows_qs:
        rows.append({
            "case_type": r["case_type"],
            "label": TYPE_LABELS.get(r["case_type"], r["case_type"]),
            "count": r["count"],
            "estimated": float(r["estimated"] or 0),
            "actual": float(r["actual"] or 0),
        })

    return {"data": rows}


def get_sales_cycle_duration(date_from=None, date_to=None, user_id=None):
    """Average days from case creation to closure, grouped by case_type."""
    date_from, date_to = _parse_dates(date_from, date_to)
    qs = TaxCase.objects.filter(
        closed_date__isnull=False,
        closed_date__gte=date_from,
        closed_date__lte=date_to,
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)

    TYPE_LABELS = dict(TaxCase.CaseType.choices)

    # Overall average
    overall = qs.annotate(
        duration=F("closed_date") - F("created_at__date")
    )

    rows_qs = (
        qs.values("case_type")
        .annotate(
            count=Count("id"),
            avg_days=Avg(F("closed_date") - F("created_at__date")),
        )
        .order_by("case_type")
    )
    rows = []
    for r in rows_qs:
        avg = r["avg_days"]
        avg_days_val = avg.days if avg else 0
        rows.append({
            "case_type": r["case_type"],
            "label": TYPE_LABELS.get(r["case_type"], r["case_type"]),
            "count": r["count"],
            "avg_days": avg_days_val,
        })

    return {"data": rows}


def get_lost_deals(date_from=None, date_to=None, group_by="monthly",
                    user_id=None):
    """Cases closed without being filed/completed (lost opportunities)."""
    date_from, date_to = _parse_dates(date_from, date_to)
    trunc_fn, _ = _trunc_and_label(group_by)

    qs = TaxCase.objects.filter(
        status="closed",
        filed_date__isnull=True,
        completed_date__isnull=True,
        closed_date__gte=date_from,
        closed_date__lte=date_to,
    )
    if user_id:
        qs = qs.filter(assigned_preparer=user_id)

    rows_qs = (
        qs.annotate(period=trunc_fn("closed_date"))
        .values("period")
        .annotate(
            count=Count("id"),
            lost_value=Sum("estimated_fee"),
        )
        .order_by("period")
    )
    rows = []
    total_count = 0
    total_value = 0
    for r in rows_qs:
        val = float(r["lost_value"] or 0)
        total_count += r["count"]
        total_value += val
        rows.append({
            "period": _format_period(r["period"], group_by),
            "label": _format_label(r["period"], group_by),
            "count": r["count"],
            "lost_value": val,
        })

    return {"data": rows, "total_count": total_count, "total_value": total_value}
