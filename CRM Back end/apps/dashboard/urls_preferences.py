from django.urls import path

from apps.dashboard.views import UserPreferenceView

urlpatterns = [
    path("", UserPreferenceView.as_view(), name="user-preferences"),
]
