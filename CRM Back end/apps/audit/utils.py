"""
Helpers for creating audit entries from views and middleware.
"""
from apps.core.utils import get_current_request


def _get_request_meta():
    """Extract IP and user-agent from the current thread-local request."""
    request = get_current_request()
    ip_address = None
    user_agent = ""
    if request:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            ip_address = xff.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")
    return ip_address, user_agent


def log_settings_change(user, setting_area, setting_key, old_value, new_value):
    """Record a settings change in the SettingsLog."""
    from apps.audit.models import SettingsLog

    ip_address, user_agent = _get_request_meta()
    SettingsLog.objects.create(
        user=user,
        setting_area=setting_area,
        setting_key=setting_key,
        old_value=old_value if isinstance(old_value, dict) else {"value": old_value},
        new_value=new_value if isinstance(new_value, dict) else {"value": new_value},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_pii_access(user, module, object_id, field_name, access_type="view"):
    """Record an access to a PII / sensitive field."""
    from apps.audit.models import EncryptedFieldAccessLog

    ip_address, _ = _get_request_meta()
    EncryptedFieldAccessLog.objects.create(
        user=user,
        module=module,
        object_id=str(object_id),
        field_name=field_name,
        access_type=access_type,
        ip_address=ip_address,
    )
