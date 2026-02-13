"""
Brute force protection service.

Implements account lockout after multiple failed login attempts
to prevent brute force password attacks.
"""

import logging
from datetime import timedelta
from typing import Optional, Tuple

from django.utils import timezone

logger = logging.getLogger(__name__)


class BruteForceProtection:
    """
    Service to check and update login attempt tracking for brute force protection.
    """

    @staticmethod
    def check_account_locked(user) -> Tuple[bool, Optional[int]]:
        """
        Check if a user account is currently locked.

        Returns:
            Tuple of (is_locked: bool, remaining_seconds: int or None)
        """
        if not user or not user.locked_until:
            return False, None

        now = timezone.now()
        if user.locked_until > now:
            remaining = (user.locked_until - now).total_seconds()
            return True, int(remaining)

        # Lock has expired, clear it
        user.locked_until = None
        user.failed_login_attempts = 0
        user.save(update_fields=["locked_until", "failed_login_attempts"])
        return False, None

    @staticmethod
    def record_failed_attempt(user, policy) -> Tuple[bool, Optional[int]]:
        """
        Record a failed login attempt and potentially lock the account.

        Args:
            user: The User object
            policy: AuthenticationPolicy with lockout settings

        Returns:
            Tuple of (account_locked: bool, lockout_remaining_seconds: int or None)
        """
        if not user:
            return False, None

        now = timezone.now()

        # Check if we should reset the counter (outside the time window)
        window_start = now - timedelta(minutes=policy.failed_login_window_minutes)
        if user.last_failed_login and user.last_failed_login < window_start:
            user.failed_login_attempts = 0

        user.failed_login_attempts += 1
        user.last_failed_login = now

        if user.failed_login_attempts >= policy.max_failed_login_attempts:
            # Lock the account
            user.locked_until = now + timedelta(minutes=policy.lockout_duration_minutes)
            user.save(update_fields=[
                "failed_login_attempts",
                "last_failed_login",
                "locked_until",
            ])

            remaining = int(policy.lockout_duration_minutes * 60)
            logger.warning(
                f"Account locked due to {user.failed_login_attempts} failed login attempts: "
                f"user={user.email}, lockout_minutes={policy.lockout_duration_minutes}"
            )
            return True, remaining

        user.save(update_fields=["failed_login_attempts", "last_failed_login"])

        logger.info(
            f"Failed login attempt {user.failed_login_attempts}/{policy.max_failed_login_attempts}: "
            f"user={user.email}"
        )
        return False, None

    @staticmethod
    def record_successful_login(user) -> None:
        """
        Record a successful login and reset the failed attempt counter.

        Args:
            user: The User object
        """
        if not user:
            return

        if user.failed_login_attempts > 0 or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.last_failed_login = None
            user.save(update_fields=[
                "failed_login_attempts",
                "locked_until",
                "last_failed_login",
            ])

    @staticmethod
    def get_remaining_attempts(user, policy) -> int:
        """
        Get the number of remaining login attempts before lockout.

        Args:
            user: The User object
            policy: AuthenticationPolicy with lockout settings

        Returns:
            Number of remaining attempts
        """
        if not user:
            return policy.max_failed_login_attempts

        # Check if we should reset the counter (outside the time window)
        now = timezone.now()
        window_start = now - timedelta(minutes=policy.failed_login_window_minutes)

        if user.last_failed_login and user.last_failed_login < window_start:
            return policy.max_failed_login_attempts

        return max(0, policy.max_failed_login_attempts - user.failed_login_attempts)

    @staticmethod
    def unlock_account(user) -> bool:
        """
        Manually unlock a user account.

        Args:
            user: The User object

        Returns:
            True if account was unlocked, False if it wasn't locked
        """
        if not user or not user.locked_until:
            return False

        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_failed_login = None
        user.save(update_fields=[
            "failed_login_attempts",
            "locked_until",
            "last_failed_login",
        ])

        logger.info(f"Account manually unlocked: user={user.email}")
        return True
