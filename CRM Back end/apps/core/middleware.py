"""
Core middleware for the CRM application.

Includes API versioning and deprecation headers.
"""


class APIVersioningMiddleware:
    """
    Middleware that adds API versioning headers to all responses.

    Headers added:
    - X-API-Version: Current API version
    - X-API-Deprecated: True if endpoint is deprecated
    - X-API-Sunset: Date when deprecated endpoints will be removed
    - X-API-Deprecation-Info: URL to migration guide

    Security: Helps clients prepare for API changes and migrate
    before deprecated endpoints are removed.
    """

    # Current stable API version
    API_VERSION = "1.0.0"

    # Define deprecated endpoints and their sunset dates
    # Format: (path_prefix, sunset_date, replacement_path)
    DEPRECATED_ENDPOINTS = [
        # Example:
        # ("/api/v1/old-endpoint/", "2026-06-01", "/api/v1/new-endpoint/"),
    ]

    # URL for API deprecation documentation
    DEPRECATION_DOCS_URL = "/api/docs/#deprecations"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Add API version header to all API responses
        if request.path.startswith("/api/"):
            response["X-API-Version"] = self.API_VERSION

            # Check if this endpoint is deprecated
            deprecation_info = self._check_deprecated(request.path)
            if deprecation_info:
                sunset_date, replacement = deprecation_info
                response["X-API-Deprecated"] = "true"
                response["X-API-Sunset"] = sunset_date
                response["X-API-Deprecation-Info"] = self.DEPRECATION_DOCS_URL
                if replacement:
                    response["X-API-Replacement"] = replacement

                # Add Link header for sunset specification (RFC 8594)
                response["Link"] = f'<{self.DEPRECATION_DOCS_URL}>; rel="sunset"'

        return response

    def _check_deprecated(self, path: str) -> tuple | None:
        """
        Check if the given path matches any deprecated endpoints.

        Returns:
            Tuple of (sunset_date, replacement_path) if deprecated, None otherwise.
        """
        for prefix, sunset_date, replacement in self.DEPRECATED_ENDPOINTS:
            if path.startswith(prefix):
                return (sunset_date, replacement)
        return None


class RequestMetadataMiddleware:
    """
    Middleware that adds useful metadata headers to responses.

    Headers added:
    - X-Request-ID: Unique request identifier for tracing
    - X-Response-Time: Time taken to process the request (ms)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time
        import uuid

        # Generate request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.request_id = request_id

        # Track response time
        start_time = time.monotonic()

        response = self.get_response(request)

        # Add headers
        response["X-Request-ID"] = request_id
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        response["X-Response-Time"] = f"{elapsed_ms}ms"

        return response
