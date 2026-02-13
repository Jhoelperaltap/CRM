# Security Event Logging

Comprehensive security event logging with pattern detection and threat analysis for the Ebenezer Tax Services CRM.

## Overview

The `SecurityEventLogger` class provides advanced security event logging with automatic threat detection. It tracks authentication events, authorization failures, and suspicious patterns like brute force attacks, distributed attacks, and account enumeration attempts.

## Features

- **Categorized Security Events**: All events are categorized by type (authentication, authorization, data access, etc.)
- **Automatic Severity Assessment**: Events are automatically assigned severity levels (info, warning, error, critical)
- **Pattern Detection**: Automatic detection of suspicious patterns:
  - Brute force attacks (multiple failed logins from same IP)
  - Distributed attacks (multiple IPs targeting same account)
  - Account enumeration (multiple usernames tried from same IP)
- **IP-based Tracking**: Track and flag suspicious IP addresses
- **Integration with JsonFormatter**: All events are logged as structured JSON for easy parsing
- **Redis-backed Counters**: Uses Redis cache for efficient pattern tracking

## Quick Start

```python
from apps.core.logging import security_event_logger

# Log a successful login
security_event_logger.log_login_success(
    user_id=str(user.id),
    email=user.email,
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0..."
)

# Log a failed login attempt (automatically tracks patterns)
security_event_logger.log_login_failed(
    email="user@example.com",
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0...",
    reason="invalid_credentials"
)

# Check for suspicious activity
if security_event_logger.is_suspicious_activity(ip_address="192.168.1.1"):
    # Take action (lock account, alert admin, etc.)
    security_event_logger.log_account_locked(
        user_id=str(user.id),
        email=user.email,
        ip_address="192.168.1.1",
        reason="too_many_failed_attempts"
    )
```

## Event Types

### Authentication Events

| Event Type | Constant | Description |
|------------|----------|-------------|
| Login Success | `SecurityEvent.LOGIN_SUCCESS` | User successfully authenticated |
| Login Failed | `SecurityEvent.LOGIN_FAILED` | Failed authentication attempt |
| Account Locked | `SecurityEvent.ACCOUNT_LOCKED` | Account locked due to security policy |
| Password Changed | `SecurityEvent.PASSWORD_CHANGED` | User password was changed |
| 2FA Enabled | `SecurityEvent.TWO_FACTOR_ENABLED` | Two-factor authentication enabled |

### Authorization Events

| Event Type | Constant | Description |
|------------|----------|-------------|
| Permission Denied | `SecurityEvent.PERMISSION_DENIED` | User attempted unauthorized action |

### Security Policy Events

| Event Type | Constant | Description |
|------------|----------|-------------|
| Suspicious Activity | `SecurityEvent.SUSPICIOUS_ACTIVITY` | Suspicious pattern detected |
| Rate Limited | `SecurityEvent.RATE_LIMITED` | Request rate limit exceeded |

## Event Categories

All events are automatically categorized:

- `CATEGORY_AUTHENTICATION`: Login/logout events
- `CATEGORY_AUTHORIZATION`: Permission checks
- `CATEGORY_DATA_ACCESS`: PII access, data exports
- `CATEGORY_ACCOUNT_MANAGEMENT`: Password changes, account locks
- `CATEGORY_SECURITY_POLICY`: Rate limiting, suspicious activity

## Severity Levels

Events are assigned severity levels automatically:

- `SEVERITY_INFO`: Normal operations (successful login, password change)
- `SEVERITY_WARNING`: Potential issues (failed login, rate limiting)
- `SEVERITY_ERROR`: Security violations (permission denied)
- `SEVERITY_CRITICAL`: Security incidents (account locked, suspicious activity)

Severity can escalate based on context. For example, a failed login is normally `WARNING`, but becomes `CRITICAL` if part of a suspicious pattern.

## Pattern Detection

### Brute Force Detection

Tracks failed login attempts from the same IP address:

- **Threshold**: 5 failed attempts
- **Window**: 15 minutes
- **Action**: Flags IP as suspicious

```python
# Automatically tracked with each failed login
security_event_logger.log_login_failed(
    email="user@example.com",
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0..."
)

# Check failed attempt count
count = security_event_logger.get_failed_login_count("192.168.1.1")
if count >= 5:
    # Lock account or take other action
    pass
```

### Distributed Attack Detection

Tracks multiple IP addresses targeting the same account:

- **Threshold**: 10 different IPs
- **Window**: 30 minutes
- **Action**: Flags account as under attack

### Account Enumeration Detection

Tracks multiple usernames tried from the same IP:

- **Threshold**: 20 different emails
- **Window**: 10 minutes
- **Action**: Flags IP as suspicious

## API Methods

### Authentication Events

#### `log_login_success()`

```python
security_event_logger.log_login_success(
    user_id: str,
    email: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    **extra
)
```

Logs successful authentication and clears failed attempt counters.

#### `log_login_failed()`

```python
security_event_logger.log_login_failed(
    email: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    reason: str = "invalid_credentials",
    **extra
)
```

Logs failed authentication, increments counters, and detects patterns automatically.

**Parameters:**
- `email`: Email address used in attempt
- `ip_address`: Client IP address
- `user_agent`: Client user agent string
- `reason`: Reason for failure (invalid_credentials, account_locked, etc.)

#### `log_account_locked()`

```python
security_event_logger.log_account_locked(
    user_id: str,
    email: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    reason: str = "too_many_failed_attempts",
    **extra
)
```

Logs account lockout event (always marked as CRITICAL).

#### `log_password_changed()`

```python
security_event_logger.log_password_changed(
    user_id: str,
    email: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    **extra
)
```

Logs password change event.

#### `log_2fa_enabled()`

```python
security_event_logger.log_2fa_enabled(
    user_id: str,
    email: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    method: str = "totp",
    **extra
)
```

Logs two-factor authentication enablement.

### Authorization Events

#### `log_permission_denied()`

```python
security_event_logger.log_permission_denied(
    user_id: str,
    email: str,
    resource: str,
    action: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    **extra
)
```

Logs permission denial.

**Parameters:**
- `resource`: Resource being accessed (e.g., "/api/v1/users/")
- `action`: HTTP method or action (e.g., "DELETE")

### Security Events

#### `log_suspicious_activity()`

```python
security_event_logger.log_suspicious_activity(
    ip_address: str,
    description: str,
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    user_agent: Optional[str] = None,
    **extra
)
```

Logs suspicious activity detection (always marked as CRITICAL).

### Utility Methods

#### `is_suspicious_activity()`

```python
is_suspicious = security_event_logger.is_suspicious_activity(
    ip_address: Optional[str] = None,
    email: Optional[str] = None
) -> bool
```

Check if there is suspicious activity for an IP address or email.

#### `get_failed_login_count()`

```python
count = security_event_logger.get_failed_login_count(ip_address: str) -> int
```

Get the number of failed login attempts from an IP address.

#### `reset_failed_login_count()`

```python
security_event_logger.reset_failed_login_count(ip_address: str)
```

Manually reset the failed login counter for an IP address.

## Log Output Format

All security events are logged as structured JSON via `JsonFormatter`:

```json
{
    "timestamp": "2026-02-09T12:34:56.789Z",
    "level": "WARNING",
    "logger": "security.events",
    "message": "Failed login attempt for user@example.com",
    "location": {
        "file": "logging.py",
        "line": 245,
        "function": "log_login_failed"
    },
    "context": {
        "event_type": "login_failed",
        "category": "authentication",
        "severity": "warning",
        "user_id": null,
        "email": "user@example.com",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "reason": "invalid_credentials",
        "failed_attempts_from_ip": 3,
        "unique_ips_for_email": 1,
        "unique_emails_from_ip": 1,
        "is_suspicious": false
    }
}
```

## Configuration

### Adjusting Detection Thresholds

You can customize the detection thresholds by subclassing `SecurityEventLogger`:

```python
from apps.core.logging import SecurityEventLogger

class CustomSecurityLogger(SecurityEventLogger):
    FAILED_LOGIN_THRESHOLD = 3  # Lock after 3 attempts instead of 5
    FAILED_LOGIN_WINDOW_MINUTES = 10  # 10 minute window instead of 15
    DISTRIBUTED_ATTACK_THRESHOLD = 5  # Lower threshold
    ACCOUNT_ENUMERATION_THRESHOLD = 10  # Lower threshold

# Use your custom logger
custom_logger = CustomSecurityLogger()
```

### Cache Backend

The logger uses Django's cache framework (Redis in production). Ensure Redis is configured:

```python
# settings/base.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://redis:6379/0',
    }
}
```

## Integration Examples

### Login View

```python
from rest_framework.decorators import api_view
from apps.core.logging import security_event_logger

@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    # Check for suspicious activity before attempting auth
    if security_event_logger.is_suspicious_activity(ip_address=ip_address):
        return Response(
            {'error': 'Too many attempts. Please try again later.'},
            status=403
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
        return Response({'error': 'Invalid credentials'}, status=401)
```

### Custom Permission Class

```python
from rest_framework.permissions import BasePermission
from apps.core.logging import security_event_logger

class LoggedPermission(BasePermission):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
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

## Monitoring and Alerting

### Query Logs with Elasticsearch

Example query to find suspicious activity in the last hour:

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"logger": "security.events"}},
        {"match": {"context.event_type": "suspicious_activity"}},
        {"range": {"timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}
```

### Alert on Critical Events

Set up alerts in your monitoring system for:

- `level: "CRITICAL"` events
- `context.event_type: "account_locked"`
- `context.is_suspicious: true`

## Best Practices

1. **Always log both successes and failures**: This provides audit trail
2. **Include IP and User Agent**: Essential for threat analysis
3. **Don't log sensitive data**: Never log passwords or tokens
4. **Monitor CRITICAL events**: Set up alerts for critical security events
5. **Review patterns regularly**: Use analytics to identify attack trends
6. **Rate limit login endpoints**: Use DRF throttling in addition to this logging
7. **Clear counters on success**: Successful login clears failed attempt counters

## Testing

Run the security logging tests:

```bash
pytest apps/core/tests/test_security_logging.py -v
```

## Performance Considerations

- **Cache Operations**: All pattern tracking uses Redis for high performance
- **Non-Blocking**: Cache failures don't block authentication
- **TTL-based Cleanup**: Counters automatically expire (no manual cleanup needed)
- **Minimal Overhead**: < 5ms overhead per authentication attempt

## Security Considerations

- **Rate Limiting**: Use this in combination with DRF throttling
- **Account Lockout**: Implement temporary lockouts, not permanent
- **IP Blocking**: Consider temporary IP blocks for flagged addresses
- **Alert Administrators**: Critical events should trigger admin notifications
- **Regular Review**: Review security logs regularly for patterns

## Future Enhancements

Potential improvements:

- Machine learning-based anomaly detection
- Geolocation tracking for unusual login locations
- User behavior profiling
- Integration with threat intelligence feeds
- Automatic IP reputation checking
- Session anomaly detection

## Related Documentation

- [Django Logging Configuration](https://docs.djangoproject.com/en/5.1/topics/logging/)
- [Django Cache Framework](https://docs.djangoproject.com/en/5.1/topics/cache/)
- [REST Framework Throttling](https://www.django-rest-framework.org/api-guide/throttling/)
