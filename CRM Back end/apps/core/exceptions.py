"""
Custom exception handling for the CRM API.

Security: This module sanitizes error responses to prevent information
disclosure while still providing useful feedback for legitimate errors.
"""
import logging
import re
from typing import Any

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("security")


# Patterns that might leak sensitive information
SENSITIVE_PATTERNS = [
    # Database errors
    (r"(psycopg2|mysql|sqlite|oracle|postgres)", "database error"),
    (r"relation \".*\" does not exist", "database error"),
    (r"column \".*\" (does not exist|of relation)", "database error"),
    (r"duplicate key value violates unique constraint", "duplicate entry"),
    (r"DETAIL:\s+Key \(.*\)", "constraint violation"),
    (r"null value in column", "missing required field"),
    # File system
    (r"(\/[a-z_\-\s0-9\.]+)+", "file path"),
    (r"[A-Za-z]:\\[^\s]*", "file path"),  # Windows paths
    # Connection strings
    (r"(postgresql|mysql|redis|mongodb):\/\/[^\s]+", "connection details"),
    # Secrets/keys
    (r"(api[_-]?key|secret|password|token)[\s]*[=:]\s*[^\s]+", "credentials"),
    (r"[a-zA-Z0-9]{32,}", "potential secret"),  # Long alphanumeric strings
    # Stack traces
    (r"File \".*\", line \d+", "internal error"),
    (r"Traceback \(most recent call last\)", "internal error"),
    # SQL
    (r"(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\s+", "query details"),
]

# Generic error messages for different categories
GENERIC_ERROR_MESSAGES = {
    "database": "A database error occurred. Please try again later.",
    "validation": "The submitted data was invalid.",
    "authentication": "Authentication failed.",
    "authorization": "You do not have permission to perform this action.",
    "not_found": "The requested resource was not found.",
    "server": "An internal error occurred. Please try again later.",
    "rate_limit": "Too many requests. Please try again later.",
}


def sanitize_error_message(message: str, debug: bool = False) -> str:
    """
    Sanitize error message to remove sensitive information.

    Security: Prevents information disclosure through error messages
    by redacting patterns that could reveal system internals.
    """
    if debug:
        return message

    if not isinstance(message, str):
        return str(message)

    sanitized = message

    # Check for sensitive patterns
    for pattern, category in SENSITIVE_PATTERNS:
        if re.search(pattern, sanitized, re.IGNORECASE):
            # Log the original message for debugging
            security_logger.warning(
                "Sanitized sensitive information in error message",
                extra={
                    "category": category,
                    "pattern": pattern,
                    "original_length": len(message),
                },
            )
            # Return a generic message for this category
            if category == "database error":
                return GENERIC_ERROR_MESSAGES["database"]
            elif category == "internal error":
                return GENERIC_ERROR_MESSAGES["server"]
            elif category in ("file path", "connection details", "credentials", "potential secret"):
                return GENERIC_ERROR_MESSAGES["server"]
            elif category == "query details":
                return GENERIC_ERROR_MESSAGES["database"]
            else:
                # Redact the matched portion
                sanitized = re.sub(pattern, f"[{category}]", sanitized, flags=re.IGNORECASE)

    return sanitized


def sanitize_error_data(data: Any, debug: bool = False) -> Any:
    """
    Recursively sanitize error data structure.
    """
    if debug:
        return data

    if isinstance(data, str):
        return sanitize_error_message(data, debug)
    elif isinstance(data, dict):
        return {k: sanitize_error_data(v, debug) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_error_data(item, debug) for item in data]
    else:
        return data


def custom_exception_handler(exc, context):
    """
    Custom exception handler with security-focused error sanitization.

    Security features:
    - Sanitizes error messages to prevent information disclosure
    - Logs detailed errors server-side while returning safe client messages
    - Handles different exception types appropriately
    - Adds consistent response structure
    """
    # Get the standard DRF response
    response = exception_handler(exc, context)

    # Determine if we should show detailed errors (only in DEBUG mode)
    debug = getattr(settings, "DEBUG", False)

    # Get view info for logging
    view = context.get("view")
    view_name = getattr(view, "__class__", type(view)).__name__ if view else "Unknown"
    request = context.get("request")
    request_path = getattr(request, "path", "Unknown") if request else "Unknown"
    request_method = getattr(request, "method", "Unknown") if request else "Unknown"

    if response is not None:
        # Sanitize the response data
        if not debug:
            response.data = sanitize_error_data(response.data, debug)

        # Add consistent structure
        if isinstance(response.data, dict):
            response.data["status_code"] = response.status_code
        else:
            response.data = {
                "detail": response.data,
                "status_code": response.status_code,
            }

        # Log authentication failures to security log
        if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            security_logger.warning(
                "Authentication failure",
                extra={
                    "view": view_name,
                    "path": request_path,
                    "method": request_method,
                    "exception_type": type(exc).__name__,
                    "ip_address": _get_client_ip(request) if request else None,
                },
            )

        return response

    # Unhandled exceptions - log full details server-side
    logger.exception(
        "Unhandled exception in %s (%s %s)",
        view_name,
        request_method,
        request_path,
        extra={
            "view": view_name,
            "path": request_path,
            "method": request_method,
            "exception_type": type(exc).__name__,
        },
    )

    # Log to security log if it looks suspicious
    exc_str = str(exc)
    if any(keyword in exc_str.lower() for keyword in ["injection", "script", "sql", "xss"]):
        security_logger.error(
            "Potentially malicious request caused exception",
            extra={
                "view": view_name,
                "path": request_path,
                "method": request_method,
                "exception_type": type(exc).__name__,
                "ip_address": _get_client_ip(request) if request else None,
            },
        )

    # Return a generic error response
    return Response(
        {
            "detail": GENERIC_ERROR_MESSAGES["server"] if not debug else str(exc),
            "status_code": 500,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _get_client_ip(request):
    """Extract client IP from request."""
    if request is None:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


# Custom exceptions for the application
class BusinessLogicError(APIException):
    """Exception for business logic violations."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A business logic error occurred."
    default_code = "business_logic_error"


class ConflictError(APIException):
    """Exception for resource conflicts (e.g., duplicate entries)."""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A conflict occurred with the current state of the resource."
    default_code = "conflict"


class ServiceUnavailableError(APIException):
    """Exception for temporary service unavailability."""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Service temporarily unavailable. Please try again later."
    default_code = "service_unavailable"
