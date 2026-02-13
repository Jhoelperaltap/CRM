"""
Example usage of HTML sanitization utilities.

This file demonstrates practical examples of using the sanitizers.
Run with: python manage.py shell < apps/core/tests/example_sanitizer_usage.py
"""

from apps.core.sanitizers import (
    HTMLSanitizer,
    StrictHTMLSanitizer,
    sanitize_html,
    strip_html,
)

print("=" * 80)
print("HTML Sanitization Examples")
print("=" * 80)

# Example 1: Basic HTML sanitization
print("\n1. Basic HTML Sanitization")
print("-" * 40)
dangerous_html = '<p>Hello <script>alert("XSS")</script> world!</p>'
safe_html = sanitize_html(dangerous_html)
print(f"Input:  {dangerous_html}")
print(f"Output: {safe_html}")

# Example 2: Removing JavaScript in links
print("\n2. JavaScript URL Removal")
print("-" * 40)
dangerous_link = '<a href="javascript:alert(1)">Click me</a>'
safe_link = sanitize_html(dangerous_link)
print(f"Input:  {dangerous_link}")
print(f"Output: {safe_link}")

# Example 3: Event handler removal
print("\n3. Event Handler Removal")
print("-" * 40)
dangerous_event = '<p onclick="alert(1)">Click me</p>'
safe_event = sanitize_html(dangerous_event)
print(f"Input:  {dangerous_event}")
print(f"Output: {safe_event}")

# Example 4: Allowing safe links
print("\n4. Safe Links (Allowed)")
print("-" * 40)
safe_link_html = '<a href="https://example.com">Visit</a>'
result = sanitize_html(safe_link_html)
print(f"Input:  {safe_link_html}")
print(f"Output: {result}")

# Example 5: Rich text with formatting
print("\n5. Rich Text Formatting")
print("-" * 40)
rich_text = """
<h3>Article Title</h3>
<p>This is a <strong>bold</strong> and <em>italic</em> text.</p>
<ul>
    <li>Item 1</li>
    <li>Item 2</li>
</ul>
"""
sanitized_rich = sanitize_html(rich_text)
print(f"Input:  {rich_text}")
print(f"Output: {sanitized_rich}")

# Example 6: Strict sanitizer (minimal formatting)
print("\n6. Strict Sanitizer (Minimal Formatting)")
print("-" * 40)
sanitizer = StrictHTMLSanitizer()
html_with_links = '<p>Text with <a href="#">link</a> and <strong>bold</strong></p>'
strict_result = sanitizer.sanitize(html_with_links)
print(f"Input:  {html_with_links}")
print(f"Output: {strict_result}")
print("Note: Links are removed, only basic formatting allowed")

# Example 7: Plain text (strip all HTML)
print("\n7. Plain Text (Strip All HTML)")
print("-" * 40)
html_content = '<p>Hello <strong>world</strong>! <a href="#">Link</a></p>'
plain_text = strip_html(html_content)
print(f"Input:  {html_content}")
print(f"Output: {plain_text}")

# Example 8: Custom allowed tags
print("\n8. Custom Allowed Tags")
print("-" * 40)
custom_html = "<p>Paragraph</p><blockquote>Quote</blockquote><code>code</code>"
custom_result = sanitize_html(
    custom_html,
    allowed_tags={"p", "code"},  # Only allow p and code tags
)
print(f"Input:  {custom_html}")
print(f"Output: {custom_result}")
print("Note: blockquote removed, only p and code allowed")

# Example 9: Nested malicious tags
print("\n9. Nested Malicious Tags")
print("-" * 40)
nested_danger = "<p><script><script>alert(1)</script></script></p>"
safe_nested = sanitize_html(nested_danger)
print(f"Input:  {nested_danger}")
print(f"Output: {safe_nested}")

# Example 10: Unicode content preservation
print("\n10. Unicode Content Preservation")
print("-" * 40)
unicode_html = "<p>Hello 世界 🌍! Привет мир!</p>"
unicode_result = sanitize_html(unicode_html)
print(f"Input:  {unicode_html}")
print(f"Output: {unicode_result}")

# Example 11: Handling None values
print("\n11. Handling Optional Values")
print("-" * 40)
sanitizer = HTMLSanitizer()
print(f"sanitize_or_none(None): {sanitizer.sanitize_or_none(None)}")
print(f"sanitize_or_none('<p>Text</p>'): {sanitizer.sanitize_or_none('<p>Text</p>')}")

# Example 12: Complex real-world example
print("\n12. Real-World Comment Example")
print("-" * 40)
user_comment = """
<p>Great article! I especially liked the part about <strong>security</strong>.</p>
<p>Check out my website at <a href="https://example.com">example.com</a></p>
<p>Also try this: <script>stealCookies()</script></p>
<p onclick="alert('XSS')">This looks innocent</p>
"""
safe_comment = sanitize_html(user_comment)
print(f"Input:  {user_comment}")
print(f"Output: {safe_comment}")
print("Note: Script and onclick removed, safe formatting and links preserved")

print("\n" + "=" * 80)
print("Examples complete!")
print("=" * 80)
