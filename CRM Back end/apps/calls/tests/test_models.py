"""
Tests for calls models.
"""

import pytest

from apps.calls.models import (
    Call,
    CallQueue,
    CallScript,
    CallSettings,
    Voicemail,
)
from tests.factories import (
    CallFactory,
    CallQueueFactory,
    CallQueueMemberFactory,
    CallScriptFactory,
    PhoneLineFactory,
    TelephonyProviderFactory,
    UserFactory,
    VoicemailFactory,
)


@pytest.mark.django_db
class TestTelephonyProvider:
    """Tests for TelephonyProvider model."""

    def test_str_representation(self):
        provider = TelephonyProviderFactory(name="Main Twilio", provider_type="twilio")
        assert "Main Twilio" in str(provider)
        assert "Twilio" in str(provider)

    def test_set_default_clears_other_defaults(self):
        provider1 = TelephonyProviderFactory(is_default=True)
        provider2 = TelephonyProviderFactory(is_default=False)

        provider2.is_default = True
        provider2.save()

        provider1.refresh_from_db()
        assert provider1.is_default is False
        assert provider2.is_default is True

    def test_default_values(self):
        provider = TelephonyProviderFactory()
        assert provider.is_active is True
        assert provider.recording_enabled is True


@pytest.mark.django_db
class TestPhoneLine:
    """Tests for PhoneLine model."""

    def test_str_representation_with_friendly_name(self):
        line = PhoneLineFactory(friendly_name="Main Office", phone_number="+15551234567")
        assert str(line) == "Main Office"

    def test_str_representation_without_friendly_name(self):
        line = PhoneLineFactory(friendly_name="", phone_number="+15551234567")
        assert str(line) == "+15551234567"

    def test_default_values(self):
        line = PhoneLineFactory()
        assert line.is_active is True
        assert line.voicemail_enabled is True
        assert line.ring_timeout == 30


@pytest.mark.django_db
class TestCall:
    """Tests for Call model."""

    def test_str_representation_outbound(self):
        call = CallFactory(
            direction="outbound",
            from_number="+15551111111",
            to_number="+15552222222",
        )
        assert "Outbound" in str(call)
        assert "+15551111111" in str(call)
        assert "+15552222222" in str(call)

    def test_str_representation_inbound(self):
        call = CallFactory(
            direction="inbound",
            from_number="+15551111111",
            to_number="+15552222222",
        )
        assert "Inbound" in str(call)

    def test_call_statuses(self):
        assert Call.Status.INITIATED == "initiated"
        assert Call.Status.COMPLETED == "completed"
        assert Call.Status.NO_ANSWER == "no_answer"
        assert Call.Status.VOICEMAIL == "voicemail"

    def test_call_types(self):
        assert Call.CallType.REGULAR == "regular"
        assert Call.CallType.FOLLOW_UP == "follow_up"
        assert Call.CallType.SUPPORT == "support"


@pytest.mark.django_db
class TestCallQueue:
    """Tests for CallQueue model."""

    def test_str_representation(self):
        queue = CallQueueFactory(name="Sales Queue")
        assert str(queue) == "Sales Queue"

    def test_strategies(self):
        assert CallQueue.Strategy.RING_ALL == "ring_all"
        assert CallQueue.Strategy.ROUND_ROBIN == "round_robin"
        assert CallQueue.Strategy.LEAST_RECENT == "least_recent"

    def test_default_values(self):
        queue = CallQueueFactory()
        assert queue.is_active is True
        assert queue.strategy == "round_robin"
        assert queue.timeout == 30


@pytest.mark.django_db
class TestCallQueueMember:
    """Tests for CallQueueMember model."""

    def test_str_representation(self):
        user = UserFactory(first_name="John", last_name="Doe")
        queue = CallQueueFactory(name="Support")
        member = CallQueueMemberFactory(user=user, queue=queue)
        assert "John" in str(member) or "Support" in str(member)

    def test_unique_together(self):
        queue = CallQueueFactory()
        user = UserFactory()
        CallQueueMemberFactory(queue=queue, user=user)

        with pytest.raises(Exception):
            CallQueueMemberFactory(queue=queue, user=user)


@pytest.mark.django_db
class TestVoicemail:
    """Tests for Voicemail model."""

    def test_str_representation(self):
        voicemail = VoicemailFactory(caller_number="+15551234567")
        assert "+15551234567" in str(voicemail)

    def test_statuses(self):
        assert Voicemail.Status.NEW == "new"
        assert Voicemail.Status.LISTENED == "listened"
        assert Voicemail.Status.ARCHIVED == "archived"


@pytest.mark.django_db
class TestCallScript:
    """Tests for CallScript model."""

    def test_str_representation(self):
        script = CallScriptFactory(name="Sales Intro")
        assert str(script) == "Sales Intro"

    def test_script_types(self):
        assert CallScript.ScriptType.COLD_CALL == "cold_call"
        assert CallScript.ScriptType.FOLLOW_UP == "follow_up"
        assert CallScript.ScriptType.SALES == "sales"


@pytest.mark.django_db
class TestCallSettings:
    """Tests for CallSettings model."""

    def test_singleton_enforcement(self):
        CallSettings.objects.create()  # First instance

        with pytest.raises(ValueError):
            CallSettings.objects.create()

    def test_str_representation(self):
        settings = CallSettings.objects.create()
        assert str(settings) == "Call Settings"
