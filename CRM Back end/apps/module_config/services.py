import re

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.module_config.models import CRMModule, CustomField, Picklist


def generate_module_number(module_name: str) -> str:
    """
    Generate a sequential record number for any module.

    Reads CRMModule config for prefix, format, and reset_period.
    Thread-safe with ``select_for_update`` on ``number_next_seq``.
    Falls back to legacy ``TC-YYYY-NNNN`` format for cases if module
    is not configured.
    """
    now = timezone.now()

    try:
        with transaction.atomic():
            module = CRMModule.objects.select_for_update().get(name=module_name)

            if not module.number_prefix or not module.number_format:
                # Fallback for modules without numbering config
                return _legacy_number(module_name, now)

            # Check if sequence needs resetting
            if module.number_reset_period == "yearly":
                cache_key = f"module_number_year_{module_name}"
                last_year = cache.get(cache_key)
                if last_year and last_year != now.year:
                    module.number_next_seq = 1
                cache.set(cache_key, now.year, timeout=None)
            elif module.number_reset_period == "monthly":
                cache_key = f"module_number_month_{module_name}"
                last_month = cache.get(cache_key)
                current_month = f"{now.year}-{now.month}"
                if last_month and last_month != current_month:
                    module.number_next_seq = 1
                cache.set(cache_key, current_month, timeout=None)

            seq = module.number_next_seq
            module.number_next_seq = seq + 1
            module.save(update_fields=["number_next_seq", "updated_at"])

        # Build the number from the format string
        number = module.number_format.format(
            prefix=module.number_prefix,
            year=now.year,
            month=f"{now.month:02d}",
            day=f"{now.day:02d}",
            YYYYMMDD=now.strftime("%Y%m%d"),
            seq=seq,
        )
        return number

    except CRMModule.DoesNotExist:
        return _legacy_number(module_name, now)
    except Exception:
        # Table may not exist yet (before migrations)
        return _legacy_number(module_name, now)


def _legacy_number(module_name: str, now) -> str:
    """Fallback number generation for unconfigured modules."""
    import uuid

    prefix_map = {
        "cases": "TC",
        "contacts": "CT",
        "corporations": "CO",
        "quotes": "QT",
    }
    prefix = prefix_map.get(module_name, module_name[:2].upper())
    # Use timestamp + random suffix for uniqueness even within the same second
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{now.year}-{now.strftime('%m%d%H%M%S')}-{random_suffix}"


def validate_custom_fields(module_name: str, data: dict) -> dict:
    """
    Validate custom_fields JSON against active CustomField definitions.

    Returns cleaned data with only valid fields.
    """
    if not data:
        return {}

    try:
        module = CRMModule.objects.get(name=module_name)
    except CRMModule.DoesNotExist:
        return data

    field_defs = {
        f.field_name: f
        for f in CustomField.objects.filter(module=module, is_active=True)
    }

    errors = {}
    cleaned = {}

    for field_name, value in data.items():
        if field_name not in field_defs:
            continue  # Ignore unknown fields

        field_def = field_defs[field_name]

        # Required check
        if field_def.is_required and (value is None or value == ""):
            errors[field_name] = f"{field_def.label} is required."
            continue

        # Skip further validation if empty and not required
        if value is None or value == "":
            cleaned[field_name] = value
            continue

        # Type validation
        try:
            cleaned[field_name] = _validate_field_type(field_def, value)
        except ValueError as e:
            errors[field_name] = str(e)
            continue

        # Regex validation
        regex = field_def.validation_rules.get("regex")
        if regex and isinstance(value, str):
            if not re.match(regex, value):
                errors[field_name] = (
                    f"{field_def.label} does not match the required pattern."
                )
                continue

        # Min/max for numbers
        if field_def.field_type in ("number", "decimal"):
            min_val = field_def.validation_rules.get("min")
            max_val = field_def.validation_rules.get("max")
            num_val = cleaned[field_name]
            if min_val is not None and num_val < min_val:
                errors[field_name] = f"{field_def.label} must be at least {min_val}."
            if max_val is not None and num_val > max_val:
                errors[field_name] = f"{field_def.label} must be at most {max_val}."

    # Check for missing required fields
    for field_name, field_def in field_defs.items():
        if field_def.is_required and field_name not in data:
            errors[field_name] = f"{field_def.label} is required."

    if errors:
        raise ValidationError({"custom_fields": errors})

    return cleaned


def _validate_field_type(field_def, value):
    """Validate and coerce value based on field type."""
    ft = field_def.field_type

    if ft == "number":
        try:
            return int(value)
        except (ValueError, TypeError):
            raise ValueError(f"{field_def.label} must be a whole number.")

    if ft == "decimal":
        try:
            return float(value)
        except (ValueError, TypeError):
            raise ValueError(f"{field_def.label} must be a number.")

    if ft == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes")
        return bool(value)

    if ft == "select":
        valid_values = [o.get("value") for o in (field_def.options or [])]
        if valid_values and value not in valid_values:
            raise ValueError(f"{field_def.label}: '{value}' is not a valid option.")
        return value

    if ft == "multiselect":
        if not isinstance(value, list):
            raise ValueError(f"{field_def.label} must be a list.")
        valid_values = [o.get("value") for o in (field_def.options or [])]
        if valid_values:
            for v in value:
                if v not in valid_values:
                    raise ValueError(f"{field_def.label}: '{v}' is not a valid option.")
        return value

    # text, email, phone, url, textarea, date, datetime — pass through as string
    return value


def is_module_active(module_name: str) -> bool:
    """
    Check if a CRM module is active.
    Cached with a 60-second TTL.
    """
    cache_key = f"module_active_{module_name}"
    result = cache.get(cache_key)
    if result is not None:
        return result

    try:
        module = CRMModule.objects.only("is_active").get(name=module_name)
        active = module.is_active
    except CRMModule.DoesNotExist:
        # If module isn't registered, treat as active (backward compat)
        active = True
    except Exception:
        # Table may not exist yet (before migrations). Treat as active.
        active = True

    cache.set(cache_key, active, timeout=60)
    return active


def get_picklist_values(picklist_name: str, module_name: str = None) -> list:
    """
    Return active values for a picklist.
    Cached with a 60-second TTL.
    """
    cache_key = f"picklist_values_{picklist_name}_{module_name or 'global'}"
    result = cache.get(cache_key)
    if result is not None:
        return result

    filters = {"name": picklist_name}
    if module_name:
        filters["module__name"] = module_name
    else:
        filters["module__isnull"] = True

    try:
        picklist = Picklist.objects.get(**filters)
    except Picklist.DoesNotExist:
        return []
    except Exception:
        # Table may not exist yet (before migrations)
        return []

    values = list(
        picklist.values.filter(is_active=True)
        .order_by("sort_order", "value")
        .values("value", "label", "sort_order", "is_default", "color")
    )

    cache.set(cache_key, values, timeout=60)
    return values
