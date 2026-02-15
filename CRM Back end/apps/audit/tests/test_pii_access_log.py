import pytest
from rest_framework import status

from tests.factories import EncryptedFieldAccessLogFactory

BASE = "/api/v1/settings/pii-access-log/"


@pytest.mark.django_db
class TestPIIAccessLogAccess:
    def test_admin_can_list(self, admin_client):
        EncryptedFieldAccessLogFactory.create_batch(3)
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(BASE)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPIIAccessLogFilter:
    def test_filter_by_module(self, admin_client):
        EncryptedFieldAccessLogFactory(module="contacts", field_name="ssn_last_four")
        EncryptedFieldAccessLogFactory(module="cases", field_name="ein")
        resp = admin_client.get(f"{BASE}?module=contacts")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["module"] == "contacts"

    def test_filter_by_access_type(self, admin_client):
        EncryptedFieldAccessLogFactory(access_type="view")
        EncryptedFieldAccessLogFactory(access_type="export")
        resp = admin_client.get(f"{BASE}?access_type=export")
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert result["access_type"] == "export"
