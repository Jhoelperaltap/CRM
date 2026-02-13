from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import TaxCase


def generate_case_number() -> str:
    """
    Generate a sequential case number for tax cases.

    Delegates to the generic module numbering service when available,
    falling back to the legacy ``TC-YYYY-NNNN`` format.
    """
    try:
        from apps.module_config.services import generate_module_number

        return generate_module_number("cases")
    except Exception:
        # Fallback to legacy format if module_config is not available
        return _legacy_generate_case_number()


def _legacy_generate_case_number() -> str:
    """Legacy case number generation (TC-YYYY-NNNN)."""
    current_year = timezone.now().year
    prefix = f"TC-{current_year}-"

    last_case = (
        TaxCase.objects.filter(case_number__startswith=prefix)
        .order_by("-case_number")
        .values_list("case_number", flat=True)
        .first()
    )

    if last_case:
        try:
            last_seq = int(last_case.split("-")[-1])
        except (ValueError, IndexError):
            last_seq = 0
        next_seq = last_seq + 1
    else:
        next_seq = 1

    return f"{prefix}{next_seq:04d}"


@transaction.atomic
def transition_case_status(case: TaxCase, new_status: str, user) -> TaxCase:
    """
    Validate and apply a workflow status transition on a ``TaxCase``.

    Raises ``ValidationError`` if the transition is not allowed.
    Automatically sets ``filed_date`` or ``completed_date`` when the case
    moves to the corresponding status.

    Parameters
    ----------
    case : TaxCase
        The case instance to transition (will be refreshed from DB with a
        row-level lock).
    new_status : str
        The target status value (must be a valid ``TaxCase.Status`` choice).
    user : User
        The user performing the transition (reserved for future audit use).

    Returns
    -------
    TaxCase
        The updated case instance.
    """
    # Lock the row to avoid concurrent transitions.
    case = TaxCase.objects.select_for_update().get(pk=case.pk)

    current_status = case.status
    allowed = TaxCase.VALID_TRANSITIONS.get(current_status, [])

    if new_status not in allowed:
        allowed_display = ", ".join(allowed) if allowed else "none"
        raise ValidationError(
            {
                "status": (
                    f"Cannot transition from '{current_status}' to '{new_status}'. "
                    f"Allowed transitions: [{allowed_display}]."
                )
            }
        )

    today = timezone.now().date()

    # Apply the transition.
    case.status = new_status

    if new_status == TaxCase.Status.FILED:
        case.filed_date = today

    if new_status == TaxCase.Status.COMPLETED:
        case.completed_date = today

    if new_status == TaxCase.Status.CLOSED:
        case.closed_date = today

    case.save(
        update_fields=[
            "status",
            "filed_date",
            "completed_date",
            "closed_date",
            "updated_at",
        ]
    )
    return case
