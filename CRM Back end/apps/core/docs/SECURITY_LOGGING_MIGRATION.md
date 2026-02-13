# Security Logging Migration Guide

Step-by-step guide to integrate the new SecurityEventLogger into your existing authentication and authorization code.

## Prerequisites

Ensure you have:
- Redis configured and running (required for pattern tracking)
- Django cache framework set up
- Updated `apps/core/logging.py` with SecurityEventLogger

## Step 1: Update Authentication Views

### Current Code (apps/users/views.py or urls_auth.py)

```python
from rest_framework_simplejwt.views import TokenObtainPairView

class LoginView(TokenObtainPairView):
    pass
```

### Updated Code with Security Logging

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate

from apps.core.logging import security_event_logger


class LoginView(TokenObtainPairView):
    """Login view with security event logging."""

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')

        # Extract request metadata
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Check for suspicious activity before processing
        if security_event_logger.is_suspicious_activity(ip_address=ip_address):
            security_event_logger.log_suspicious_activity(
                ip_address=ip_address,
                email=email,
                description="Login attempt from IP with suspicious activity",
                user_agent=user_agent,
            )
            return Response(
                {'error': 'Too many failed attempts. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Attempt authentication
        response = super().post(request, *args, **kwargs)

        # Log success or failure
        if response.status_code == 200:
            # Successful login
            try:
                from apps.users.models import User
                user = User.objects.get(email=email)
                security_event_logger.log_login_success(
                    user_id=str(user.id),
                    email=user.email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            except User.DoesNotExist:
                pass
        else:
            # Failed login
            security_event_logger.log_login_failed(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="invalid_credentials",
            )

            # Check if account should be locked
            failed_count = security_event_logger.get_failed_login_count(ip_address)
            if failed_count >= 5:
                try:
                    from apps.users.models import User
                    user = User.objects.get(email=email)
                    # Implement your account locking logic here
                    # user.is_locked = True
                    # user.locked_until = timezone.now() + timedelta(hours=1)
                    # user.save()

                    security_event_logger.log_account_locked(
                        user_id=str(user.id),
                        email=user.email,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        reason="too_many_failed_attempts",
                    )
                except User.DoesNotExist:
                    pass

        return response

    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
```

## Step 2: Add Account Locking to User Model

### Update User Model (apps/users/models.py)

```python
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    # ... existing fields ...

    # Add these fields for account locking
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)
    failed_login_count = models.IntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)

    def is_account_locked(self):
        """Check if account is currently locked."""
        if not self.is_locked:
            return False

        if self.locked_until and timezone.now() > self.locked_until:
            # Lock expired, unlock account
            self.is_locked = False
            self.locked_until = None
            self.failed_login_count = 0
            self.save()
            return False

        return True
```

### Create Migration

```bash
python manage.py makemigrations users
python manage.py migrate
```

## Step 3: Update Password Change View

### Current Code

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({'error': 'Invalid password'}, status=400)

    user.set_password(new_password)
    user.save()

    return Response({'message': 'Password changed'})
```

### Updated Code

```python
from apps.core.logging import security_event_logger

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    ip_address = _get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    if not user.check_password(old_password):
        return Response({'error': 'Invalid password'}, status=400)

    user.set_password(new_password)
    user.save()

    # Log password change
    security_event_logger.log_password_changed(
        user_id=str(user.id),
        email=user.email,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return Response({'message': 'Password changed'})
```

## Step 4: Add Permission Denied Logging

### Create Custom Permission Class (apps/core/permissions.py)

```python
from rest_framework.permissions import BasePermission
from apps.core.logging import security_event_logger


class LoggedBasePermission(BasePermission):
    """
    Base permission class that logs permission denials.
    Extend this instead of BasePermission for automatic logging.
    """

    def has_permission(self, request, view):
        has_perm = self._check_permission(request, view)

        if not has_perm and request.user.is_authenticated:
            security_event_logger.log_permission_denied(
                user_id=str(request.user.id),
                email=request.user.email,
                resource=request.path,
                action=request.method,
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

        return has_perm

    def _check_permission(self, request, view):
        """Override this method with your permission logic."""
        return True

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')


class IsAdminPermission(LoggedBasePermission):
    """Example: Admin-only permission with logging."""

    def _check_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff
```

### Update Your Views

```python
from apps.core.permissions import IsAdminPermission

class UserViewSet(ModelViewSet):
    permission_classes = [IsAdminPermission]
    # ... rest of viewset ...
```

## Step 5: Add Security Event Monitoring Dashboard

### Create Admin View (apps/users/views.py)

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from apps.core.logging import security_event_logger


@api_view(['GET'])
@permission_classes([IsAdminUser])
def security_dashboard(request):
    """
    View security metrics for administrators.
    """
    ip_address = request.query_params.get('ip_address')
    email = request.query_params.get('email')

    result = {
        'timestamp': timezone.now().isoformat(),
    }

    if ip_address:
        result['ip_analysis'] = {
            'ip_address': ip_address,
            'failed_login_count': security_event_logger.get_failed_login_count(ip_address),
            'is_suspicious': security_event_logger.is_suspicious_activity(ip_address=ip_address),
        }

    if email:
        result['email_analysis'] = {
            'email': email,
            'is_suspicious': security_event_logger.is_suspicious_activity(email=email),
        }

    return Response(result)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def reset_ip_lockout(request):
    """
    Manually reset failed login counter for an IP.
    """
    ip_address = request.data.get('ip_address')

    if not ip_address:
        return Response({'error': 'ip_address required'}, status=400)

    security_event_logger.reset_failed_login_count(ip_address)

    return Response({
        'message': f'Reset failed login count for {ip_address}'
    })
```

### Add URL Routes (apps/users/urls.py)

```python
from django.urls import path
from . import views

urlpatterns = [
    # ... existing routes ...
    path('security/dashboard/', views.security_dashboard, name='security-dashboard'),
    path('security/reset-lockout/', views.reset_ip_lockout, name='reset-lockout'),
]
```

## Step 6: Configure Logging in Settings

### Update settings/base.py

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'apps.core.logging.JsonFormatter',
        },
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json' if not DEBUG else 'verbose',
        },
        'security_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/security.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'json',
        },
    },
    'loggers': {
        'security.events': {
            'handlers': ['console', 'security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

## Step 7: Set Up Monitoring Alerts

### Example: Email Alert on Critical Events

```python
# apps/core/logging.py - Add to SecurityEventLogger class

def _log_event(self, event_type, message, **kwargs):
    severity = self._determine_severity(event_type, **kwargs)

    # ... existing logging code ...

    # Send email alert for critical events
    if severity == SecurityEvent.SEVERITY_CRITICAL:
        self._send_alert_email(event_type, message, **kwargs)

def _send_alert_email(self, event_type, message, **kwargs):
    """Send email alert to administrators for critical security events."""
    from django.core.mail import mail_admins
    from django.conf import settings

    if not settings.DEBUG:
        subject = f"Security Alert: {event_type}"
        body = f"""
        Critical security event detected:

        Type: {event_type}
        Message: {message}
        IP Address: {kwargs.get('ip_address')}
        User: {kwargs.get('email')}
        Timestamp: {datetime.now(timezone.utc).isoformat()}

        Additional Context:
        {json.dumps(kwargs, indent=2)}
        """

        mail_admins(subject, body, fail_silently=True)
```

## Step 8: Testing Your Implementation

### Test Failed Login Detection

```python
# In your test file
from apps.core.logging import security_event_logger
from django.core.cache import cache

class SecurityLoggingTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_brute_force_detection(self):
        """Test that brute force attacks are detected."""
        ip = "192.168.1.100"

        # Simulate 5 failed attempts
        for i in range(5):
            security_event_logger.log_login_failed(
                email="test@example.com",
                ip_address=ip,
                user_agent="Test Agent"
            )

        # Should now be flagged as suspicious
        self.assertTrue(
            security_event_logger.is_suspicious_activity(ip_address=ip)
        )

        # Failed count should be 5
        self.assertEqual(
            security_event_logger.get_failed_login_count(ip),
            5
        )
```

## Step 9: Deploy to Production

### Checklist

- [ ] Redis is running and configured
- [ ] Logging directory exists and is writable: `mkdir -p logs/`
- [ ] Security log rotation is configured
- [ ] Email alerts are configured (ADMINS setting)
- [ ] Monitoring dashboard is set up
- [ ] All tests pass: `pytest apps/core/tests/test_security_logging.py`
- [ ] Review security thresholds for your use case
- [ ] Set up log aggregation (ELK, Splunk, etc.)

### Environment Variables

```bash
# .env
REDIS_URL=redis://redis:6379/0
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=alerts@example.com
EMAIL_HOST_PASSWORD=your-password
ADMINS=admin@example.com,security@example.com
```

## Step 10: Monitor and Iterate

### Weekly Review Checklist

- Review CRITICAL security events
- Check for patterns in suspicious activity
- Adjust thresholds if needed (too sensitive or not sensitive enough)
- Verify alerts are being received
- Review account lockouts (false positives?)

### Queries for Log Analysis

```bash
# Find all suspicious activity in last 24 hours
grep "suspicious_activity" logs/security.log | jq 'select(.context.timestamp > "2026-02-08")'

# Count failed logins by IP
grep "login_failed" logs/security.log | jq -r '.context.ip_address' | sort | uniq -c | sort -rn

# Find all account lockouts
grep "account_locked" logs/security.log | jq .
```

## Troubleshooting

### Issue: Counters Not Working

**Cause**: Redis not configured or not running

**Solution**:
```bash
# Check Redis
docker-compose ps redis

# Test Redis connection
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'value')
>>> cache.get('test')
```

### Issue: Too Many False Positives

**Cause**: Thresholds too low

**Solution**: Adjust thresholds in your settings:
```python
# config/settings/base.py
SECURITY_LOGGING = {
    'FAILED_LOGIN_THRESHOLD': 10,  # Increase from 5
    'ACCOUNT_ENUMERATION_THRESHOLD': 50,  # Increase from 20
}
```

Then use custom logger:
```python
from apps.core.logging import SecurityEventLogger

class CustomLogger(SecurityEventLogger):
    FAILED_LOGIN_THRESHOLD = settings.SECURITY_LOGGING['FAILED_LOGIN_THRESHOLD']
    # ... etc
```

### Issue: Logs Not Appearing

**Cause**: Logger not configured

**Solution**: Check logging configuration in settings and ensure security.events logger is defined.

## Support

For questions or issues:
- Check the main documentation: `apps/core/docs/SECURITY_LOGGING.md`
- Review test examples: `apps/core/tests/test_security_logging.py`
- Check usage examples: `apps/core/examples/security_logging_usage.py`
