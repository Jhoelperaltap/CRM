"""
Tests for the new v2.0 dashboard analytics functions:

- get_cases_by_fiscal_year() -- groups cases by fiscal_year field
- get_avg_waiting_for_documents_days() -- average days in waiting_for_documents status
- Dashboard API includes the new widget keys
"""

import pytest
from django.utils import timezone
from rest_framework import status

from apps.dashboard.services import (
    get_avg_waiting_for_documents_days,
    get_cases_by_fiscal_year,
)
from tests.factories import ContactFactory, TaxCaseFactory


BASE_DASHBOARD = "/api/v1/dashboard/"


# ---------------------------------------------------------------------------
# get_cases_by_fiscal_year
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestCasesByFiscalYear:
    def test_cases_by_fiscal_year(self):
        """Create cases across multiple fiscal years and verify counts."""
        contact = ContactFactory()
        TaxCaseFactory(contact=contact, fiscal_year=2023)
        TaxCaseFactory(contact=contact, fiscal_year=2023)
        TaxCaseFactory(contact=contact, fiscal_year=2024)
        TaxCaseFactory(contact=contact, fiscal_year=2025)
        TaxCaseFactory(contact=contact, fiscal_year=2025)
        TaxCaseFactory(contact=contact, fiscal_year=2025)

        result = get_cases_by_fiscal_year()

        # Build a lookup by fiscal_year for easy assertions
        by_year = {row["fiscal_year"]: row["count"] for row in result}
        assert by_year[2023] == 2
        assert by_year[2024] == 1
        assert by_year[2025] == 3

    def test_cases_by_fiscal_year_empty(self):
        """With no cases in the database, should return an empty list."""
        result = get_cases_by_fiscal_year()
        assert result == []

    def test_cases_by_fiscal_year_single_year(self):
        """All cases in the same fiscal year returns a single entry."""
        contact = ContactFactory()
        TaxCaseFactory(contact=contact, fiscal_year=2025)
        TaxCaseFactory(contact=contact, fiscal_year=2025)

        result = get_cases_by_fiscal_year()
        assert len(result) == 1
        assert result[0]["fiscal_year"] == 2025
        assert result[0]["count"] == 2

    def test_cases_by_fiscal_year_ordering(self):
        """Results should be ordered by fiscal_year descending."""
        contact = ContactFactory()
        TaxCaseFactory(contact=contact, fiscal_year=2022)
        TaxCaseFactory(contact=contact, fiscal_year=2025)
        TaxCaseFactory(contact=contact, fiscal_year=2023)

        result = get_cases_by_fiscal_year()
        years = [row["fiscal_year"] for row in result]
        assert years == sorted(years, reverse=True)

    def test_cases_by_fiscal_year_return_structure(self):
        """Each entry should have 'fiscal_year' and 'count' keys."""
        contact = ContactFactory()
        TaxCaseFactory(contact=contact, fiscal_year=2025)

        result = get_cases_by_fiscal_year()
        assert len(result) == 1
        entry = result[0]
        assert "fiscal_year" in entry
        assert "count" in entry


# ---------------------------------------------------------------------------
# get_avg_waiting_for_documents_days
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestAvgWaitingForDocumentsDays:
    def test_avg_waiting_for_documents(self):
        """Cases with status 'waiting_for_documents' should yield a numeric avg_days."""
        contact = ContactFactory()
        # Create cases in waiting_for_documents status
        case1 = TaxCaseFactory(
            contact=contact, status="waiting_for_documents"
        )
        case2 = TaxCaseFactory(
            contact=contact, status="waiting_for_documents"
        )
        # Backdate updated_at to simulate waiting time
        from apps.cases.models import TaxCase

        past = timezone.now() - timezone.timedelta(days=10)
        TaxCase.objects.filter(pk=case1.pk).update(updated_at=past)

        past2 = timezone.now() - timezone.timedelta(days=20)
        TaxCase.objects.filter(pk=case2.pk).update(updated_at=past2)

        result = get_avg_waiting_for_documents_days()
        assert "avg_days" in result
        assert "currently_waiting" in result
        assert isinstance(result["avg_days"], (int, float))
        assert result["currently_waiting"] == 2
        # Average of ~10 and ~20 days should be roughly 15
        assert result["avg_days"] >= 10

    def test_avg_waiting_no_waiting_cases(self):
        """When no cases are waiting, returns avg_days=0, currently_waiting=0."""
        contact = ContactFactory()
        TaxCaseFactory(contact=contact, status="new")
        TaxCaseFactory(contact=contact, status="in_progress")

        result = get_avg_waiting_for_documents_days()
        assert result["avg_days"] == 0
        assert result["currently_waiting"] == 0

    def test_avg_waiting_empty_db(self):
        """With no cases at all, returns zeros."""
        result = get_avg_waiting_for_documents_days()
        assert result["avg_days"] == 0
        assert result["currently_waiting"] == 0

    def test_avg_waiting_return_structure(self):
        """Result should always contain avg_days and currently_waiting keys."""
        result = get_avg_waiting_for_documents_days()
        assert "avg_days" in result
        assert "currently_waiting" in result


# ---------------------------------------------------------------------------
# Dashboard API integration
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestDashboardAPIIncludesNewWidgets:
    def test_dashboard_api_includes_new_widgets(self, authenticated_client):
        """GET /api/v1/dashboard/ should include the new v2.0 widget keys."""
        # Seed minimal data so the dashboard can aggregate
        contact = ContactFactory()
        TaxCaseFactory(contact=contact)

        resp = authenticated_client.get(BASE_DASHBOARD)
        assert resp.status_code == status.HTTP_200_OK
        assert "cases_by_fiscal_year" in resp.data
        assert "avg_waiting_docs" in resp.data

    def test_dashboard_fiscal_year_data_shape(self, authenticated_client):
        """Verify the cases_by_fiscal_year payload is a list."""
        contact = ContactFactory()
        TaxCaseFactory(contact=contact, fiscal_year=2025)

        resp = authenticated_client.get(BASE_DASHBOARD)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data["cases_by_fiscal_year"], list)

    def test_dashboard_avg_waiting_data_shape(self, authenticated_client):
        """Verify the avg_waiting_docs payload is a dict with expected keys."""
        resp = authenticated_client.get(BASE_DASHBOARD)
        assert resp.status_code == status.HTTP_200_OK
        avg_data = resp.data["avg_waiting_docs"]
        assert isinstance(avg_data, dict)
        assert "avg_days" in avg_data
        assert "currently_waiting" in avg_data
