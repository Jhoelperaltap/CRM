from decimal import Decimal
from django.db.models import Sum, Q

from apps.cases.models import TaxCase
from apps.forecasts.models import ForecastEntry, SalesQuota


CLOSED_WON_STATUSES = [TaxCase.Status.FILED, TaxCase.Status.COMPLETED]
PIPELINE_STATUSES = [
    TaxCase.Status.NEW,
    TaxCase.Status.WAITING_FOR_DOCUMENTS,
    TaxCase.Status.IN_PROGRESS,
    TaxCase.Status.UNDER_REVIEW,
    TaxCase.Status.READY_TO_FILE,
]
ZERO = Decimal("0.00")


def _quarter_date_range(fiscal_year, quarter):
    """Return (start_date, end_date) for a fiscal quarter.

    Assumes fiscal year aligns with calendar year:
    Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec.
    """
    from datetime import date

    month_start = (quarter - 1) * 3 + 1
    month_end = quarter * 3
    start = date(fiscal_year, month_start, 1)
    if month_end == 12:
        end = date(fiscal_year, 12, 31)
    else:
        end = date(fiscal_year, month_end + 1, 1)
        from datetime import timedelta
        end = end - timedelta(days=1)
    return start, end


def get_team_user_ids(user):
    """Get IDs of users in the requesting user's team (subordinates via role hierarchy)."""
    if not user.role_id:
        return [user.id]
    return list(user.role.get_subordinate_user_ids())


def get_quarter_summary(user_ids, fiscal_year, quarter):
    """Compute aggregated summary for a set of users in a given quarter."""
    start, end = _quarter_date_range(fiscal_year, quarter)

    quota_total = (
        SalesQuota.objects.filter(
            user_id__in=user_ids,
            fiscal_year=fiscal_year,
            quarter=quarter,
        ).aggregate(total=Sum("amount"))["total"]
        or ZERO
    )

    closed_won = (
        TaxCase.objects.filter(
            assigned_preparer_id__in=user_ids,
            status__in=CLOSED_WON_STATUSES,
            completed_date__gte=start,
            completed_date__lte=end,
        ).aggregate(total=Sum("actual_fee"))["total"]
        or ZERO
    )

    pipeline_value = (
        TaxCase.objects.filter(
            assigned_preparer_id__in=user_ids,
            status__in=PIPELINE_STATUSES,
            created_at__date__gte=start,
            created_at__date__lte=end,
        ).aggregate(total=Sum("estimated_fee"))["total"]
        or ZERO
    )

    forecast = (
        ForecastEntry.objects.filter(
            user_id__in=user_ids,
            fiscal_year=fiscal_year,
            quarter=quarter,
        ).aggregate(
            best_case=Sum("best_case"),
            commit=Sum("commit"),
            f_pipeline=Sum("pipeline"),
        )
    )
    best_case = forecast["best_case"] or ZERO
    commit = forecast["commit"] or ZERO
    f_pipeline = forecast["f_pipeline"] or ZERO

    gap = quota_total - closed_won
    funnel_total = pipeline_value + best_case + commit

    return {
        "fiscal_year": fiscal_year,
        "quarter": quarter,
        "period_label": f"Q{quarter} FY {fiscal_year}",
        "quota": quota_total,
        "closed_won": closed_won,
        "gap": gap,
        "pipeline": pipeline_value,
        "best_case": best_case,
        "commit": commit,
        "funnel_total": funnel_total,
    }


def get_totals(user_ids, fiscal_year):
    """Compute annual totals across all 4 quarters."""
    totals = {
        "quota": ZERO,
        "closed_won": ZERO,
        "gap": ZERO,
        "pipeline": ZERO,
    }
    for q in range(1, 5):
        summary = get_quarter_summary(user_ids, fiscal_year, q)
        totals["quota"] += summary["quota"]
        totals["closed_won"] += summary["closed_won"]
        totals["pipeline"] += summary["pipeline"]
    totals["gap"] = totals["quota"] - totals["closed_won"]
    return totals


def get_member_quarter_detail(user, fiscal_year, quarter):
    """Get per-user breakdown for a quarter (used in the expandable table rows)."""
    start, end = _quarter_date_range(fiscal_year, quarter)

    quota_obj = SalesQuota.objects.filter(
        user=user, fiscal_year=fiscal_year, quarter=quarter
    ).first()
    quota = quota_obj.amount if quota_obj else ZERO

    closed_won = (
        TaxCase.objects.filter(
            assigned_preparer=user,
            status__in=CLOSED_WON_STATUSES,
            completed_date__gte=start,
            completed_date__lte=end,
        ).aggregate(total=Sum("actual_fee"))["total"]
        or ZERO
    )

    pipeline_value = (
        TaxCase.objects.filter(
            assigned_preparer=user,
            status__in=PIPELINE_STATUSES,
            created_at__date__gte=start,
            created_at__date__lte=end,
        ).aggregate(total=Sum("estimated_fee"))["total"]
        or ZERO
    )

    forecast = ForecastEntry.objects.filter(
        user=user, fiscal_year=fiscal_year, quarter=quarter
    ).first()
    best_case = forecast.best_case if forecast else ZERO
    commit_val = forecast.commit if forecast else ZERO
    f_pipeline = forecast.pipeline if forecast else ZERO

    gap = quota - closed_won
    funnel_total = pipeline_value + best_case + commit_val

    return {
        "user_id": str(user.id),
        "full_name": user.get_full_name() or user.email,
        "fiscal_year": fiscal_year,
        "quarter": quarter,
        "period_label": f"Q{quarter} FY {fiscal_year}",
        "quota": quota,
        "closed_won": closed_won,
        "gap": gap,
        "pipeline": pipeline_value,
        "best_case": best_case,
        "commit": commit_val,
        "funnel_total": funnel_total,
    }


def bulk_set_quotas(items, set_by, notify):
    """Create or update quotas in bulk. Returns list of SalesQuota instances."""
    results = []
    for item in items:
        obj, _ = SalesQuota.objects.update_or_create(
            user_id=item["user"],
            fiscal_year=item["fiscal_year"],
            quarter=item["quarter"],
            defaults={
                "amount": item["amount"],
                "set_by": set_by,
                "notify_by_email": notify,
            },
        )
        results.append(obj)
    return results
