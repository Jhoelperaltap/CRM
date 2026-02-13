"""
Tests for security event logging with pattern detection.
"""
import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.cache import cache

from apps.core.logging import (
    SecurityEvent,
    SecurityEventLogger,
    security_event_logger,
)


class SecurityEventTestCase(TestCase):
    """Test SecurityEvent helper class."""

    def test_event_constants(self):
        """Test that all event type constants are defined."""
        self.assertEqual(SecurityEvent.LOGIN_SUCCESS, "login_success")
        self.assertEqual(SecurityEvent.LOGIN_FAILED, "login_failed")
        self.assertEqual(SecurityEvent.ACCOUNT_LOCKED, "account_locked")
        self.assertEqual(SecurityEvent.PASSWORD_CHANGED, "password_changed")
        self.assertEqual(SecurityEvent.TWO_FACTOR_ENABLED, "2fa_enabled")
        self.assertEqual(SecurityEvent.PERMISSION_DENIED, "permission_denied")
        self.assertEqual(SecurityEvent.SUSPICIOUS_ACTIVITY, "suspicious_activity")

    def test_severity_constants(self):
        """Test severity level constants."""
        self.assertEqual(SecurityEvent.SEVERITY_INFO, "info")
        self.assertEqual(SecurityEvent.SEVERITY_WARNING, "warning")
        self.assertEqual(SecurityEvent.SEVERITY_ERROR, "error")
        self.assertEqual(SecurityEvent.SEVERITY_CRITICAL, "critical")

    def test_category_constants(self):
        """Test category constants."""
        self.assertEqual(SecurityEvent.CATEGORY_AUTHENTICATION, "authentication")
        self.assertEqual(SecurityEvent.CATEGORY_AUTHORIZATION, "authorization")
        self.assertEqual(SecurityEvent.CATEGORY_DATA_ACCESS, "data_access")

    def test_event_category_mapping(self):
        """Test that events are mapped to correct categories."""
        self.assertEqual(
            SecurityEvent.EVENT_CATEGORIES[SecurityEvent.LOGIN_SUCCESS],
            SecurityEvent.CATEGORY_AUTHENTICATION
        )
        self.assertEqual(
            SecurityEvent.EVENT_CATEGORIES[SecurityEvent.PERMISSION_DENIED],
            SecurityEvent.CATEGORY_AUTHORIZATION
        )


class SecurityEventLoggerTestCase(TestCase):
    """Test SecurityEventLogger class."""

    def setUp(self):
        """Set up test fixtures."""
        cache.clear()
        self.logger = SecurityEventLogger()
        self.test_ip = "192.168.1.100"
        self.test_email = "test@example.com"
        self.test_user_id = "123e4567-e89b-12d3-a456-426614174000"
        self.test_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

    def tearDown(self):
        """Clean up after tests."""
        cache.clear()

    def test_log_login_success(self):
        """Test logging successful login."""
        with self.assertLogs("security.events", level="INFO") as cm:
            self.logger.log_login_success(
                user_id=self.test_user_id,
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        self.assertEqual(len(cm.output), 1)
        self.assertIn("logged in successfully", cm.output[0])

    def test_log_login_success_clears_failed_counter(self):
        """Test that successful login clears failed attempt counter."""
        # Simulate some failed attempts
        for _ in range(3):
            self.logger.log_login_failed(
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        # Verify counter exists
        count = self.logger.get_failed_login_count(self.test_ip)
        self.assertEqual(count, 3)

        # Log successful login
        self.logger.log_login_success(
            user_id=self.test_user_id,
            email=self.test_email,
            ip_address=self.test_ip,
            user_agent=self.test_user_agent,
        )

        # Verify counter is cleared
        count = self.logger.get_failed_login_count(self.test_ip)
        self.assertEqual(count, 0)

    def test_log_login_failed_increments_counter(self):
        """Test that failed login increments counter."""
        self.logger.log_login_failed(
            email=self.test_email,
            ip_address=self.test_ip,
            user_agent=self.test_user_agent,
        )

        count = self.logger.get_failed_login_count(self.test_ip)
        self.assertEqual(count, 1)

    def test_detect_brute_force_attack(self):
        """Test detection of brute force attack from single IP."""
        # Simulate multiple failed attempts
        for i in range(SecurityEventLogger.FAILED_LOGIN_THRESHOLD):
            self.logger.log_login_failed(
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        # Check that suspicious activity was detected
        is_suspicious = self.logger.is_suspicious_activity(ip_address=self.test_ip)
        self.assertTrue(is_suspicious)

    def test_detect_distributed_attack(self):
        """Test detection of distributed attack (multiple IPs, same account)."""
        # Simulate attacks from different IPs
        for i in range(SecurityEventLogger.DISTRIBUTED_ATTACK_THRESHOLD):
            ip = f"192.168.1.{i}"
            self.logger.log_login_failed(
                email=self.test_email,
                ip_address=ip,
                user_agent=self.test_user_agent,
            )

        # Check that suspicious activity was detected for the email
        is_suspicious = self.logger.is_suspicious_activity(email=self.test_email)
        self.assertTrue(is_suspicious)

    def test_detect_account_enumeration(self):
        """Test detection of account enumeration (many emails from one IP)."""
        # Simulate trying many different emails from same IP
        for i in range(SecurityEventLogger.ACCOUNT_ENUMERATION_THRESHOLD):
            email = f"user{i}@example.com"
            self.logger.log_login_failed(
                email=email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        # Check that suspicious activity was detected
        is_suspicious = self.logger.is_suspicious_activity(ip_address=self.test_ip)
        self.assertTrue(is_suspicious)

    def test_log_account_locked(self):
        """Test logging account lockout."""
        with self.assertLogs("security.events", level="CRITICAL") as cm:
            self.logger.log_account_locked(
                user_id=self.test_user_id,
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
                reason="too_many_failed_attempts",
            )

        self.assertEqual(len(cm.output), 1)
        self.assertIn("Account locked", cm.output[0])

    def test_log_password_changed(self):
        """Test logging password change."""
        with self.assertLogs("security.events", level="INFO") as cm:
            self.logger.log_password_changed(
                user_id=self.test_user_id,
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        self.assertEqual(len(cm.output), 1)
        self.assertIn("Password changed", cm.output[0])

    def test_log_2fa_enabled(self):
        """Test logging 2FA enablement."""
        with self.assertLogs("security.events", level="INFO") as cm:
            self.logger.log_2fa_enabled(
                user_id=self.test_user_id,
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
                method="totp",
            )

        self.assertEqual(len(cm.output), 1)
        self.assertIn("2FA enabled", cm.output[0])

    def test_log_permission_denied(self):
        """Test logging permission denied."""
        with self.assertLogs("security.events", level="WARNING") as cm:
            self.logger.log_permission_denied(
                user_id=self.test_user_id,
                email=self.test_email,
                resource="/api/v1/users/",
                action="DELETE",
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        self.assertEqual(len(cm.output), 1)
        self.assertIn("Permission denied", cm.output[0])

    def test_log_suspicious_activity(self):
        """Test logging suspicious activity."""
        with self.assertLogs("security.events", level="CRITICAL") as cm:
            self.logger.log_suspicious_activity(
                ip_address=self.test_ip,
                description="Multiple failed login attempts",
                email=self.test_email,
                user_agent=self.test_user_agent,
            )

        self.assertEqual(len(cm.output), 1)
        self.assertIn("Suspicious activity detected", cm.output[0])

    def test_determine_severity_critical(self):
        """Test severity determination for critical events."""
        severity = self.logger._determine_severity(SecurityEvent.ACCOUNT_LOCKED)
        self.assertEqual(severity, SecurityEvent.SEVERITY_CRITICAL)

        severity = self.logger._determine_severity(SecurityEvent.SUSPICIOUS_ACTIVITY)
        self.assertEqual(severity, SecurityEvent.SEVERITY_CRITICAL)

    def test_determine_severity_warning(self):
        """Test severity determination for warning events."""
        severity = self.logger._determine_severity(SecurityEvent.RATE_LIMITED)
        self.assertEqual(severity, SecurityEvent.SEVERITY_WARNING)

        severity = self.logger._determine_severity(SecurityEvent.DATA_EXPORT)
        self.assertEqual(severity, SecurityEvent.SEVERITY_WARNING)

    def test_determine_severity_info(self):
        """Test severity determination for info events."""
        severity = self.logger._determine_severity(SecurityEvent.LOGIN_SUCCESS)
        self.assertEqual(severity, SecurityEvent.SEVERITY_INFO)

    def test_determine_severity_escalation(self):
        """Test severity escalation based on context."""
        # Normal failed login is warning
        severity = self.logger._determine_severity(SecurityEvent.LOGIN_FAILED)
        self.assertEqual(severity, SecurityEvent.SEVERITY_WARNING)

        # Failed login with suspicious flag is critical
        severity = self.logger._determine_severity(
            SecurityEvent.LOGIN_FAILED,
            is_suspicious=True
        )
        self.assertEqual(severity, SecurityEvent.SEVERITY_CRITICAL)

    def test_reset_failed_login_count(self):
        """Test manual reset of failed login counter."""
        # Create some failed attempts
        for _ in range(3):
            self.logger.log_login_failed(
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

        count = self.logger.get_failed_login_count(self.test_ip)
        self.assertEqual(count, 3)

        # Reset counter
        self.logger.reset_failed_login_count(self.test_ip)

        count = self.logger.get_failed_login_count(self.test_ip)
        self.assertEqual(count, 0)

    def test_build_suspicious_activity_description(self):
        """Test building descriptive message for suspicious activity."""
        description = self.logger._build_suspicious_activity_description(
            failed_attempts=10,
            unique_ips=2,
            unique_emails=3
        )

        self.assertIn("Multiple failed login attempts", description)
        self.assertIn("10", description)

    def test_global_security_event_logger_instance(self):
        """Test that global instance is available."""
        self.assertIsInstance(security_event_logger, SecurityEventLogger)

    def test_cache_unavailable_handling(self):
        """Test that logging continues even if cache is unavailable."""
        with patch('django.core.cache.cache.get', side_effect=Exception("Cache error")):
            # Should not raise exception
            try:
                self.logger.log_login_failed(
                    email=self.test_email,
                    ip_address=self.test_ip,
                    user_agent=self.test_user_agent,
                )
            except Exception as e:
                self.fail(f"Logging raised exception when cache unavailable: {e}")

    def test_event_context_includes_all_fields(self):
        """Test that logged events include all expected fields."""
        with patch.object(self.logger.logger, 'info') as mock_log:
            self.logger.log_login_success(
                user_id=self.test_user_id,
                email=self.test_email,
                ip_address=self.test_ip,
                user_agent=self.test_user_agent,
            )

            # Verify log was called
            self.assertTrue(mock_log.called)

            # Get the extra data passed to the logger
            call_args = mock_log.call_args
            extra_data = call_args[1]['extra']

            # Verify all expected fields are present
            self.assertEqual(extra_data['event_type'], SecurityEvent.LOGIN_SUCCESS)
            self.assertEqual(extra_data['user_id'], self.test_user_id)
            self.assertEqual(extra_data['email'], self.test_email)
            self.assertEqual(extra_data['ip_address'], self.test_ip)
            self.assertEqual(extra_data['user_agent'], self.test_user_agent)
            self.assertIn('category', extra_data)
            self.assertIn('severity', extra_data)
            self.assertIn('timestamp', extra_data)
