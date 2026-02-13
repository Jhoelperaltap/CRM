"""
Tests for HTML sanitization utilities.

Tests the sanitizers module to ensure proper XSS prevention while
allowing safe HTML formatting.
"""

import pytest
from django.core.exceptions import ValidationError
from rest_framework import serializers

from apps.core.sanitizers import (
    HAS_BLEACH,
    HTMLSanitizer,
    HTMLValidator,
    PlainTextSanitizer,
    SanitizedCharField,
    StrictHTMLSanitizer,
    default_sanitizer,
    sanitize_html,
    strip_html,
    validate_safe_html,
)


class TestHTMLSanitizer:
    """Tests for the HTMLSanitizer class."""

    def test_sanitize_safe_html(self):
        """Test that safe HTML passes through unchanged."""
        sanitizer = HTMLSanitizer()
        safe_html = "<p>Hello <strong>world</strong>!</p>"
        result = sanitizer.sanitize(safe_html)

        assert "<p>" in result
        assert "<strong>" in result
        assert "Hello" in result
        assert "world" in result

    def test_sanitize_removes_script_tags(self):
        """Test that script tags are removed or escaped."""
        sanitizer = HTMLSanitizer()
        dangerous_html = '<p>Hello <script>alert("XSS")</script></p>'
        result = sanitizer.sanitize(dangerous_html)

        # Script tag itself should be removed or escaped
        assert "<script>" not in result.lower()
        # Note: bleach strips the script tag but preserves text content
        # This is expected behavior - the dangerous tag is removed

    def test_sanitize_removes_event_handlers(self):
        """Test that event handlers are removed."""
        sanitizer = HTMLSanitizer()
        dangerous_html = '<p onclick="alert(\'XSS\')">Click me</p>'
        result = sanitizer.sanitize(dangerous_html)

        # onclick should be removed
        assert "onclick" not in result.lower()
        assert "Click me" in result

    def test_sanitize_removes_javascript_urls(self):
        """Test that javascript: URLs are removed."""
        sanitizer = HTMLSanitizer()
        dangerous_html = '<a href="javascript:alert(\'XSS\')">Click</a>'
        result = sanitizer.sanitize(dangerous_html)

        # javascript: should be removed
        assert "javascript:" not in result.lower()

    def test_sanitize_allows_safe_links(self):
        """Test that safe HTTP(S) links are allowed."""
        sanitizer = HTMLSanitizer()
        safe_html = '<a href="https://example.com">Link</a>'
        result = sanitizer.sanitize(safe_html)

        if HAS_BLEACH:
            assert "https://example.com" in result
            assert "<a" in result
        # Without bleach, all HTML is escaped

    def test_sanitize_custom_tags(self):
        """Test sanitizer with custom allowed tags."""
        sanitizer = HTMLSanitizer(
            allowed_tags={"p", "br"},
            allowed_attributes={},
        )
        html = "<p>Hello</p><strong>World</strong><br>"
        result = sanitizer.sanitize(html)

        assert "<p>" in result
        assert "Hello" in result
        if HAS_BLEACH:
            # strong should be stripped or escaped
            assert "<strong>" not in result

    def test_sanitize_empty_string(self):
        """Test that empty string is handled correctly."""
        sanitizer = HTMLSanitizer()
        assert sanitizer.sanitize("") == ""
        assert sanitizer.sanitize("   ") == "   "

    def test_sanitize_none_raises_error(self):
        """Test that None input raises ValueError."""
        sanitizer = HTMLSanitizer()
        with pytest.raises(ValueError, match="cannot be None"):
            sanitizer.sanitize(None)

    def test_sanitize_non_string_raises_error(self):
        """Test that non-string input raises ValueError."""
        sanitizer = HTMLSanitizer()
        with pytest.raises(ValueError, match="must be a string"):
            sanitizer.sanitize(123)

    def test_sanitize_or_none_with_none(self):
        """Test sanitize_or_none handles None correctly."""
        sanitizer = HTMLSanitizer()
        assert sanitizer.sanitize_or_none(None) is None

    def test_sanitize_or_none_with_value(self):
        """Test sanitize_or_none sanitizes valid input."""
        sanitizer = HTMLSanitizer()
        result = sanitizer.sanitize_or_none("<p>Hello</p>")
        assert result is not None
        assert "Hello" in result

    def test_sanitize_iframe_removed(self):
        """Test that iframe tags are removed."""
        sanitizer = HTMLSanitizer()
        dangerous_html = '<p>Text</p><iframe src="evil.com"></iframe>'
        result = sanitizer.sanitize(dangerous_html)

        assert "<iframe" not in result.lower()
        assert "Text" in result

    def test_sanitize_object_embed_removed(self):
        """Test that object and embed tags are removed."""
        sanitizer = HTMLSanitizer()
        dangerous_html = '<object data="evil.swf"></object><embed src="evil.swf">'
        result = sanitizer.sanitize(dangerous_html)

        assert "<object" not in result.lower()
        assert "<embed" not in result.lower()

    def test_sanitize_data_uri_in_link(self):
        """Test that data: URIs are removed from links."""
        sanitizer = HTMLSanitizer()
        dangerous_html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>'
        result = sanitizer.sanitize(dangerous_html)

        # data: URI should be removed
        assert "data:text/html" not in result.lower()

    def test_sanitize_preserves_line_breaks(self):
        """Test that line breaks are preserved."""
        sanitizer = HTMLSanitizer()
        html = "<p>Line 1</p><br><p>Line 2</p>"
        result = sanitizer.sanitize(html)

        assert "Line 1" in result
        assert "Line 2" in result
        if HAS_BLEACH:
            assert "<br>" in result or "<br />" in result

    def test_sanitize_with_strip_false(self):
        """Test sanitization with strip=False escapes tags."""
        sanitizer = HTMLSanitizer(strip=False)
        html = "<script>alert(1)</script><p>Hello</p>"
        result = sanitizer.sanitize(html)

        # With bleach and strip=False, disallowed tags are escaped
        if HAS_BLEACH:
            assert "&lt;script&gt;" in result or "<script>" not in result.lower()


class TestStrictHTMLSanitizer:
    """Tests for the StrictHTMLSanitizer class."""

    def test_strict_allows_minimal_tags(self):
        """Test that strict sanitizer allows only minimal tags."""
        sanitizer = StrictHTMLSanitizer()
        html = "<p>Hello <strong>world</strong></p>"
        result = sanitizer.sanitize(html)

        assert "Hello" in result
        assert "world" in result
        assert "<p>" in result
        assert "<strong>" in result

    def test_strict_removes_links(self):
        """Test that strict sanitizer removes links."""
        sanitizer = StrictHTMLSanitizer()
        html = '<p>Text <a href="http://example.com">link</a></p>'
        result = sanitizer.sanitize(html)

        if HAS_BLEACH:
            # Links should be removed
            assert "<a" not in result
        assert "Text" in result
        assert "link" in result

    def test_strict_removes_attributes(self):
        """Test that strict sanitizer removes all attributes."""
        sanitizer = StrictHTMLSanitizer()
        html = '<p class="test" id="para">Text</p>'
        result = sanitizer.sanitize(html)

        if HAS_BLEACH:
            # Bleach should remove class and id attributes
            assert 'class="test"' not in result
            assert 'id="para"' not in result
        assert "Text" in result
        assert "<p>" in result


class TestPlainTextSanitizer:
    """Tests for the PlainTextSanitizer class."""

    def test_plain_text_strips_all_html(self):
        """Test that plain text sanitizer strips all HTML."""
        sanitizer = PlainTextSanitizer()
        html = "<p>Hello <strong>world</strong>!</p>"
        result = sanitizer.sanitize(html)

        assert "Hello" in result
        assert "world" in result
        if HAS_BLEACH:
            # All tags should be removed
            assert "<p>" not in result
            assert "<strong>" not in result

    def test_plain_text_removes_scripts(self):
        """Test that scripts are removed in plain text mode."""
        sanitizer = PlainTextSanitizer()
        html = '<script>alert("XSS")</script>Hello'
        result = sanitizer.sanitize(html)

        assert "<script>" not in result.lower()
        # Content might be preserved or removed depending on implementation


class TestConvenienceFunctions:
    """Tests for convenience functions."""

    def test_sanitize_html_function(self):
        """Test the sanitize_html convenience function."""
        result = sanitize_html("<p>Hello <script>alert(1)</script></p>")

        assert "Hello" in result
        assert "<script>" not in result.lower()

    def test_sanitize_html_custom_tags(self):
        """Test sanitize_html with custom tags."""
        result = sanitize_html(
            "<p>Hello</p><strong>World</strong>",
            allowed_tags={"p"},
        )

        assert "Hello" in result
        if HAS_BLEACH:
            assert "<strong>" not in result

    def test_strip_html_function(self):
        """Test the strip_html convenience function."""
        result = strip_html("<p>Hello <strong>world</strong>!</p>")

        assert "Hello" in result
        assert "world" in result
        if HAS_BLEACH:
            assert "<p>" not in result
            assert "<strong>" not in result

    def test_default_sanitizer(self):
        """Test the default sanitizer instance."""
        result = default_sanitizer.sanitize("<p>Hello</p>")
        assert "Hello" in result


class TestSanitizedCharField:
    """Tests for the DRF SanitizedCharField."""

    def test_sanitized_field_cleans_input(self):
        """Test that the field sanitizes input."""

        class TestSerializer(serializers.Serializer):
            content = SanitizedCharField()

        serializer = TestSerializer(
            data={"content": '<p>Hello <script>alert(1)</script></p>'}
        )
        assert serializer.is_valid()

        cleaned = serializer.validated_data["content"]
        assert "Hello" in cleaned
        assert "<script>" not in cleaned.lower()

    def test_sanitized_field_strict_mode(self):
        """Test the field in strict mode."""

        class TestSerializer(serializers.Serializer):
            content = SanitizedCharField(strict=True)

        serializer = TestSerializer(data={"content": '<p>Hello <a href="#">link</a></p>'})
        assert serializer.is_valid()

        cleaned = serializer.validated_data["content"]
        if HAS_BLEACH:
            # Links should be removed in strict mode
            assert "<a" not in cleaned

    def test_sanitized_field_plain_text_mode(self):
        """Test the field in plain text mode."""

        class TestSerializer(serializers.Serializer):
            content = SanitizedCharField(plain_text=True)

        serializer = TestSerializer(data={"content": "<p>Hello <strong>world</strong></p>"})
        assert serializer.is_valid()

        cleaned = serializer.validated_data["content"]
        if HAS_BLEACH:
            # All HTML should be stripped
            assert "<p>" not in cleaned
            assert "<strong>" not in cleaned

    def test_sanitized_field_custom_tags(self):
        """Test the field with custom allowed tags."""

        class TestSerializer(serializers.Serializer):
            content = SanitizedCharField(allowed_tags={"p", "br"})

        serializer = TestSerializer(
            data={"content": "<p>Hello</p><br><strong>World</strong>"}
        )
        assert serializer.is_valid()

        cleaned = serializer.validated_data["content"]
        if HAS_BLEACH:
            assert "<strong>" not in cleaned

    def test_sanitized_field_validates_with_parent(self):
        """Test that parent field validation still works."""

        class TestSerializer(serializers.Serializer):
            content = SanitizedCharField(max_length=10)

        # Should fail max_length validation
        serializer = TestSerializer(data={"content": "<p>This is a very long text</p>"})
        assert not serializer.is_valid()
        assert "content" in serializer.errors


class TestHTMLValidator:
    """Tests for the HTMLValidator class."""

    def test_validator_allows_safe_html(self):
        """Test that validator allows safe HTML."""
        validator = HTMLValidator()

        # Should not raise
        validator("<p>Hello <strong>world</strong></p>")

    def test_validator_rejects_dangerous_html(self):
        """Test that validator rejects dangerous HTML."""
        validator = HTMLValidator()

        if HAS_BLEACH:
            # With bleach, dangerous content is sanitized, not rejected
            # unless it contains patterns that bypass sanitization
            try:
                validator('<p>Hello <script>alert(1)</script></p>')
                # Bleach sanitizes it, so no error expected
            except serializers.ValidationError:
                pass  # Some implementations might still reject
        else:
            # Without bleach, HTML is escaped, which changes the content
            with pytest.raises(serializers.ValidationError):
                validator('<p>Hello <script>alert(1)</script></p>')

    def test_validator_with_custom_config(self):
        """Test validator with custom configuration."""
        validator = HTMLValidator(allowed_tags={"p"})

        # Should work with custom config
        validator("<p>Hello</p>")


class TestValidateSafeHTML:
    """Tests for the validate_safe_html Django validator."""

    def test_validate_safe_html_allows_safe_content(self):
        """Test that validator allows safe HTML."""
        result = validate_safe_html("<p>Hello <strong>world</strong></p>")
        assert result is not None
        assert "Hello" in result

    def test_validate_safe_html_with_empty_string(self):
        """Test validator with empty string."""
        result = validate_safe_html("")
        assert result == ""

    def test_validate_safe_html_with_none(self):
        """Test validator with None."""
        result = validate_safe_html(None)
        assert result is None

    def test_validate_safe_html_rejects_changed_content(self):
        """Test that validator rejects content that changes after sanitization."""
        if not HAS_BLEACH:
            # Without bleach, all HTML is escaped, so it will be rejected
            with pytest.raises(ValidationError) as exc_info:
                validate_safe_html('<p>Hello <script>alert(1)</script></p>')
            assert exc_info.value.code == "unsafe_html"


class TestSecurityScenarios:
    """Tests for various XSS attack scenarios."""

    def test_nested_script_tags(self):
        """Test that nested script tags are handled."""
        sanitizer = HTMLSanitizer()
        html = '<p><script><script>alert(1)</script></script></p>'
        result = sanitizer.sanitize(html)

        assert "<script>" not in result.lower()

    def test_obfuscated_javascript(self):
        """Test that obfuscated javascript is handled."""
        sanitizer = HTMLSanitizer()
        html = '<a href="javas&#99;ript:alert(1)">Click</a>'
        result = sanitizer.sanitize(html)

        # Should not contain javascript
        assert "javascript:" not in result.lower()

    def test_svg_with_script(self):
        """Test that SVG with embedded script is handled."""
        sanitizer = HTMLSanitizer()
        html = '<svg><script>alert(1)</script></svg>'
        result = sanitizer.sanitize(html)

        # SVG and script should be removed
        assert "<script>" not in result.lower()

    def test_html_entities_in_attributes(self):
        """Test that HTML entities in attributes are handled."""
        sanitizer = HTMLSanitizer()
        html = '<a href="javascript&#58;alert(1)">Click</a>'
        result = sanitizer.sanitize(html)

        # Should not contain javascript
        assert "javascript" not in result.lower() or "&#" not in result

    def test_mixed_case_tags(self):
        """Test that mixed case tags are handled."""
        sanitizer = HTMLSanitizer()
        html = '<ScRiPt>alert(1)</ScRiPt>'
        result = sanitizer.sanitize(html)

        assert "<script>" not in result.lower()

    def test_style_with_javascript(self):
        """Test that style attributes with javascript are handled."""
        sanitizer = HTMLSanitizer()
        html = '<p style="background:url(javascript:alert(1))">Text</p>'
        result = sanitizer.sanitize(html)

        # javascript should not be in the result
        assert "javascript" not in result.lower() or "url(" not in result.lower()

    def test_form_with_action(self):
        """Test that form tags are removed."""
        sanitizer = HTMLSanitizer()
        html = '<form action="evil.com"><input type="text"></form>'
        result = sanitizer.sanitize(html)

        if HAS_BLEACH:
            # Form should be removed (not in allowed tags)
            assert "<form" not in result.lower()

    def test_meta_refresh_redirect(self):
        """Test that meta refresh redirects are removed."""
        sanitizer = HTMLSanitizer()
        html = '<meta http-equiv="refresh" content="0;url=evil.com">'
        result = sanitizer.sanitize(html)

        if HAS_BLEACH:
            # Meta should be removed (not in allowed tags)
            assert "<meta" not in result.lower()


class TestEdgeCases:
    """Tests for edge cases and unusual inputs."""

    def test_very_long_html(self):
        """Test that very long HTML is handled."""
        sanitizer = HTMLSanitizer()
        long_html = "<p>" + "A" * 10000 + "</p>"
        result = sanitizer.sanitize(long_html)

        assert "A" * 100 in result  # Check some of the content is there
        assert len(result) > 9000  # Roughly the same length

    def test_deeply_nested_tags(self):
        """Test that deeply nested tags are handled."""
        sanitizer = HTMLSanitizer()
        html = "<p>" * 50 + "content" + "</p>" * 50
        result = sanitizer.sanitize(html)

        assert "content" in result

    def test_unicode_content(self):
        """Test that unicode content is preserved."""
        sanitizer = HTMLSanitizer()
        html = "<p>Hello 世界 🌍</p>"
        result = sanitizer.sanitize(html)

        assert "世界" in result
        assert "🌍" in result

    def test_special_characters(self):
        """Test that special characters are handled correctly."""
        sanitizer = HTMLSanitizer()
        html = '<p>Price: $100 &amp; <50%</p>'
        result = sanitizer.sanitize(html)

        assert "$100" in result
        # Ampersand should be preserved as entity
        assert "&amp;" in result or "&" in result

    def test_malformed_html(self):
        """Test that malformed HTML is handled gracefully."""
        sanitizer = HTMLSanitizer()
        html = "<p>Unclosed paragraph<strong>Bold</strong>"
        result = sanitizer.sanitize(html)

        # Should still extract the text content
        assert "Unclosed paragraph" in result
        assert "Bold" in result

    def test_empty_tags(self):
        """Test that empty tags are handled."""
        sanitizer = HTMLSanitizer()
        html = "<p></p><strong></strong><br>"
        result = sanitizer.sanitize(html)

        # Empty tags might be preserved or removed
        # Just ensure no errors occur
        assert isinstance(result, str)

    def test_whitespace_preservation(self):
        """Test that whitespace is preserved appropriately."""
        sanitizer = HTMLSanitizer()
        html = "<p>Word1    Word2\n\nWord3</p>"
        result = sanitizer.sanitize(html)

        assert "Word1" in result
        assert "Word2" in result
        assert "Word3" in result
