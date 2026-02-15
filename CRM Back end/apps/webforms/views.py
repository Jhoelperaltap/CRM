"""
Views for Webforms.
"""

from django.db.models import Count
from django.utils.html import escape
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import IsAdminRole

from .filters import WebformFilter
from .models import Webform
from .serializers import (
    WebformCreateUpdateSerializer,
    WebformDetailSerializer,
    WebformListSerializer,
)


class WebformViewSet(viewsets.ModelViewSet):
    """ViewSet for managing webforms."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    filterset_class = WebformFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "is_active"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Webform.objects.prefetch_related(
                "fields", "hidden_fields", "round_robin_users__user"
            )
            .select_related("assigned_to", "created_by")
            .annotate(field_count=Count("fields"))
        )

    def get_serializer_class(self):
        if self.action == "list":
            return WebformListSerializer
        if self.action == "retrieve":
            return WebformDetailSerializer
        return WebformCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"], url_path="generate-html")
    def generate_html(self, request, pk=None):
        """Generate embeddable HTML for the webform.

        SECURITY: All user-provided content is escaped to prevent XSS attacks.
        """
        webform = self.get_object()

        # Build form fields HTML
        # SECURITY: Escape all user-provided content to prevent XSS
        fields_html = []
        for field in webform.fields.filter(is_hidden=False).order_by("sort_order"):
            required = "required" if field.is_mandatory else ""
            field_name_escaped = escape(field.field_name)
            override_value_escaped = (
                escape(field.override_value) if field.override_value else ""
            )
            value_attr = (
                f'value="{override_value_escaped}"' if field.override_value else ""
            )
            label_text = escape(field.field_name.replace("_", " ").title())
            fields_html.append(
                f"""
    <div class="form-group">
        <label for="{field_name_escaped}">{label_text}{"*" if field.is_mandatory else ""}</label>
        <input type="text" id="{field_name_escaped}" name="{field_name_escaped}" {value_attr} {required}>
    </div>"""
            )

        # Build hidden fields HTML
        # SECURITY: Escape all user-provided content to prevent XSS
        hidden_html = []
        for field in webform.hidden_fields.all().order_by("sort_order"):
            field_name_escaped = escape(field.field_name)
            value_escaped = escape(field.override_value) if field.override_value else ""
            param_escaped = escape(field.url_parameter) if field.url_parameter else ""
            if field.url_parameter:
                hidden_html.append(
                    f"""
    <input type="hidden" name="{field_name_escaped}" id="hidden_{field_name_escaped}" value="{value_escaped}" data-url-param="{param_escaped}">"""
                )
            else:
                hidden_html.append(
                    f"""
    <input type="hidden" name="{field_name_escaped}" value="{value_escaped}">"""
                )

        # Captcha placeholder
        captcha_html = ""
        if webform.captcha_enabled:
            captcha_html = """
    <div class="captcha-container">
        <!-- Add your captcha implementation here -->
        <div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY"></div>
    </div>"""

        # Build complete HTML
        # SECURITY: Escape webform name in title
        webform_name_escaped = escape(webform.name)
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{webform_name_escaped}</title>
    <style>
        .webform-container {{
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }}
        .form-group {{
            margin-bottom: 15px;
        }}
        .form-group label {{
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }}
        .form-group input {{
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
        }}
        .form-group input:focus {{
            outline: none;
            border-color: #0066cc;
        }}
        .submit-btn {{
            background-color: #0066cc;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        }}
        .submit-btn:hover {{
            background-color: #0055aa;
        }}
    </style>
</head>
<body>
    <div class="webform-container">
        <form id="webform_{webform.id}" action="/api/v1/webforms/submit/{webform.id}/" method="POST">
            {"".join(fields_html)}
            {"".join(hidden_html)}
            {captcha_html}
            <button type="submit" class="submit-btn">Submit</button>
        </form>
    </div>
    <script>
        // Populate hidden fields from URL parameters
        document.addEventListener('DOMContentLoaded', function() {{
            const urlParams = new URLSearchParams(window.location.search);
            document.querySelectorAll('input[data-url-param]').forEach(function(input) {{
                const param = input.dataset.urlParam;
                if (urlParams.has(param)) {{
                    input.value = urlParams.get(param);
                }}
            }});
        }});
    </script>
</body>
</html>"""

        return Response({"html": html})
