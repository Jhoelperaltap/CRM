"""
Granular rate limiting for sensitive endpoints.

Security: Provides different rate limits for different types of operations
to prevent abuse while allowing normal usage.
"""

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Rate limit for login attempts.
    Stricter limit to prevent brute force attacks.
    """

    scope = "login"


class PasswordResetRateThrottle(SimpleRateThrottle):
    """
    Rate limit for password reset requests.
    Prevents enumeration and abuse of password reset functionality.
    """

    scope = "password_reset"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class TwoFactorRateThrottle(SimpleRateThrottle):
    """
    Rate limit for 2FA verification attempts.
    Prevents brute force attacks on TOTP codes.
    """

    scope = "two_factor"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class FileUploadRateThrottle(SimpleRateThrottle):
    """
    Rate limit for file uploads.
    Prevents resource exhaustion through excessive uploads.
    """

    scope = "file_upload"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class BulkOperationRateThrottle(SimpleRateThrottle):
    """
    Rate limit for bulk operations (import, export, batch updates).
    Prevents resource exhaustion.
    """

    scope = "bulk_operation"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class SensitiveDataRateThrottle(SimpleRateThrottle):
    """
    Rate limit for accessing sensitive data (SSN, financial info).
    Stricter limit to prevent mass data extraction.
    """

    scope = "sensitive_data"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class AdminOperationRateThrottle(SimpleRateThrottle):
    """
    Rate limit for admin operations (user management, role changes).
    Prevents rapid changes that could indicate compromise.
    """

    scope = "admin_operation"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class APIKeyOperationRateThrottle(SimpleRateThrottle):
    """
    Rate limit for API key operations (create, rotate, delete).
    Prevents rapid key cycling that could indicate key compromise.
    """

    scope = "api_key_operation"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class EmailSendRateThrottle(SimpleRateThrottle):
    """
    Rate limit for sending emails.
    Prevents email spam/abuse.
    """

    scope = "email_send"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class ReportGenerationRateThrottle(SimpleRateThrottle):
    """
    Rate limit for generating reports.
    Prevents resource exhaustion from complex report generation.
    """

    scope = "report_generation"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
