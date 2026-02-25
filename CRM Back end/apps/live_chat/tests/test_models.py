"""
Tests for live_chat models.
"""

import pytest
from django.utils import timezone

from apps.live_chat.models import (
    ChatAgent,
    ChatSession,
)
from tests.factories import (
    ChatAgentFactory,
    ChatDepartmentFactory,
    ChatMessageFactory,
    ChatSessionFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestChatDepartment:
    """Tests for ChatDepartment model."""

    def test_str_representation(self):
        department = ChatDepartmentFactory(name="Sales Team")
        assert str(department) == "Sales Team"

    def test_online_agents_count_empty(self):
        department = ChatDepartmentFactory()
        assert department.online_agents_count == 0

    def test_online_agents_count_with_agents(self):
        department = ChatDepartmentFactory()
        # Create offline agent
        agent1 = ChatAgentFactory(is_available=False, status="offline")
        agent1.departments.add(department)
        # Create online agent
        agent2 = ChatAgentFactory(is_available=True, status="online")
        agent2.departments.add(department)
        # Create online but inactive user agent
        inactive_user = UserFactory(is_active=False)
        agent3 = ChatAgentFactory(
            user=inactive_user, is_available=True, status="online"
        )
        agent3.departments.add(department)

        assert department.online_agents_count == 1

    def test_default_values(self):
        department = ChatDepartmentFactory()
        assert department.is_active is True
        assert department.auto_assign is True
        assert department.max_concurrent_chats == 5
        assert department.collect_email_offline is True


@pytest.mark.django_db
class TestChatAgent:
    """Tests for ChatAgent model."""

    def test_str_representation(self):
        user = UserFactory(first_name="John", last_name="Doe")
        agent = ChatAgentFactory(user=user, status="online")
        assert "John Doe" in str(agent)
        assert "Online" in str(agent)

    def test_can_accept_chat_when_available(self):
        agent = ChatAgentFactory(
            is_available=True,
            status="online",
            current_chat_count=2,
            max_concurrent_chats=5,
        )
        assert agent.can_accept_chat is True

    def test_cannot_accept_chat_when_offline(self):
        agent = ChatAgentFactory(
            is_available=False,
            status="offline",
            current_chat_count=0,
            max_concurrent_chats=5,
        )
        assert agent.can_accept_chat is False

    def test_cannot_accept_chat_when_busy(self):
        agent = ChatAgentFactory(
            is_available=True,
            status="busy",
            current_chat_count=0,
            max_concurrent_chats=5,
        )
        assert agent.can_accept_chat is False

    def test_cannot_accept_chat_when_at_capacity(self):
        agent = ChatAgentFactory(
            is_available=True,
            status="online",
            current_chat_count=5,
            max_concurrent_chats=5,
        )
        assert agent.can_accept_chat is False

    def test_go_online(self):
        agent = ChatAgentFactory(
            is_available=False,
            status="offline",
            last_seen=None,
        )
        agent.go_online()
        agent.refresh_from_db()

        assert agent.is_available is True
        assert agent.status == ChatAgent.Status.ONLINE
        assert agent.last_seen is not None

    def test_go_offline(self):
        agent = ChatAgentFactory(
            is_available=True,
            status="online",
        )
        agent.go_offline()
        agent.refresh_from_db()

        assert agent.is_available is False
        assert agent.status == ChatAgent.Status.OFFLINE


@pytest.mark.django_db
class TestChatSession:
    """Tests for ChatSession model."""

    def test_str_representation(self):
        session = ChatSessionFactory(
            session_id="test-123",
            visitor_name="Alice Smith",
        )
        assert "test-123" in str(session)
        assert "Alice Smith" in str(session)

    def test_str_representation_anonymous(self):
        session = ChatSessionFactory(
            session_id="anon-456",
            visitor_name="",
        )
        assert "anon-456" in str(session)
        assert "Anonymous" in str(session)

    def test_duration_active_session(self):
        session = ChatSessionFactory(ended_at=None)
        duration = session.duration
        assert duration is not None
        assert duration.total_seconds() >= 0

    def test_duration_closed_session(self):
        start = timezone.now()
        end = start + timezone.timedelta(minutes=30)
        session = ChatSessionFactory()
        session.started_at = start
        session.ended_at = end
        session.save()

        assert session.duration.total_seconds() == 30 * 60

    def test_message_count(self):
        session = ChatSessionFactory()
        assert session.message_count == 0

        ChatMessageFactory(session=session)
        ChatMessageFactory(session=session)
        ChatMessageFactory(session=session)

        assert session.message_count == 3

    def test_assign_to_first_agent(self):
        session = ChatSessionFactory(status="waiting", assigned_agent=None)
        agent = ChatAgentFactory(current_chat_count=0)

        session.assign_to(agent)
        session.refresh_from_db()
        agent.refresh_from_db()

        assert session.assigned_agent == agent
        assert session.status == ChatSession.Status.ACTIVE
        assert agent.current_chat_count == 1

    def test_assign_to_transfers_from_previous_agent(self):
        first_agent = ChatAgentFactory(current_chat_count=1)
        second_agent = ChatAgentFactory(current_chat_count=0)
        session = ChatSessionFactory(
            status="active",
            assigned_agent=first_agent,
        )

        session.assign_to(second_agent)
        session.refresh_from_db()
        first_agent.refresh_from_db()
        second_agent.refresh_from_db()

        assert session.assigned_agent == second_agent
        assert first_agent in session.previous_agents.all()
        assert first_agent.current_chat_count == 0
        assert second_agent.current_chat_count == 1

    def test_close_session(self):
        agent = ChatAgentFactory(current_chat_count=1, total_chats_handled=5)
        session = ChatSessionFactory(
            status="active",
            assigned_agent=agent,
            ended_at=None,
        )

        session.close(by_agent=True)
        session.refresh_from_db()
        agent.refresh_from_db()

        assert session.status == ChatSession.Status.CLOSED
        assert session.ended_at is not None
        assert agent.current_chat_count == 0
        assert agent.total_chats_handled == 6

    def test_close_session_no_agent(self):
        session = ChatSessionFactory(
            status="waiting",
            assigned_agent=None,
            ended_at=None,
        )

        session.close()
        session.refresh_from_db()

        assert session.status == ChatSession.Status.CLOSED
        assert session.ended_at is not None


@pytest.mark.django_db
class TestChatMessage:
    """Tests for ChatMessage model."""

    def test_str_representation(self):
        message = ChatMessageFactory(
            sender_type="visitor",
            content="Hello, I need help with my account",
        )
        assert "visitor" in str(message)
        assert "Hello" in str(message)

    def test_mark_as_read(self):
        message = ChatMessageFactory(is_read=False, read_at=None)

        message.mark_as_read()
        message.refresh_from_db()

        assert message.is_read is True
        assert message.read_at is not None

    def test_mark_as_read_idempotent(self):
        message = ChatMessageFactory(is_read=False, read_at=None)

        message.mark_as_read()
        first_read_at = message.read_at

        message.mark_as_read()  # Called again
        message.refresh_from_db()

        assert message.read_at == first_read_at
