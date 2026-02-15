import pytest
from rest_framework import status

from tests.factories import ContactFactory, TaxCaseFactory

BASE_DASHBOARD = "/api/v1/dashboard/"
BASE_PREFS = "/api/v1/preferences/"


@pytest.mark.django_db
class TestDashboardData:
    def test_get_dashboard(self, authenticated_client):
        # Seed some data so aggregation functions have something to work with
        contact = ContactFactory()
        TaxCaseFactory(contact=contact)

        resp = authenticated_client.get(BASE_DASHBOARD)
        assert resp.status_code == status.HTTP_200_OK
        assert "stats" in resp.data
        assert "cases_by_status" in resp.data
        assert "revenue_pipeline" in resp.data
        assert "appointments_today" in resp.data
        assert "missing_docs" in resp.data
        assert "tasks_by_user" in resp.data
        assert "upcoming_deadlines" in resp.data

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(BASE_DASHBOARD)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestDashboardConfig:
    def test_get_config_default(self, authenticated_client):
        resp = authenticated_client.get(f"{BASE_DASHBOARD}config/")
        assert resp.status_code == status.HTTP_200_OK
        assert "widgets" in resp.data


@pytest.mark.django_db
class TestUserPreferences:
    def test_get_preferences(self, authenticated_client):
        resp = authenticated_client.get(BASE_PREFS)
        assert resp.status_code == status.HTTP_200_OK
        assert "theme" in resp.data

    def test_update_preferences(self, authenticated_client):
        resp = authenticated_client.put(BASE_PREFS, {"theme": "dark"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["theme"] == "dark"

    def test_get_after_update(self, authenticated_client):
        authenticated_client.put(BASE_PREFS, {"theme": "dark"}, format="json")
        resp = authenticated_client.get(BASE_PREFS)
        assert resp.data["theme"] == "dark"
