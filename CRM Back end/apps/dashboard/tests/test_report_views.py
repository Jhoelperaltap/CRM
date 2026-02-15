import pytest
from rest_framework import status

from tests.factories import ContactFactory, TaxCaseFactory

REVENUE_URL = "/api/v1/reports/analytics/revenue/"
CASES_URL = "/api/v1/reports/analytics/cases/"
PREPARERS_URL = "/api/v1/reports/analytics/preparers/"
CONTACTS_URL = "/api/v1/reports/analytics/contacts/"


@pytest.mark.django_db
class TestRevenueReport:
    def test_get_revenue_report(self, authenticated_client):
        TaxCaseFactory.create_batch(3)
        resp = authenticated_client.get(REVENUE_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert "rows" in resp.data
        assert "totals" in resp.data

    def test_group_by_quarterly(self, authenticated_client):
        TaxCaseFactory()
        resp = authenticated_client.get(f"{REVENUE_URL}?group_by=quarterly")
        assert resp.status_code == status.HTTP_200_OK

    def test_csv_export(self, authenticated_client):
        TaxCaseFactory()
        resp = authenticated_client.get(f"{REVENUE_URL}?export=csv")
        assert resp.status_code == status.HTTP_200_OK
        assert resp["Content-Type"] == "text/csv"

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(REVENUE_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCaseReport:
    def test_get_case_report(self, authenticated_client):
        TaxCaseFactory.create_batch(3)
        resp = authenticated_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert "total" in resp.data
        assert "completion_rate" in resp.data
        assert "aging_buckets" in resp.data
        assert "status_breakdown" in resp.data

    def test_csv_export(self, authenticated_client):
        TaxCaseFactory()
        resp = authenticated_client.get(f"{CASES_URL}?export=csv")
        assert resp.status_code == status.HTTP_200_OK
        assert resp["Content-Type"] == "text/csv"


@pytest.mark.django_db
class TestPreparerReport:
    def test_get_preparer_report(self, authenticated_client):
        TaxCaseFactory.create_batch(2)
        resp = authenticated_client.get(PREPARERS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)

    def test_csv_export(self, authenticated_client):
        TaxCaseFactory()
        resp = authenticated_client.get(f"{PREPARERS_URL}?export=csv")
        assert resp.status_code == status.HTTP_200_OK
        assert resp["Content-Type"] == "text/csv"


@pytest.mark.django_db
class TestContactReport:
    def test_get_contact_report(self, authenticated_client):
        ContactFactory.create_batch(3)
        resp = authenticated_client.get(CONTACTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert "total" in resp.data
        assert "conversion_rate" in resp.data
        assert "by_month" in resp.data

    def test_csv_export(self, authenticated_client):
        ContactFactory()
        resp = authenticated_client.get(f"{CONTACTS_URL}?export=csv")
        assert resp.status_code == status.HTTP_200_OK
        assert resp["Content-Type"] == "text/csv"
