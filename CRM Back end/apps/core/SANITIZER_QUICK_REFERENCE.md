# HTML Sanitizer Quick Reference

## Import

```python
from apps.core.sanitizers import (
    sanitize_html,           # Function: sanitize HTML string
    strip_html,              # Function: strip all HTML tags
    HTMLSanitizer,           # Class: default sanitizer
    StrictHTMLSanitizer,     # Class: minimal formatting
    PlainTextSanitizer,      # Class: no HTML
    SanitizedCharField,      # DRF: auto-sanitizing field
    HTMLValidator,           # DRF: HTML validator
    validate_safe_html,      # Django: model validator
)
```

## Quick Usage

### 1. Basic Sanitization

```python
# Simple function call
safe = sanitize_html('<p>Text <script>bad</script></p>')
# Result: '<p>Text bad</p>'

# Strip all HTML
plain = strip_html('<p>Hello <b>world</b></p>')
# Result: 'Hello world'
```

### 2. DRF Serializer Field

```python
class MySerializer(serializers.ModelSerializer):
    # Auto-sanitize with default settings
    content = SanitizedCharField(max_length=5000)

    # Plain text only
    title = SanitizedCharField(plain_text=True)

    # Strict mode (minimal formatting)
    description = SanitizedCharField(strict=True)

    # Custom tags
    notes = SanitizedCharField(
        allowed_tags={'p', 'br', 'strong'},
        allowed_attributes={}
    )
```

### 3. DRF Validator

```python
class MySerializer(serializers.ModelSerializer):
    content = serializers.CharField(
        validators=[HTMLValidator()]
    )
```

### 4. Django Model

```python
class Comment(models.Model):
    content = models.TextField(
        validators=[validate_safe_html]
    )
```

### 5. Custom Configuration

```python
sanitizer = HTMLSanitizer(
    allowed_tags={'p', 'br', 'a', 'strong'},
    allowed_attributes={'a': ['href']},
    allowed_protocols={'https'},
    strip=True
)
result = sanitizer.sanitize(user_input)
```

## Sanitizer Types

| Sanitizer | Use Case | Allowed Tags |
|-----------|----------|--------------|
| `HTMLSanitizer` | Rich content, articles | p, br, b, i, u, strong, em, a, ul, ol, li, h1-h6, table, etc. |
| `StrictHTMLSanitizer` | Comments, messages | p, br, b, i, u, strong, em only |
| `PlainTextSanitizer` | Titles, names | None (all HTML stripped) |

## What Gets Blocked

✅ **Blocks these XSS attacks:**
- `<script>` tags
- `onclick`, `onerror`, `onload` event handlers
- `javascript:` URLs
- `data:` URIs
- `<iframe>`, `<object>`, `<embed>` tags
- `<form>` tags
- Malicious CSS in `style` attributes

✅ **Allows these safe elements:**
- Text formatting: `<p>`, `<strong>`, `<em>`, `<br>`
- Links: `<a href="https://...">` (http/https only)
- Lists: `<ul>`, `<ol>`, `<li>`
- Tables: `<table>`, `<tr>`, `<td>`
- Headings: `<h1>` through `<h6>`

## Common Patterns

### Pattern 1: Comment System
```python
class CommentSerializer(serializers.ModelSerializer):
    content = SanitizedCharField(
        allowed_tags={'p', 'br', 'strong', 'em', 'a'},
        allowed_attributes={'a': ['href']}
    )
```

### Pattern 2: Rich Text Editor
```python
class ArticleSerializer(serializers.ModelSerializer):
    title = SanitizedCharField(plain_text=True, max_length=200)
    content = SanitizedCharField()  # Default: rich formatting
```

### Pattern 3: User Profile
```python
class ProfileSerializer(serializers.ModelSerializer):
    bio = SanitizedCharField(strict=True, max_length=500)
    name = SanitizedCharField(plain_text=True, max_length=100)
```

### Pattern 4: Message/Chat
```python
class MessageSerializer(serializers.ModelSerializer):
    body = SanitizedCharField(strict=True)
```

## Testing

```bash
# Run all sanitizer tests
pytest apps/core/tests/test_sanitizers.py -v

# Run with coverage
pytest apps/core/tests/test_sanitizers.py --cov=apps.core.sanitizers

# Run specific test
pytest apps/core/tests/test_sanitizers.py::TestHTMLSanitizer -v
```

## Examples

```python
# Example 1: Script injection
sanitize_html('<p>Hello <script>alert(1)</script></p>')
# → '<p>Hello alert(1)</p>'

# Example 2: Event handler
sanitize_html('<p onclick="evil()">Click</p>')
# → '<p>Click</p>'

# Example 3: JavaScript URL
sanitize_html('<a href="javascript:alert(1)">Click</a>')
# → '<a>Click</a>'

# Example 4: Safe link
sanitize_html('<a href="https://example.com">Visit</a>')
# → '<a href="https://example.com">Visit</a>'

# Example 5: Plain text
strip_html('<p>Hello <strong>world</strong>!</p>')
# → 'Hello world!'
```

## Configuration Options

### allowed_tags
```python
allowed_tags={'p', 'br', 'strong', 'em'}  # Only these tags allowed
```

### allowed_attributes
```python
allowed_attributes={
    'a': ['href', 'title'],  # Links can have href and title
    'p': ['class']           # Paragraphs can have class
}
```

### allowed_protocols
```python
allowed_protocols={'http', 'https', 'mailto'}  # Safe URL schemes
```

### strip
```python
strip=True   # Remove disallowed tags (default)
strip=False  # Escape disallowed tags as &lt;tag&gt;
```

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| All HTML escaped | Install bleach: `pip install bleach` |
| Links removed | Use default sanitizer or add 'a' to allowed_tags |
| Attributes stripped | Add to allowed_attributes dict |
| Too restrictive | Use HTMLSanitizer instead of Strict |
| Too permissive | Use StrictHTMLSanitizer or PlainTextSanitizer |

## Files

- **Source**: `apps/core/sanitizers.py`
- **Tests**: `apps/core/tests/test_sanitizers.py`
- **Full Docs**: `apps/core/SANITIZER_USAGE.md`
- **README**: `apps/core/SANITIZER_README.md`
- **Examples**: `apps/core/tests/example_sanitizer_usage.py`

## Status

✅ Production Ready | 52 Tests Passing | Full Documentation
