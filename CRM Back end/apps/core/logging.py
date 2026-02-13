"""
Structured JSON logging for production environments.

This module provides:
- JsonFormatter: Formats log records as JSON for ELK/Loki/Datadog
- SecurityLogger: Convenience logger for security events
- SecurityEventLogger: Advanced security event tracking with pattern detection
- RequestLogMiddleware: Middleware for logging HTTP requests

Usage:
    from apps.core.logging import get_logger, security_logger, security_event_logger

    logger = get_logger(__name__)
    logger.info("User action", extra={"user_id": user.id, "action": "login"})

    # Simple security logging
    security_logger.warning("Failed login attempt", extra={"ip": ip, "email": email})

    # Advanced security logging with pattern detection
    security_event_logger.log_login_failed(
        email="user@example.com",
        ip_address="192.168.1.1",
        user_agent="Mozilla/5.0...",
        reason="invalid_credentials"
    )

    # Check for suspicious activity
    if security_event_logger.is_suspicious_activity(ip_address="192.168.1.1"):
        security_event_logger.log_account_locked(
            user_id=user.id,
            email=user.email,
            ip_address="192.168.1.1"
        )
"""

import json
import logging
import traceback
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from threading import Lock

from django.core.cache import cache


class JsonFormatter(logging.Formatter):
    """
    Formats log records as JSON for structured logging.

    Output format:
    {
        "timestamp": "2026-02-09T12:00:00.000Z",
        "level": "INFO",
        "logger": "apps.users",
        "message": "User logged in",
        "context": {...},
        "request_id": "abc123",
        "user_id": "123",
        "exception": {...}
    }
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add location info
        log_data["location"] = {
            "file": record.filename,
            "line": record.lineno,
            "function": record.funcName,
        }

        # Add extra fields from record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in (
                "name",
                "msg",
                "args",
                "created",
                "filename",
                "funcName",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "stack_info",
                "exc_info",
                "exc_text",
                "thread",
                "threadName",
                "message",
                "asctime",
            ):
                try:
                    # Ensure value is JSON serializable
                    json.dumps(value)
                    extra_fields[key] = value
                except (TypeError, ValueError):
                    extra_fields[key] = str(value)

        if extra_fields:
            log_data["context"] = extra_fields

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info),
            }

        return json.dumps(log_data, default=str)


class RequestLogMiddleware:
    """
    Middleware to log all HTTP requests with timing and context.

    Logs:
    - Request method, path, query params
    - Response status code
    - Request duration
    - User info (if authenticated)
    - Client IP
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger("apps.requests")

    def __call__(self, request):
        # Start timing
        start_time = time.time()

        # Get request info
        request_data = {
            "method": request.method,
            "path": request.path,
            "query_params": dict(request.GET),
            "ip": self._get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
        }

        # Process request
        response = self.get_response(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Add response info
        request_data.update(
            {
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "user_id": (
                    str(request.user.id) if request.user.is_authenticated else None
                ),
            }
        )

        # Log based on status code
        if response.status_code >= 500:
            self.logger.error("Request error", extra=request_data)
        elif response.status_code >= 400:
            self.logger.warning("Request client error", extra=request_data)
        else:
            self.logger.info("Request completed", extra=request_data)

        return response

    @staticmethod
    def _get_client_ip(request) -> str:
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name, typically __name__

    Returns:
        Logger instance configured with project settings
    """
    return logging.getLogger(name)


# Convenience logger for security events
security_logger = logging.getLogger("security")


class SecurityEvent:
    """Helper class for logging security events with consistent structure."""

    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    TWO_FACTOR_ENABLED = "2fa_enabled"
    TWO_FACTOR_DISABLED = "2fa_disabled"
    TWO_FACTOR_FAILED = "2fa_failed"
    PERMISSION_DENIED = "permission_denied"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMITED = "rate_limited"
    SESSION_EXPIRED = "session_expired"
    SESSION_TERMINATED = "session_terminated"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    DATA_EXPORT = "data_export"
    PII_ACCESS = "pii_access"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"

    # Event severity levels
    SEVERITY_INFO = "info"
    SEVERITY_WARNING = "warning"
    SEVERITY_ERROR = "error"
    SEVERITY_CRITICAL = "critical"

    # Event categories
    CATEGORY_AUTHENTICATION = "authentication"
    CATEGORY_AUTHORIZATION = "authorization"
    CATEGORY_DATA_ACCESS = "data_access"
    CATEGORY_ACCOUNT_MANAGEMENT = "account_management"
    CATEGORY_SECURITY_POLICY = "security_policy"

    # Event type to category mapping
    EVENT_CATEGORIES = {
        LOGIN_SUCCESS: CATEGORY_AUTHENTICATION,
        LOGIN_FAILED: CATEGORY_AUTHENTICATION,
        LOGOUT: CATEGORY_AUTHENTICATION,
        TWO_FACTOR_ENABLED: CATEGORY_AUTHENTICATION,
        TWO_FACTOR_DISABLED: CATEGORY_AUTHENTICATION,
        TWO_FACTOR_FAILED: CATEGORY_AUTHENTICATION,
        PASSWORD_CHANGED: CATEGORY_ACCOUNT_MANAGEMENT,
        PASSWORD_RESET_REQUESTED: CATEGORY_ACCOUNT_MANAGEMENT,
        PASSWORD_RESET_COMPLETED: CATEGORY_ACCOUNT_MANAGEMENT,
        ACCOUNT_LOCKED: CATEGORY_ACCOUNT_MANAGEMENT,
        ACCOUNT_UNLOCKED: CATEGORY_ACCOUNT_MANAGEMENT,
        PERMISSION_DENIED: CATEGORY_AUTHORIZATION,
        DATA_EXPORT: CATEGORY_DATA_ACCESS,
        PII_ACCESS: CATEGORY_DATA_ACCESS,
        SUSPICIOUS_ACTIVITY: CATEGORY_SECURITY_POLICY,
        RATE_LIMITED: CATEGORY_SECURITY_POLICY,
    }

    @classmethod
    def log(
        cls,
        event_type: str,
        message: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        level: str = "INFO",
        **extra,
    ):
        """
        Log a security event with consistent structure.

        Args:
            event_type: Type of security event (use class constants)
            message: Human-readable description
            user_id: ID of the user involved (if any)
            ip_address: Client IP address
            user_agent: Client user agent string
            level: Log level (INFO, WARNING, ERROR)
            **extra: Additional context to include
        """
        log_data = {
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            **extra,
        }

        log_method = getattr(security_logger, level.lower(), security_logger.info)
        log_method(message, extra=log_data)


class SecurityEventLogger:
    """
    Advanced security event logger with pattern detection and threat analysis.

    Features:
    - Categorized security event logging
    - Automatic severity assessment
    - Suspicious pattern detection (brute force, distributed attacks, etc.)
    - IP-based tracking and alerting
    - Integration with existing JsonFormatter

    Usage:
        from apps.core.logging import security_event_logger

        security_event_logger.log_login_failed(
            email="user@example.com",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0...",
            reason="invalid_credentials"
        )

        # Check for suspicious patterns
        if security_event_logger.is_suspicious_activity(ip_address="192.168.1.1"):
            # Take action (lock account, alert admin, etc.)
            pass
    """

    # Thresholds for suspicious activity detection
    FAILED_LOGIN_THRESHOLD = 5  # Failed attempts before flagging
    FAILED_LOGIN_WINDOW_MINUTES = 15  # Time window for failed attempts
    DISTRIBUTED_ATTACK_THRESHOLD = 10  # Different IPs trying same account
    DISTRIBUTED_ATTACK_WINDOW_MINUTES = 30
    ACCOUNT_ENUMERATION_THRESHOLD = 20  # Different usernames from same IP
    ACCOUNT_ENUMERATION_WINDOW_MINUTES = 10

    def __init__(self):
        self.logger = logging.getLogger("security.events")
        self._lock = Lock()

    def _get_cache_key(self, prefix: str, identifier: str) -> str:
        """Generate a cache key for tracking patterns."""
        return f"security:{prefix}:{identifier}"

    def _increment_counter(self, key: str, ttl_seconds: int) -> int:
        """
        Increment a counter in cache and return the new value.

        Args:
            key: Cache key
            ttl_seconds: Time to live for the counter

        Returns:
            New counter value
        """
        try:
            current = cache.get(key, 0)
            new_value = current + 1
            cache.set(key, new_value, ttl_seconds)
            return new_value
        except Exception:
            # If cache is unavailable, don't block the logging
            return 0

    def _get_counter(self, key: str) -> int:
        """Get the current value of a counter."""
        try:
            return cache.get(key, 0)
        except Exception:
            return 0

    def _add_to_set(self, key: str, value: str, ttl_seconds: int):
        """Add a value to a set in cache (for tracking unique items)."""
        try:
            current_set = cache.get(key, set())
            current_set.add(value)
            cache.set(key, current_set, ttl_seconds)
        except Exception:
            pass

    def _get_set_size(self, key: str) -> int:
        """Get the size of a set in cache."""
        try:
            current_set = cache.get(key, set())
            return len(current_set)
        except Exception:
            return 0

    def _determine_severity(self, event_type: str, **context) -> str:
        """
        Determine severity level based on event type and context.

        Args:
            event_type: Type of security event
            **context: Additional context for severity assessment

        Returns:
            Severity level (info, warning, error, critical)
        """
        # Critical events
        if event_type in [
            SecurityEvent.ACCOUNT_LOCKED,
            SecurityEvent.SUSPICIOUS_ACTIVITY,
        ]:
            return SecurityEvent.SEVERITY_CRITICAL

        # Error events
        if event_type in [
            SecurityEvent.LOGIN_FAILED,
            SecurityEvent.TWO_FACTOR_FAILED,
            SecurityEvent.PERMISSION_DENIED,
        ]:
            # Check if this is part of a pattern
            if context.get("is_suspicious"):
                return SecurityEvent.SEVERITY_CRITICAL
            return SecurityEvent.SEVERITY_WARNING

        # Warning events
        if event_type in [
            SecurityEvent.RATE_LIMITED,
            SecurityEvent.TWO_FACTOR_DISABLED,
            SecurityEvent.DATA_EXPORT,
            SecurityEvent.PII_ACCESS,
        ]:
            return SecurityEvent.SEVERITY_WARNING

        # Info events (successful operations)
        return SecurityEvent.SEVERITY_INFO

    def _log_event(
        self,
        event_type: str,
        message: str,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        **extra,
    ):
        """
        Internal method to log a security event with full context.

        Args:
            event_type: Type of security event
            message: Human-readable message
            user_id: User ID if available
            email: User email if available
            ip_address: Client IP address
            user_agent: Client user agent
            **extra: Additional context
        """
        severity = self._determine_severity(event_type, **extra)
        category = SecurityEvent.EVENT_CATEGORIES.get(event_type, "uncategorized")

        log_data = {
            "event_type": event_type,
            "category": category,
            "severity": severity,
            "user_id": user_id,
            "email": email,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **extra,
        }

        # Determine log level based on severity
        level_map = {
            SecurityEvent.SEVERITY_INFO: self.logger.info,
            SecurityEvent.SEVERITY_WARNING: self.logger.warning,
            SecurityEvent.SEVERITY_ERROR: self.logger.error,
            SecurityEvent.SEVERITY_CRITICAL: self.logger.critical,
        }

        log_method = level_map.get(severity, self.logger.info)
        log_method(message, extra=log_data)

    # Authentication Events

    def log_login_success(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        **extra,
    ):
        """Log successful login attempt."""
        # Clear failed login counters on success
        failed_key = self._get_cache_key("failed_login_ip", ip_address)
        cache.delete(failed_key)

        self._log_event(
            event_type=SecurityEvent.LOGIN_SUCCESS,
            message=f"User {email} logged in successfully",
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            **extra,
        )

    def log_login_failed(
        self,
        email: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        reason: str = "invalid_credentials",
        **extra,
    ):
        """
        Log failed login attempt and detect suspicious patterns.

        Args:
            email: Email address used in attempt
            ip_address: Client IP address
            user_agent: Client user agent
            reason: Reason for failure
            **extra: Additional context
        """
        # Track failed attempts by IP
        ttl = self.FAILED_LOGIN_WINDOW_MINUTES * 60
        failed_ip_key = self._get_cache_key("failed_login_ip", ip_address)
        failed_count = self._increment_counter(failed_ip_key, ttl)

        # Track different IPs trying the same email (distributed attack)
        email_ips_key = self._get_cache_key("login_attempts_email", email)
        self._add_to_set(
            email_ips_key, ip_address, self.DISTRIBUTED_ATTACK_WINDOW_MINUTES * 60
        )
        unique_ips = self._get_set_size(email_ips_key)

        # Track different emails from the same IP (account enumeration)
        ip_emails_key = self._get_cache_key("login_attempts_ip", ip_address)
        self._add_to_set(
            ip_emails_key, email, self.ACCOUNT_ENUMERATION_WINDOW_MINUTES * 60
        )
        unique_emails = self._get_set_size(ip_emails_key)

        # Detect suspicious patterns
        is_suspicious = (
            failed_count >= self.FAILED_LOGIN_THRESHOLD
            or unique_ips >= self.DISTRIBUTED_ATTACK_THRESHOLD
            or unique_emails >= self.ACCOUNT_ENUMERATION_THRESHOLD
        )

        extra_context = {
            "reason": reason,
            "failed_attempts_from_ip": failed_count,
            "unique_ips_for_email": unique_ips,
            "unique_emails_from_ip": unique_emails,
            "is_suspicious": is_suspicious,
            **extra,
        }

        self._log_event(
            event_type=SecurityEvent.LOGIN_FAILED,
            message=f"Failed login attempt for {email}",
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            **extra_context,
        )

        # Log additional suspicious activity alert
        if is_suspicious:
            self.log_suspicious_activity(
                ip_address=ip_address,
                email=email,
                description=self._build_suspicious_activity_description(
                    failed_count, unique_ips, unique_emails
                ),
                user_agent=user_agent,
            )

    def log_account_locked(
        self,
        user_id: str,
        email: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: str = "too_many_failed_attempts",
        **extra,
    ):
        """Log account lockout event."""
        self._log_event(
            event_type=SecurityEvent.ACCOUNT_LOCKED,
            message=f"Account locked for {email}",
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=reason,
            **extra,
        )

    def log_password_changed(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        **extra,
    ):
        """Log password change event."""
        self._log_event(
            event_type=SecurityEvent.PASSWORD_CHANGED,
            message=f"Password changed for {email}",
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            **extra,
        )

    def log_2fa_enabled(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        method: str = "totp",
        **extra,
    ):
        """Log two-factor authentication enabled event."""
        self._log_event(
            event_type=SecurityEvent.TWO_FACTOR_ENABLED,
            message=f"2FA enabled for {email}",
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            method=method,
            **extra,
        )

    # Authorization Events

    def log_permission_denied(
        self,
        user_id: str,
        email: str,
        resource: str,
        action: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        **extra,
    ):
        """
        Log permission denied event.

        Args:
            user_id: User ID attempting access
            email: User email
            resource: Resource being accessed
            action: Action being attempted
            ip_address: Client IP address
            user_agent: Client user agent
            **extra: Additional context
        """
        self._log_event(
            event_type=SecurityEvent.PERMISSION_DENIED,
            message=f"Permission denied for {email} trying to {action} {resource}",
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            resource=resource,
            action=action,
            **extra,
        )

    def log_suspicious_activity(
        self,
        ip_address: str,
        description: str,
        email: Optional[str] = None,
        user_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        **extra,
    ):
        """
        Log suspicious activity detection.

        Args:
            ip_address: IP address involved
            description: Description of suspicious activity
            email: User email if available
            user_id: User ID if available
            user_agent: Client user agent
            **extra: Additional context
        """
        self._log_event(
            event_type=SecurityEvent.SUSPICIOUS_ACTIVITY,
            message=f"Suspicious activity detected: {description}",
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            description=description,
            **extra,
        )

    # Pattern Detection Methods

    def _build_suspicious_activity_description(
        self, failed_attempts: int, unique_ips: int, unique_emails: int
    ) -> str:
        """Build a description of suspicious activity based on metrics."""
        patterns = []

        if failed_attempts >= self.FAILED_LOGIN_THRESHOLD:
            patterns.append(
                f"Multiple failed login attempts ({failed_attempts}) from same IP"
            )

        if unique_ips >= self.DISTRIBUTED_ATTACK_THRESHOLD:
            patterns.append(f"Distributed attack detected ({unique_ips} different IPs)")

        if unique_emails >= self.ACCOUNT_ENUMERATION_THRESHOLD:
            patterns.append(
                f"Possible account enumeration ({unique_emails} different emails)"
            )

        return "; ".join(patterns)

    def is_suspicious_activity(
        self, ip_address: Optional[str] = None, email: Optional[str] = None
    ) -> bool:
        """
        Check if there is suspicious activity for an IP or email.

        Args:
            ip_address: IP address to check
            email: Email to check

        Returns:
            True if suspicious activity detected
        """
        if ip_address:
            failed_ip_key = self._get_cache_key("failed_login_ip", ip_address)
            failed_count = self._get_counter(failed_ip_key)

            ip_emails_key = self._get_cache_key("login_attempts_ip", ip_address)
            unique_emails = self._get_set_size(ip_emails_key)

            if (
                failed_count >= self.FAILED_LOGIN_THRESHOLD
                or unique_emails >= self.ACCOUNT_ENUMERATION_THRESHOLD
            ):
                return True

        if email:
            email_ips_key = self._get_cache_key("login_attempts_email", email)
            unique_ips = self._get_set_size(email_ips_key)

            if unique_ips >= self.DISTRIBUTED_ATTACK_THRESHOLD:
                return True

        return False

    def get_failed_login_count(self, ip_address: str) -> int:
        """
        Get the number of failed login attempts from an IP.

        Args:
            ip_address: IP address to check

        Returns:
            Number of failed attempts
        """
        key = self._get_cache_key("failed_login_ip", ip_address)
        return self._get_counter(key)

    def reset_failed_login_count(self, ip_address: str):
        """
        Reset failed login counter for an IP address.

        Args:
            ip_address: IP address to reset
        """
        key = self._get_cache_key("failed_login_ip", ip_address)
        cache.delete(key)


# Global instance for convenience
security_event_logger = SecurityEventLogger()
