"""
Tests for chatbot models.
"""

from datetime import time

import pytest

from apps.chatbot.models import (
    ChatbotAppointmentSlot,
    ChatbotConfiguration,
    ChatbotConversation,
    ChatbotKnowledgeEntry,
    ChatbotMessage,
)
from tests.factories import (
    ChatbotAppointmentSlotFactory,
    ChatbotConfigurationFactory,
    ChatbotConversationFactory,
    ChatbotKnowledgeEntryFactory,
    ChatbotMessageFactory,
    ContactFactory,
)


@pytest.mark.django_db
class TestChatbotConfiguration:
    """Tests for ChatbotConfiguration model."""

    def test_str_representation(self):
        config = ChatbotConfigurationFactory(ai_provider="openai")
        assert "openai" in str(config)

    def test_load_creates_singleton(self):
        config = ChatbotConfiguration.load()
        assert config is not None
        assert config.pk == ChatbotConfiguration.SINGLETON_ID

    def test_load_returns_existing(self):
        config1 = ChatbotConfiguration.load()
        config1.company_name = "Updated Company"
        config1.save()

        config2 = ChatbotConfiguration.load()
        assert config1.pk == config2.pk
        assert config2.company_name == "Updated Company"

    def test_get_full_system_prompt(self):
        config = ChatbotConfigurationFactory(
            company_name="Test Corp",
            system_prompt="Be helpful.",
        )
        prompt = config.get_full_system_prompt()

        assert "Test Corp" in prompt
        assert "Be helpful." in prompt
        assert "CURRENT DATE:" in prompt

    def test_get_full_system_prompt_includes_knowledge(self):
        config = ChatbotConfigurationFactory()
        ChatbotKnowledgeEntryFactory(
            configuration=config,
            title="Tax Services",
            content="We offer individual and corporate tax services.",
            is_active=True,
        )

        prompt = config.get_full_system_prompt()
        assert "Tax Services" in prompt
        assert "individual and corporate tax services" in prompt

    def test_default_values(self):
        config = ChatbotConfigurationFactory()
        assert config.is_active is True
        assert config.allow_appointments is True
        assert config.handoff_enabled is True
        assert config.temperature == 0.7


@pytest.mark.django_db
class TestChatbotKnowledgeEntry:
    """Tests for ChatbotKnowledgeEntry model."""

    def test_str_representation(self):
        entry = ChatbotKnowledgeEntryFactory(title="How to file taxes")
        assert str(entry) == "How to file taxes"

    def test_entry_types(self):
        assert ChatbotKnowledgeEntry.EntryType.FAQ == "faq"
        assert ChatbotKnowledgeEntry.EntryType.SERVICE == "service"
        assert ChatbotKnowledgeEntry.EntryType.POLICY == "policy"

    def test_ordering_by_priority(self):
        config = ChatbotConfigurationFactory()
        ChatbotKnowledgeEntryFactory(configuration=config, title="Low", priority=0)
        ChatbotKnowledgeEntryFactory(configuration=config, title="High", priority=10)

        entries = ChatbotKnowledgeEntry.objects.filter(configuration=config)
        assert entries[0].title == "High"


@pytest.mark.django_db
class TestChatbotConversation:
    """Tests for ChatbotConversation model."""

    def test_str_representation(self):
        contact = ContactFactory(first_name="John", last_name="Doe")
        conversation = ChatbotConversationFactory(contact=contact)
        assert str(conversation.contact) in str(conversation) or "Conversation" in str(
            conversation
        )

    def test_statuses(self):
        assert ChatbotConversation.Status.ACTIVE == "active"
        assert ChatbotConversation.Status.HANDED_OFF == "handed_off"
        assert ChatbotConversation.Status.CLOSED == "closed"

    def test_default_status(self):
        conversation = ChatbotConversationFactory()
        assert conversation.status == ChatbotConversation.Status.ACTIVE

    def test_fallback_count_tracking(self):
        conversation = ChatbotConversationFactory(fallback_count=0)
        conversation.fallback_count += 1
        conversation.save()

        conversation.refresh_from_db()
        assert conversation.fallback_count == 1


@pytest.mark.django_db
class TestChatbotMessage:
    """Tests for ChatbotMessage model."""

    def test_str_representation(self):
        message = ChatbotMessageFactory(role="user", content="Hello, I need help")
        assert "user" in str(message)
        assert "Hello" in str(message)

    def test_roles(self):
        assert ChatbotMessage.Role.USER == "user"
        assert ChatbotMessage.Role.ASSISTANT == "assistant"
        assert ChatbotMessage.Role.SYSTEM == "system"

    def test_message_types(self):
        assert ChatbotMessage.MessageType.TEXT == "text"
        assert ChatbotMessage.MessageType.APPOINTMENT_REQUEST == "appointment_request"
        assert ChatbotMessage.MessageType.HANDOFF_REQUEST == "handoff_request"

    def test_ordering_by_created_at(self):
        conversation = ChatbotConversationFactory()
        msg1 = ChatbotMessageFactory(conversation=conversation, content="First")
        msg2 = ChatbotMessageFactory(conversation=conversation, content="Second")

        messages = ChatbotMessage.objects.filter(conversation=conversation)
        assert messages[0].pk == msg1.pk
        assert messages[1].pk == msg2.pk


@pytest.mark.django_db
class TestChatbotAppointmentSlot:
    """Tests for ChatbotAppointmentSlot model."""

    def test_str_representation(self):
        slot = ChatbotAppointmentSlotFactory(
            day_of_week=0,
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        assert "Monday" in str(slot)
        assert "09:00" in str(slot) or "9:00" in str(slot)

    def test_days_of_week(self):
        assert ChatbotAppointmentSlot.DayOfWeek.MONDAY == 0
        assert ChatbotAppointmentSlot.DayOfWeek.FRIDAY == 4
        assert ChatbotAppointmentSlot.DayOfWeek.SUNDAY == 6

    def test_default_values(self):
        slot = ChatbotAppointmentSlotFactory()
        assert slot.slot_duration_minutes == 30
        assert slot.max_appointments == 1
        assert slot.is_active is True
