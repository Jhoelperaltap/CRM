import django_filters

from apps.audit.models import EncryptedFieldAccessLog, LoginHistory, SettingsLog


class LoginHistoryFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    user = django_filters.UUIDFilter(field_name="user_id")
    date_from = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = LoginHistory
        fields = ["status", "user", "date_from", "date_to"]


class SettingsLogFilter(django_filters.FilterSet):
    setting_area = django_filters.CharFilter()
    user = django_filters.UUIDFilter(field_name="user_id")
    date_from = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = SettingsLog
        fields = ["setting_area", "user", "date_from", "date_to"]


class EncryptedFieldAccessLogFilter(django_filters.FilterSet):
    module = django_filters.CharFilter()
    access_type = django_filters.CharFilter()
    user = django_filters.UUIDFilter(field_name="user_id")
    date_from = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = EncryptedFieldAccessLog
        fields = ["module", "access_type", "user", "date_from", "date_to"]
