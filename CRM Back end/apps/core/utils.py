import logging
import threading
from ipaddress import AddressValueError, IPv4Address, IPv6Address
from typing import Optional

from django.conf import settings
from django.http import HttpRequest

logger = logging.getLogger(__name__)

_request_store = threading.local()


def set_current_request(request):
    _request_store.request = request


def get_current_request():
    return getattr(_request_store, "request", None)


def _validate_ip_address(ip_string: str) -> bool:
    """Validate that a string is a valid IPv4 or IPv6 address."""
    try:
        IPv4Address(ip_string)
        return True
    except AddressValueError:
        pass
    try:
        IPv6Address(ip_string)
        return True
    except AddressValueError:
        pass
    return False


def get_client_ip(request: HttpRequest) -> str:
    """
    Extract client IP address from request.

    SECURITY: Validates X-Forwarded-For header to prevent IP spoofing.
    Only trusts X-Forwarded-For if TRUSTED_PROXY_IPS is configured.

    Args:
        request: Django HttpRequest object

    Returns:
        Client IP address as string
    """
    remote_addr = request.META.get("REMOTE_ADDR", "")

    # Only trust X-Forwarded-For if the direct connection is from a trusted proxy
    trusted_proxies = getattr(settings, "TRUSTED_PROXY_IPS", [])

    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff and (not trusted_proxies or remote_addr in trusted_proxies):
        # Get the first (client) IP from X-Forwarded-For
        first_ip = xff.split(",")[0].strip()

        # SECURITY: Validate that it's actually an IP address
        if _validate_ip_address(first_ip):
            return first_ip
        else:
            # Log potential spoofing attempt
            logger.warning(
                f"Invalid IP in X-Forwarded-For header: {first_ip} "
                f"(full header: {xff[:100]})"
            )

    return remote_addr


def get_client_ip_safe(request: Optional[HttpRequest]) -> str:
    """
    Safe version of get_client_ip that handles None request.

    Args:
        request: Django HttpRequest object or None

    Returns:
        Client IP address or "unknown" if request is None
    """
    if request is None:
        return "unknown"
    return get_client_ip(request)
