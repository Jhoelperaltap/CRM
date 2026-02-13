# Security Logging Quick Reference

## Import

```python
from apps.core.logging import security_event_logger, SecurityEvent
```

## Common Operations

### Log Login Success

```python
security_event_logger.log_login_success(
    user_id=str(user.id),
    email=user.email,
    ip_address="192.168.1.1",
    user_agent=request.META.get('HTTP_USER_AGENT', '')
)
```

### Log Login Failure

```python
security_event_logger.log_login_failed(
    email="user@example.com",
    ip_address="192.168.1.1",
    user_agent=request.META.get('HTTP_USER_AGENT', ''),
    reason="invalid_credentials"  # or "account_locked", "account_inactive"
)
```

### Log Account Locked

```python
security_event_logger.log_account_locked(
    user_id=str(user.id),
    email=user.email,
    ip_address="192.168.1.1",
    user_agent=request.META.get('HTTP_USER_AGENT', ''),
    reason="too_many_failed_attempts"
)
```

### Log Password Change

```python
security_event_logger.log_password_changed(
    user_id=str(user.id),
    email=user.email,
    ip_address="192.168.1.1",
    user_agent=request.META.get('HTTP_USER_AGENT', '')
)
```

### Log 2FA Enabled

```python
security_event_logger.log_2fa_enabled(
    user_id=str(user.id),
    email=user.email,
    ip_address="192.168.1.1",
    user_agent=request.META.get('HTTP_USER_AGENT', ''),
    method="totp"  # or "sms", "email"
)
```

### Log Permission Denied

```python
security_event_logger.log_permission_denied(
    user_id=str(request.user.id),
    email=request.user.email,
    resource=request.path,
    action=request.method,
    ip_address="192.168.1.1",
    user_agent=request.META.get('HTTP_USER_AGENT', '')
)
```

### Log Suspicious Activity

```python
security_event_logger.log_suspicious_activity(
    ip_address="192.168.1.1",
    description="Multiple failed login attempts from same IP",
    email="user@example.com",
    user_agent=request.META.get('HTTP_USER_AGENT', '')
)
```

## Pattern Detection

### Check for Suspicious Activity

```python
# Check by IP
if security_event_logger.is_suspicious_activity(ip_address="192.168.1.1"):
    # IP is flagged as suspicious
    pass

# Check by email
if security_event_logger.is_suspicious_activity(email="user@example.com"):
    # Email/account is under attack
    pass
```

### Get Failed Login Count

```python
count = security_event_logger.get_failed_login_count("192.168.1.1")
if count >= 5:
    # Lock account
    pass
```

### Reset Failed Login Counter

```python
# After manual review or time-based unlock
security_event_logger.reset_failed_login_count("192.168.1.1")
```

## Event Types

| Constant | Value | Category |
|----------|-------|----------|
| `SecurityEvent.LOGIN_SUCCESS` | `"login_success"` | Authentication |
| `SecurityEvent.LOGIN_FAILED` | `"login_failed"` | Authentication |
| `SecurityEvent.ACCOUNT_LOCKED` | `"account_locked"` | Account Management |
| `SecurityEvent.PASSWORD_CHANGED` | `"password_changed"` | Account Management |
| `SecurityEvent.TWO_FACTOR_ENABLED` | `"2fa_enabled"` | Authentication |
| `SecurityEvent.PERMISSION_DENIED` | `"permission_denied"` | Authorization |
| `SecurityEvent.SUSPICIOUS_ACTIVITY` | `"suspicious_activity"` | Security Policy |

## Severity Levels

| Level | When Used |
|-------|-----------|
| `INFO` | Normal operations (login success, password change) |
| `WARNING` | Potential issues (failed login, permission denied) |
| `ERROR` | Security violations |
| `CRITICAL` | Security incidents (account locked, suspicious activity) |

## Detection Thresholds

| Pattern | Threshold | Window | Action |
|---------|-----------|--------|--------|
| Brute Force | 5 failed attempts | 15 min | Flag IP as suspicious |
| Distributed Attack | 10 unique IPs | 30 min | Flag account as under attack |
| Account Enumeration | 20 unique emails | 10 min | Flag IP for reconnaissance |

## Helper Function: Get Client IP

```python
def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')
```

## Example: Login View

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from apps.core.logging import security_event_logger

@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    # Check for suspicious activity first
    if security_event_logger.is_suspicious_activity(ip_address=ip_address):
        return Response(
            {'error': 'Too many attempts'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    user = authenticate(email=email, password=password)

    if user:
        security_event_logger.log_login_success(
            user_id=str(user.id),
            email=user.email,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Return tokens...
    else:
        security_event_logger.log_login_failed(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="invalid_credentials"
        )

        # Check if should lock account
        if security_event_logger.get_failed_login_count(ip_address) >= 5:
            # Lock account logic...
            pass

        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
```

## Example: Permission Check with Logging

```python
from rest_framework.permissions import BasePermission
from apps.core.logging import security_event_logger

class LoggedPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_staff:
            security_event_logger.log_permission_denied(
                user_id=str(request.user.id),
                email=request.user.email,
                resource=request.path,
                action=request.method,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            return False
        return True
```

## Log Output Example

```json
{
    "timestamp": "2026-02-09T12:34:56.789Z",
    "level": "WARNING",
    "logger": "security.events",
    "message": "Failed login attempt for user@example.com",
    "context": {
        "event_type": "login_failed",
        "category": "authentication",
        "severity": "warning",
        "email": "user@example.com",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "reason": "invalid_credentials",
        "failed_attempts_from_ip": 3,
        "is_suspicious": false
    }
}
```

## Testing

```bash
# Run all security logging tests
pytest apps/core/tests/test_security_logging.py -v

# Run specific test
pytest apps/core/tests/test_security_logging.py::SecurityEventLoggerTestCase::test_detect_brute_force_attack -v

# Run with coverage
pytest apps/core/tests/test_security_logging.py --cov=apps.core.logging
```

## Common Patterns

### Login Flow

```python
# 1. Check suspicious activity
if security_event_logger.is_suspicious_activity(ip_address=ip):
    return error_response

# 2. Attempt authentication
user = authenticate(...)

# 3. Log result
if user:
    security_event_logger.log_login_success(...)
else:
    security_event_logger.log_login_failed(...)

    # 4. Check if should lock
    if security_event_logger.get_failed_login_count(ip) >= 5:
        security_event_logger.log_account_locked(...)
```

### Password Change Flow

```python
# 1. Verify old password
if not user.check_password(old_password):
    return error_response

# 2. Set new password
user.set_password(new_password)
user.save()

# 3. Log the change
security_event_logger.log_password_changed(
    user_id=str(user.id),
    email=user.email,
    ip_address=ip,
    user_agent=user_agent
)
```

### Permission Check Flow

```python
# In permission class
def has_permission(self, request, view):
    has_perm = check_permission_logic()

    if not has_perm:
        security_event_logger.log_permission_denied(
            user_id=str(request.user.id),
            email=request.user.email,
            resource=request.path,
            action=request.method,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

    return has_perm
```

## Documentation

- **Full Documentation**: `SECURITY_LOGGING.md`
- **Migration Guide**: `SECURITY_LOGGING_MIGRATION.md`
- **Summary**: `SECURITY_LOGGING_SUMMARY.md`
- **This Reference**: `SECURITY_LOGGING_QUICKREF.md`

## File Location

`C:\copia dell\backup windows10\CRM\CRM Back end\apps\core\logging.py`
