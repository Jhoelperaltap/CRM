"""Dynamic report execution engine.

Given a Report definition, queries the appropriate module's data,
applies filters/columns/sorting, and returns rows.

Security: Field names are validated against actual model fields to prevent
ORM injection attacks via malicious field traversal.
"""

import logging
import re
from datetime import datetime
from decimal import Decimal

from django.apps import apps
from django.db.models import DateField, DateTimeField, DecimalField
from django.utils import timezone

from apps.reports.models import Report

logger = logging.getLogger(__name__)


def _get_valid_field_names(model) -> set:
    """Get the set of valid field names for a model.

    Only includes direct fields, not related field traversals.
    This prevents ORM injection via field__related__field patterns.
    """
    valid_fields = set()
    for field in model._meta.get_fields():
        if hasattr(field, "column") or hasattr(field, "attname"):
            valid_fields.add(field.name)
    return valid_fields


def _is_safe_field_name(field_name: str, valid_fields: set) -> bool:
    """Validate that a field name is safe to use in ORM queries.

    Prevents:
    - Field traversal (e.g., 'user__password')
    - Special characters that could be exploited
    - Empty or None field names
    """
    if not field_name or not isinstance(field_name, str):
        return False

    # Only allow alphanumeric and underscore (no double underscores for traversal)
    if "__" in field_name:
        return False

    if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", field_name):
        return False

    return field_name in valid_fields


# Map primary_module choices → (app_label, model_name)
MODULE_MODEL_MAP = {
    "contacts": ("contacts", "Contact"),
    "corporations": ("corporations", "Corporation"),
    "cases": ("cases", "TaxCase"),
    "quotes": ("quotes", "Quote"),
    "appointments": ("appointments", "Appointment"),
    "tasks": ("tasks", "Task"),
    "documents": ("documents", "Document"),
    "users": ("users", "User"),
}

OPERATOR_MAP = {
    "equals": "exact",
    "not_equals": "exact",  # negated via exclude
    "contains": "icontains",
    "not_contains": "icontains",  # negated
    "starts_with": "istartswith",
    "ends_with": "iendswith",
    "greater_than": "gt",
    "less_than": "lt",
    "greater_or_equal": "gte",
    "less_or_equal": "lte",
    "is_empty": "isnull",
    "is_not_empty": "isnull",
}


def _get_model(primary_module: str):
    mapping = MODULE_MODEL_MAP.get(primary_module)
    if not mapping:
        return None
    app_label, model_name = mapping
    try:
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None


def _apply_filters(qs, filters, valid_fields: set):
    """Apply a list of filter conditions to a queryset.

    Each filter: {"field": "status", "operator": "equals", "value": "completed"}

    Security: Field names are validated against valid_fields to prevent ORM injection.
    """
    for f in filters:
        field = f.get("field", "")
        operator = f.get("operator", "equals")
        value = f.get("value", "")

        if not field:
            continue

        # Security: Validate field name against whitelist
        if not _is_safe_field_name(field, valid_fields):
            continue

        lookup = OPERATOR_MAP.get(operator, "exact")
        negate = operator in ("not_equals", "not_contains", "is_not_empty")

        if operator == "is_empty":
            kwarg = {f"{field}__isnull": True}
        elif operator == "is_not_empty":
            kwarg = {f"{field}__isnull": True}
        else:
            kwarg = {f"{field}__{lookup}": value}

        if negate:
            qs = qs.exclude(**kwarg)
        else:
            qs = qs.filter(**kwarg)

    return qs


def _serialise_value(val):
    """Convert a model field value to a JSON-safe type."""
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if hasattr(val, "date") and callable(val.date):
        return val.isoformat()
    if hasattr(val, "id"):
        return str(val.id)
    return val


def execute_report(report: Report, page: int = 1, page_size: int = 50):
    """Execute a report and return paginated rows + metadata.

    Security: All field names (filters, sort, columns) are validated against
    the model's actual fields to prevent ORM injection attacks.
    """
    model = _get_model(report.primary_module)
    if model is None:
        return {"columns": [], "rows": [], "total": 0}

    # Security: Build whitelist of valid field names for this model
    valid_fields = _get_valid_field_names(model)

    qs = model.objects.all()

    # Apply user-defined filters (with field validation)
    if report.filters:
        qs = _apply_filters(qs, report.filters, valid_fields)

    # Sorting (with field validation)
    if report.sort_field and _is_safe_field_name(report.sort_field, valid_fields):
        order = (
            f"-{report.sort_field}"
            if report.sort_order == "desc"
            else report.sort_field
        )
        qs = qs.order_by(order)

    total = qs.count()

    # Determine columns (with field validation)
    if report.columns:
        # Security: Filter to only valid field names
        columns = [
            col for col in report.columns if _is_safe_field_name(col, valid_fields)
        ]
    else:
        # Default: use a sensible set of model fields
        columns = [
            f.name
            for f in model._meta.get_fields()
            if hasattr(f, "column") and not f.primary_key
        ][:10]

    # Paginate
    offset = (page - 1) * page_size
    rows_qs = qs[offset : offset + page_size]

    rows = []
    for obj in rows_qs:
        row = {"id": str(obj.pk)}
        for col in columns:
            # Security: col is already validated above
            try:
                val = getattr(obj, col, None)
                if callable(val) and not hasattr(val, "id"):
                    val = val()
                row[col] = _serialise_value(val)
            except Exception as e:
                logger.warning(
                    f"Error retrieving field '{col}' from {obj.__class__.__name__} "
                    f"(id={obj.pk}): {e}"
                )
                row[col] = None
        rows.append(row)

    # Update tracking
    now = timezone.now()
    Report.objects.filter(pk=report.pk).update(last_run=now, last_accessed=now)

    return {
        "columns": columns,
        "rows": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_module_fields(primary_module: str):
    """Return available field names and types for a module.

    Used in report builder UI.
    """
    model = _get_model(primary_module)
    if model is None:
        return []

    fields = []
    for f in model._meta.get_fields():
        if not hasattr(f, "column"):
            continue
        field_type = "text"
        if isinstance(f, (DecimalField,)):
            field_type = "number"
        elif isinstance(f, (DateField, DateTimeField)):
            field_type = "date"
        elif hasattr(f, "choices") and f.choices:
            field_type = "choice"

        entry = {
            "name": f.name,
            "label": f.verbose_name if hasattr(f, "verbose_name") else f.name,
            "type": field_type,
        }
        if field_type == "choice" and f.choices:
            entry["choices"] = [{"value": c[0], "label": str(c[1])} for c in f.choices]
        fields.append(entry)

    return fields
