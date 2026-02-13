import pytest

from apps.emails.models import EmailTemplate
from tests.factories import (
    ContactFactory,
    EmailAccountFactory,
    EmailMessageFactory,
    EmailThreadFactory,
    TaxCaseFactory,
)


@pytest.mark.django_db
class TestEmailThreadModel:
    def test_str_representation(self):
        thread = EmailThreadFactory(subject="Tax filing question")
        assert str(thread) == "Tax filing question"

    def test_no_subject_str(self):
        thread = EmailThreadFactory(subject="")
        assert str(thread) == "(no subject)"

    def test_message_count_tracks(self):
        account = EmailAccountFactory()
        thread = EmailThreadFactory(message_count=0)
        EmailMessageFactory(account=account, thread=thread)
        EmailMessageFactory(account=account, thread=thread)
        assert thread.messages.count() == 2


@pytest.mark.django_db
class TestEmailMessageModel:
    def test_str_representation(self):
        msg = EmailMessageFactory(direction="inbound", subject="Hello")
        assert "inbound" in str(msg)
        assert "Hello" in str(msg)

    def test_contact_linking(self):
        contact = ContactFactory()
        msg = EmailMessageFactory(contact=contact)
        assert msg.contact == contact

    def test_case_linking(self):
        case = TaxCaseFactory()
        msg = EmailMessageFactory(case=case)
        assert msg.case == case


@pytest.mark.django_db
class TestEmailTemplateModel:
    def test_render_replaces_placeholders(self):
        template = EmailTemplate(
            name="Test",
            subject="Hello {{name}}",
            body_text="Dear {{name}}, case {{case_number}} is ready.",
        )
        subject, body = template.render({"name": "John", "case_number": "TC-001"})
        assert subject == "Hello John"
        assert "Dear John" in body
        assert "TC-001" in body

    def test_render_ignores_missing_vars(self):
        template = EmailTemplate(
            name="Test",
            subject="Hello {{name}}",
            body_text="Message with {{unknown}}",
        )
        subject, body = template.render({"name": "Jane"})
        assert subject == "Hello Jane"
        assert "{{unknown}}" in body
