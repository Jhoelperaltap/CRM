"""
Filters for Webforms.
"""
from django_filters import rest_framework as filters

from .models import Webform


class WebformFilter(filters.FilterSet):
    """Filter for webforms."""
    is_active = filters.BooleanFilter()
    primary_module = filters.CharFilter()
    assigned_to = filters.UUIDFilter()

    class Meta:
        model = Webform
        fields = ["is_active", "primary_module", "assigned_to"]
