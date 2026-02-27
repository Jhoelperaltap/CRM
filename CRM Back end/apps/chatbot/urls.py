from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.chatbot.views import (
    ChatbotAppointmentSlotViewSet,
    ChatbotConfigurationView,
    ChatbotConversationViewSet,
    ChatbotKnowledgeViewSet,
    ChatbotStatsView,
    CRMChatHistoryView,
    CRMChatStartView,
    CRMChatView,
)

app_name = "chatbot"

router = DefaultRouter()
router.register("knowledge", ChatbotKnowledgeViewSet, basename="knowledge")
router.register("slots", ChatbotAppointmentSlotViewSet, basename="slots")
router.register("conversations", ChatbotConversationViewSet, basename="conversations")

urlpatterns = [
    path("config/", ChatbotConfigurationView.as_view(), name="config"),
    path("stats/", ChatbotStatsView.as_view(), name="stats"),
    # CRM Chat endpoints
    path("chat/", CRMChatView.as_view(), name="crm_chat"),
    path("chat/start/", CRMChatStartView.as_view(), name="crm_chat_start"),
    path("chat/history/", CRMChatHistoryView.as_view(), name="crm_chat_history"),
    path("", include(router.urls)),
]
