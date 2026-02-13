from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.chatbot.views import (
    ChatbotAppointmentSlotViewSet,
    ChatbotConfigurationView,
    ChatbotConversationViewSet,
    ChatbotKnowledgeViewSet,
    ChatbotStatsView,
)

app_name = "chatbot"

router = DefaultRouter()
router.register("knowledge", ChatbotKnowledgeViewSet, basename="knowledge")
router.register("slots", ChatbotAppointmentSlotViewSet, basename="slots")
router.register("conversations", ChatbotConversationViewSet, basename="conversations")

urlpatterns = [
    path("config/", ChatbotConfigurationView.as_view(), name="config"),
    path("stats/", ChatbotStatsView.as_view(), name="stats"),
    path("", include(router.urls)),
]
