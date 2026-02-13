# HTML Sanitization Usage Guide

This guide demonstrates how to use the HTML sanitization utilities in `apps/core/sanitizers.py` to prevent XSS attacks while allowing safe HTML formatting.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Django REST Framework Integration](#django-rest-framework-integration)
- [Django Model Validation](#django-model-validation)
- [Advanced Configuration](#advanced-configuration)
- [Security Considerations](#security-considerations)

## Installation

The sanitizer uses the `bleach` library for robust HTML cleaning. Make sure it's installed:

```bash
pip install -r requirements/base.txt
```

If `bleach` is not available, the sanitizer falls back to basic HTML escaping using `html.escape()`.

## Basic Usage

### Sanitizing HTML Strings

```python
from apps.core.sanitizers import sanitize_html, strip_html, HTMLSanitizer

# Basic sanitization - allows safe tags like p, strong, em, a, etc.
safe_html = sanitize_html('<p>Hello <script>alert("XSS")</script> world!</p>')
# Result: '<p>Hello  world!</p>'

# Strip all HTML tags - convert to plain text
plain_text = strip_html('<p>Hello <strong>world</strong>!</p>')
# Result: 'Hello world!'

# Using the sanitizer class directly
sanitizer = HTMLSanitizer()
safe_html = sanitizer.sanitize('<p>Hello <b>world</b>!</p>')
# Result: '<p>Hello <b>world</b>!</p>'
```

### Pre-configured Sanitizers

```python
from apps.core.sanitizers import (
    HTMLSanitizer,          # Default - allows most formatting tags
    StrictHTMLSanitizer,    # Minimal - only p, br, b, i, u, strong, em
    PlainTextSanitizer,     # Strips all HTML
)

# Default sanitizer - allows links, lists, tables, etc.
default_sanitizer = HTMLSanitizer()
result = default_sanitizer.sanitize('<a href="https://example.com">Link</a>')
# Result: '<a href="https://example.com">Link</a>'

# Strict sanitizer - minimal formatting only
strict_sanitizer = StrictHTMLSanitizer()
result = strict_sanitizer.sanitize('<p>Text <a href="#">link</a></p>')
# Result: '<p>Text link</p>' (link tag removed)

# Plain text - all HTML stripped
plain_sanitizer = PlainTextSanitizer()
result = plain_sanitizer.sanitize('<p>Hello <strong>world</strong>!</p>')
# Result: 'Hello world!'
```

## Django REST Framework Integration

### Using SanitizedCharField

The easiest way to sanitize HTML input in DRF serializers:

```python
from rest_framework import serializers
from apps.core.sanitizers import SanitizedCharField

class CommentSerializer(serializers.ModelSerializer):
    # Automatically sanitizes HTML input
    content = SanitizedCharField(max_length=5000)

    # Strict mode - minimal formatting only
    description = SanitizedCharField(strict=True)

    # Plain text - strip all HTML
    title = SanitizedCharField(plain_text=True, max_length=200)

    # Custom configuration
    notes = SanitizedCharField(
        allowed_tags={'p', 'br', 'strong', 'em'},
        allowed_attributes={'p': ['class']}
    )

    class Meta:
        model = Comment
        fields = ['content', 'description', 'title', 'notes']
```

### Using HTMLValidator

Add validation to existing fields:

```python
from rest_framework import serializers
from apps.core.sanitizers import HTMLValidator

class ArticleSerializer(serializers.ModelSerializer):
    content = serializers.CharField(
        validators=[HTMLValidator()]
    )

    # Custom validator with specific allowed tags
    summary = serializers.CharField(
        validators=[
            HTMLValidator(
                allowed_tags={'p', 'br', 'strong', 'em'},
                allowed_attributes={}
            )
        ]
    )

    class Meta:
        model = Article
        fields = ['content', 'summary']
```

### Manual Sanitization in Serializers

For more control, sanitize in the `validate_*` methods:

```python
from rest_framework import serializers
from apps.core.sanitizers import sanitize_html, HTMLSanitizer

class PostSerializer(serializers.ModelSerializer):
    def validate_content(self, value):
        # Sanitize the content
        sanitized = sanitize_html(value)
        return sanitized

    def validate_description(self, value):
        # Use custom sanitizer
        sanitizer = HTMLSanitizer(
            allowed_tags={'p', 'br', 'strong'},
            allowed_attributes={}
        )
        return sanitizer.sanitize(value)

    class Meta:
        model = Post
        fields = ['content', 'description']
```

## Django Model Validation

### Using validate_safe_html

Add validation to Django model fields:

```python
from django.db import models
from apps.core.sanitizers import validate_safe_html

class Comment(models.Model):
    content = models.TextField(
        validators=[validate_safe_html]
    )

    author = models.ForeignKey('users.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Sanitizing Before Saving

Sanitize data in the model's `save()` method:

```python
from django.db import models
from apps.core.sanitizers import sanitize_html

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()

    def save(self, *args, **kwargs):
        # Sanitize content before saving
        self.content = sanitize_html(self.content)
        super().save(*args, **kwargs)
```

## Advanced Configuration

### Custom Allowed Tags and Attributes

```python
from apps.core.sanitizers import HTMLSanitizer

# Create sanitizer with custom configuration
sanitizer = HTMLSanitizer(
    allowed_tags={
        'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'
    },
    allowed_attributes={
        'a': ['href', 'title'],
        'p': ['class'],
    },
    allowed_protocols={
        'http', 'https', 'mailto'
    },
    strip=True  # Strip disallowed tags instead of escaping
)

html = '<p class="intro">Text with <a href="https://example.com">link</a></p>'
result = sanitizer.sanitize(html)
```

### Using with Different Tag Sets

```python
from apps.core.sanitizers import sanitize_html

# Minimal formatting
minimal_html = sanitize_html(
    html_input,
    allowed_tags={'p', 'br'},
    allowed_attributes={}
)

# Rich text with tables
rich_html = sanitize_html(
    html_input,
    allowed_tags={
        'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote'
    }
)
```

### Handling Optional Values

```python
from apps.core.sanitizers import HTMLSanitizer

sanitizer = HTMLSanitizer()

# sanitize() raises ValueError for None
try:
    result = sanitizer.sanitize(None)
except ValueError:
    print("Cannot sanitize None")

# sanitize_or_none() returns None for None input
result = sanitizer.sanitize_or_none(None)  # Returns: None
result = sanitizer.sanitize_or_none("<p>Text</p>")  # Returns: sanitized HTML
```

## Security Considerations

### What Gets Blocked

The sanitizer removes or escapes:

1. **Script tags**: `<script>`, `<noscript>`
2. **Event handlers**: `onclick`, `onerror`, `onload`, etc.
3. **JavaScript URLs**: `javascript:alert(1)`
4. **Data URIs**: `data:text/html,<script>...`
5. **Dangerous tags**: `<iframe>`, `<object>`, `<embed>`, `<form>`, `<meta>`
6. **Style with JavaScript**: `style="background:url(javascript:...)"`
7. **Obfuscated attacks**: HTML entity encoding, mixed case, etc.

### What Gets Allowed

By default, these safe tags are allowed:

- **Text formatting**: `p`, `br`, `b`, `i`, `u`, `strong`, `em`, `mark`, `small`, `del`, `ins`, `sub`, `sup`, `span`
- **Lists**: `ul`, `ol`, `li`
- **Links**: `a` (with `href`, `title`, `rel`, `target` attributes)
- **Headings**: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- **Tables**: `table`, `thead`, `tbody`, `tr`, `th`, `td`
- **Quotes**: `blockquote`, `cite`, `code`, `pre`

### Safe Link Protocols

Only these URL protocols are allowed in links:

- `http://`
- `https://`
- `mailto:`
- `tel:`

### Best Practices

1. **Always sanitize user input**: Never trust HTML from users
2. **Use appropriate sanitizer**: Choose based on your needs
   - Default: General purpose with formatting
   - Strict: Minimal formatting for sensitive areas
   - Plain text: When no HTML is needed
3. **Validate at the API layer**: Use `SanitizedCharField` in serializers
4. **Sanitize before storage**: Clean data before saving to database
5. **Test with real attacks**: Use the test suite as examples
6. **Keep bleach updated**: Security patches are important
7. **Log suspicious input**: Monitor for attack attempts

### Example: Complete Implementation

```python
# models.py
from django.db import models
from apps.core.models import TimeStampedModel

class BlogPost(TimeStampedModel):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey('users.User', on_delete=models.CASCADE)

# serializers.py
from rest_framework import serializers
from apps.core.sanitizers import SanitizedCharField
from .models import BlogPost

class BlogPostSerializer(serializers.ModelSerializer):
    # Plain text title (no HTML)
    title = SanitizedCharField(max_length=200, plain_text=True)

    # Rich content with HTML formatting
    content = SanitizedCharField()

    class Meta:
        model = BlogPost
        fields = ['id', 'title', 'content', 'author', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

# views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import BlogPost
from .serializers import BlogPostSerializer

class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
```

## Testing

Run the comprehensive test suite:

```bash
# Run all sanitizer tests
pytest apps/core/tests/test_sanitizers.py

# Run specific test class
pytest apps/core/tests/test_sanitizers.py::TestHTMLSanitizer

# Run with coverage
pytest apps/core/tests/test_sanitizers.py --cov=apps.core.sanitizers
```

## Common Use Cases

### 1. Comment System

```python
class CommentSerializer(serializers.ModelSerializer):
    # Allow basic formatting in comments
    content = SanitizedCharField(
        allowed_tags={'p', 'br', 'strong', 'em', 'a'},
        allowed_attributes={'a': ['href']}
    )
```

### 2. Rich Text Editor

```python
class ArticleSerializer(serializers.ModelSerializer):
    # Allow full formatting for articles
    content = SanitizedCharField()  # Uses default allowed tags
```

### 3. User Profile

```python
class UserProfileSerializer(serializers.ModelSerializer):
    # Plain text bio (no HTML)
    bio = SanitizedCharField(plain_text=True, max_length=500)
```

### 4. Email-like Content

```python
class MessageSerializer(serializers.ModelSerializer):
    # Strict formatting for messages
    body = SanitizedCharField(strict=True)
```

## Troubleshooting

### Issue: All HTML is being escaped

**Cause**: The `bleach` library is not installed.

**Solution**: Install bleach:
```bash
pip install bleach>=6.2
```

### Issue: Links are being removed

**Cause**: Using `StrictHTMLSanitizer` which doesn't allow links.

**Solution**: Use default `HTMLSanitizer` or add 'a' to allowed_tags:
```python
sanitizer = HTMLSanitizer(allowed_tags={'p', 'br', 'a'})
```

### Issue: Specific attribute is being stripped

**Cause**: Attribute not in allowed_attributes list.

**Solution**: Add the attribute to allowed_attributes:
```python
sanitizer = HTMLSanitizer(
    allowed_attributes={'a': ['href', 'title', 'target']}
)
```

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Bleach Documentation](https://bleach.readthedocs.io/)
- [Django Security](https://docs.djangoproject.com/en/5.1/topics/security/)
- [DRF Validation](https://www.django-rest-framework.org/api-guide/validators/)
