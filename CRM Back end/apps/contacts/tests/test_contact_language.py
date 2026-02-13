import pytest

from tests.factories import ContactFactory


@pytest.mark.django_db
class TestContactPreferredLanguage:
    """Tests for the preferred_language field on contacts."""

    URL = "/api/v1/contacts/"

    def test_create_contact_with_language(self, admin_client):
        resp = admin_client.post(
            self.URL,
            {
                "first_name": "Maria",
                "last_name": "Garcia",
                "email": "maria@example.com",
                "preferred_language": "es",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["preferred_language"] == "es"

    def test_default_language_is_english(self, admin_client):
        resp = admin_client.post(
            self.URL,
            {
                "first_name": "John",
                "last_name": "Smith",
                "email": "john@example.com",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["preferred_language"] == "en"

    def test_language_in_detail(self, admin_client):
        contact = ContactFactory(preferred_language="fr")
        resp = admin_client.get(f"{self.URL}{contact.id}/")
        assert resp.status_code == 200
        assert resp.data["preferred_language"] == "fr"

    def test_language_in_list(self, admin_client):
        ContactFactory(preferred_language="es")
        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert any(c.get("preferred_language") == "es" for c in results)
