"""
HTML input sanitization utilities for preventing XSS attacks.

This module provides utilities to sanitize HTML input, allowing only safe tags
and attributes while stripping dangerous content like script tags, event handlers,
and javascript: URLs.

Uses the bleach library for robust sanitization with fallback to basic html.escape.
"""

import html
import logging
import re
from typing import Dict, List, Optional, Set

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

logger = logging.getLogger(__name__)

# Try to import bleach, fall back to basic sanitization if not available
try:
    import bleach

    HAS_BLEACH = True

    # Try to import CSS sanitizer (requires tinycss2)
    try:
        from bleach.css_sanitizer import CSSSanitizer

        HAS_CSS_SANITIZER = True
    except ImportError:
        HAS_CSS_SANITIZER = False
        logger.debug(
            "bleach.css_sanitizer not available (requires tinycss2). "
            "CSS sanitization will be disabled."
        )

except ImportError:
    HAS_BLEACH = False
    HAS_CSS_SANITIZER = False
    logger.warning(
        "bleach library not installed. Using basic HTML sanitization. "
        "Install bleach for more robust sanitization: pip install bleach"
    )

# Safe HTML tags allowed by default
ALLOWED_TAGS: Set[str] = {
    # Text formatting
    "p",
    "br",
    "b",
    "i",
    "u",
    "strong",
    "em",
    "mark",
    "small",
    "del",
    "ins",
    "sub",
    "sup",
    "span",
    # Lists
    "ul",
    "ol",
    "li",
    # Links
    "a",
    # Headings
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    # Tables
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    # Quotes
    "blockquote",
    "cite",
    "code",
    "pre",
}

# Safe attributes allowed by default
ALLOWED_ATTRIBUTES: Dict[str, List[str]] = {
    "a": ["href", "title", "rel", "target"],
    "span": ["class"],
    "p": ["class"],
    "code": ["class"],
    "table": ["class"],
    "th": ["scope"],
    "td": ["colspan", "rowspan"],
}

# Safe URL protocols for links
ALLOWED_PROTOCOLS: Set[str] = {
    "http",
    "https",
    "mailto",
    "tel",
}

# Safe CSS properties if CSS sanitization is enabled
ALLOWED_CSS_PROPERTIES: Set[str] = {
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "text-align",
    "text-decoration",
    "padding",
    "margin",
}

# Dangerous patterns to detect even after sanitization
DANGEROUS_PATTERNS = [
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"data:text/html", re.IGNORECASE),
    re.compile(r"vbscript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),  # Event handlers like onclick=
    re.compile(r"<script", re.IGNORECASE),
    re.compile(r"<iframe", re.IGNORECASE),
    re.compile(r"<object", re.IGNORECASE),
    re.compile(r"<embed", re.IGNORECASE),
]


class HTMLSanitizer:
    """
    HTML sanitization utility that allows only safe tags and attributes.

    This class provides methods to sanitize HTML input to prevent XSS attacks
    while preserving safe formatting.

    Example:
        >>> sanitizer = HTMLSanitizer()
        >>> safe_html = sanitizer.sanitize('<p>Hello <script>alert("XSS")</script></p>')
        >>> # Returns: '<p>Hello &lt;script&gt;alert("XSS")&lt;/script&gt;</p>'

        >>> # Custom configuration
        >>> sanitizer = HTMLSanitizer(
        ...     allowed_tags={'p', 'br'},
        ...     allowed_attributes={'p': ['class']},
        ...     strip=True
        ... )
    """

    def __init__(
        self,
        allowed_tags: Optional[Set[str]] = None,
        allowed_attributes: Optional[Dict[str, List[str]]] = None,
        allowed_protocols: Optional[Set[str]] = None,
        strip: bool = True,
        allow_css: bool = False,
    ):
        """
        Initialize the HTML sanitizer.

        Args:
            allowed_tags: Set of allowed HTML tags. Defaults to ALLOWED_TAGS.
            allowed_attributes: Dict of tag -> allowed attributes. Defaults to ALLOWED_ATTRIBUTES.
            allowed_protocols: Set of allowed URL protocols. Defaults to ALLOWED_PROTOCOLS.
            strip: If True, strip disallowed tags instead of escaping them.
            allow_css: If True, allow safe CSS styles in style attributes.
        """
        self.allowed_tags = allowed_tags if allowed_tags is not None else ALLOWED_TAGS.copy()
        self.allowed_attributes = allowed_attributes if allowed_attributes is not None else ALLOWED_ATTRIBUTES.copy()
        self.allowed_protocols = allowed_protocols if allowed_protocols is not None else ALLOWED_PROTOCOLS.copy()
        self.strip = strip
        self.allow_css = allow_css

        if not HAS_BLEACH:
            logger.debug("Bleach not available, using basic sanitization")

    def sanitize(self, html_input: str) -> str:
        """
        Sanitize HTML input to prevent XSS attacks.

        Args:
            html_input: The HTML string to sanitize

        Returns:
            Sanitized HTML string with only safe tags and attributes

        Raises:
            ValueError: If input is None or not a string
        """
        if html_input is None:
            raise ValueError("HTML input cannot be None")

        if not isinstance(html_input, str):
            raise ValueError(f"HTML input must be a string, got {type(html_input)}")

        # Empty string is safe
        if not html_input.strip():
            return html_input

        if HAS_BLEACH:
            return self._sanitize_with_bleach(html_input)
        else:
            return self._sanitize_basic(html_input)

    def _sanitize_with_bleach(self, html_input: str) -> str:
        """
        Sanitize HTML using the bleach library.

        Args:
            html_input: The HTML string to sanitize

        Returns:
            Sanitized HTML string
        """
        css_sanitizer = None
        attributes = self.allowed_attributes

        if self.allow_css and HAS_CSS_SANITIZER:
            css_sanitizer = CSSSanitizer(allowed_css_properties=ALLOWED_CSS_PROPERTIES)
            # Add 'style' to allowed attributes for all tags
            attributes = self.allowed_attributes.copy()
            for tag in self.allowed_tags:
                if tag in attributes:
                    if "style" not in attributes[tag]:
                        attributes[tag] = attributes[tag] + ["style"]
                else:
                    attributes[tag] = ["style"]
        elif self.allow_css and not HAS_CSS_SANITIZER:
            logger.warning(
                "CSS sanitization requested but css_sanitizer not available. "
                "Install tinycss2 to enable CSS sanitization: pip install tinycss2"
            )

        # Sanitize with bleach
        sanitized = bleach.clean(
            html_input,
            tags=self.allowed_tags,
            attributes=attributes,
            protocols=self.allowed_protocols,
            strip=self.strip,
            css_sanitizer=css_sanitizer,
        )

        # Additional check for dangerous patterns
        self._check_dangerous_patterns(sanitized)

        return sanitized

    def _sanitize_basic(self, html_input: str) -> str:
        """
        Basic HTML sanitization using html.escape.

        This is a fallback when bleach is not available. It escapes all HTML
        tags and special characters, providing maximum safety but no formatting.

        Args:
            html_input: The HTML string to sanitize

        Returns:
            Escaped HTML string
        """
        # Basic sanitization: escape all HTML
        sanitized = html.escape(html_input, quote=True)

        logger.debug("Using basic HTML sanitization (all tags escaped)")

        return sanitized

    def _check_dangerous_patterns(self, text: str) -> None:
        """
        Check for dangerous patterns that might have bypassed sanitization.

        Args:
            text: The text to check

        Raises:
            ValueError: If dangerous patterns are detected
        """
        for pattern in DANGEROUS_PATTERNS:
            if pattern.search(text):
                logger.warning(
                    f"Dangerous pattern detected after sanitization: {pattern.pattern}"
                )
                raise ValueError(
                    "Potentially dangerous content detected in HTML input"
                )

    def sanitize_or_none(self, html_input: Optional[str]) -> Optional[str]:
        """
        Sanitize HTML input, returning None if input is None.

        Args:
            html_input: The HTML string to sanitize or None

        Returns:
            Sanitized HTML string or None
        """
        if html_input is None:
            return None
        return self.sanitize(html_input)


class StrictHTMLSanitizer(HTMLSanitizer):
    """
    Strict HTML sanitizer that allows only minimal formatting.

    Only allows: p, br, b, i, u, strong, em
    No links, no attributes, no CSS.
    """

    def __init__(self):
        super().__init__(
            allowed_tags={"p", "br", "b", "i", "u", "strong", "em"},
            allowed_attributes={},
            strip=True,
            allow_css=False,
        )


class PlainTextSanitizer(HTMLSanitizer):
    """
    Plain text sanitizer that strips all HTML tags.

    Converts HTML to plain text by removing all tags.
    """

    def __init__(self):
        super().__init__(
            allowed_tags=set(),
            allowed_attributes={},
            strip=True,
            allow_css=False,
        )


# Default sanitizer instance
default_sanitizer = HTMLSanitizer()


def sanitize_html(
    html_input: str,
    allowed_tags: Optional[Set[str]] = None,
    allowed_attributes: Optional[Dict[str, List[str]]] = None,
    strip: bool = True,
) -> str:
    """
    Convenience function to sanitize HTML input.

    Args:
        html_input: The HTML string to sanitize
        allowed_tags: Set of allowed HTML tags
        allowed_attributes: Dict of tag -> allowed attributes
        strip: If True, strip disallowed tags instead of escaping them

    Returns:
        Sanitized HTML string

    Example:
        >>> safe_html = sanitize_html('<p>Hello <script>alert("XSS")</script></p>')
        >>> # Returns: '<p>Hello </p>'
    """
    sanitizer = HTMLSanitizer(
        allowed_tags=allowed_tags,
        allowed_attributes=allowed_attributes,
        strip=strip,
    )
    return sanitizer.sanitize(html_input)


def strip_html(html_input: str) -> str:
    """
    Strip all HTML tags from input, leaving only plain text.

    Args:
        html_input: The HTML string to strip

    Returns:
        Plain text with all HTML removed

    Example:
        >>> plain_text = strip_html('<p>Hello <b>world</b>!</p>')
        >>> # Returns: 'Hello world!'
    """
    sanitizer = PlainTextSanitizer()
    return sanitizer.sanitize(html_input)


# Django REST Framework Integration

class SanitizedCharField(serializers.CharField):
    """
    DRF CharField that automatically sanitizes HTML input.

    This field can be used in serializers to automatically sanitize
    HTML content while allowing safe formatting.

    Example:
        class CommentSerializer(serializers.ModelSerializer):
            content = SanitizedCharField(max_length=5000)

            class Meta:
                model = Comment
                fields = ['content']
    """

    def __init__(self, **kwargs):
        """
        Initialize the sanitized char field.

        Additional kwargs:
            allowed_tags: Set of allowed HTML tags
            allowed_attributes: Dict of tag -> allowed attributes
            strip: If True, strip disallowed tags
            strict: If True, use strict sanitizer
            plain_text: If True, strip all HTML
        """
        self.allowed_tags = kwargs.pop("allowed_tags", None)
        self.allowed_attributes = kwargs.pop("allowed_attributes", None)
        self.strip = kwargs.pop("strip", True)
        self.strict = kwargs.pop("strict", False)
        self.plain_text = kwargs.pop("plain_text", False)

        super().__init__(**kwargs)

        # Create appropriate sanitizer
        if self.plain_text:
            self.sanitizer = PlainTextSanitizer()
        elif self.strict:
            self.sanitizer = StrictHTMLSanitizer()
        else:
            self.sanitizer = HTMLSanitizer(
                allowed_tags=self.allowed_tags,
                allowed_attributes=self.allowed_attributes,
                strip=self.strip,
            )

    def to_internal_value(self, data):
        """Convert input data to sanitized internal value."""
        # First validate with parent class
        value = super().to_internal_value(data)

        # Then sanitize
        try:
            return self.sanitizer.sanitize(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))


class HTMLValidator:
    """
    DRF validator that checks HTML for dangerous content.

    Can be used as a field validator to reject HTML with malicious content.

    Example:
        class CommentSerializer(serializers.ModelSerializer):
            content = serializers.CharField(
                validators=[HTMLValidator()]
            )
    """

    def __init__(
        self,
        allowed_tags: Optional[Set[str]] = None,
        allowed_attributes: Optional[Dict[str, List[str]]] = None,
    ):
        """
        Initialize the HTML validator.

        Args:
            allowed_tags: Set of allowed HTML tags
            allowed_attributes: Dict of tag -> allowed attributes
        """
        self.sanitizer = HTMLSanitizer(
            allowed_tags=allowed_tags,
            allowed_attributes=allowed_attributes,
        )

    def __call__(self, value: str):
        """
        Validate the HTML value.

        Args:
            value: The HTML string to validate

        Raises:
            serializers.ValidationError: If the HTML contains dangerous content
        """
        if not value:
            return

        try:
            sanitized = self.sanitizer.sanitize(value)

            # Check if sanitization changed the content significantly
            # This might indicate malicious content was removed
            if HAS_BLEACH:
                # If bleach is available, we trust its sanitization
                # Just check for dangerous patterns
                self.sanitizer._check_dangerous_patterns(sanitized)
            else:
                # Without bleach, all HTML is escaped, so check if it changed
                if sanitized != value:
                    raise serializers.ValidationError(
                        _("HTML content contains disallowed tags or attributes.")
                    )

        except ValueError as e:
            raise serializers.ValidationError(str(e))


def validate_safe_html(value: str) -> str:
    """
    Django validator function for safe HTML.

    Can be used in Django model fields to validate HTML content.

    Args:
        value: The HTML string to validate

    Returns:
        The original value if valid

    Raises:
        ValidationError: If the HTML contains dangerous content

    Example:
        class Comment(models.Model):
            content = models.TextField(
                validators=[validate_safe_html]
            )
    """
    if not value:
        return value

    sanitizer = HTMLSanitizer()

    try:
        sanitized = sanitizer.sanitize(value)

        # Check if sanitization changed the content
        if sanitized != value:
            logger.warning(
                "HTML validation failed: content was modified during sanitization"
            )
            raise ValidationError(
                _("HTML content contains disallowed tags or attributes."),
                code="unsafe_html",
            )

    except ValueError as e:
        raise ValidationError(str(e), code="unsafe_html")

    return value
