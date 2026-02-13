import pytest
from rest_framework import status

from tests.factories import LoginIPWhitelistFactory


BASE = "/api/v1/settings/ip-whitelist/"


@pytest.mark.django_db
class TestIPWhitelistCRUD:
    def test_create(self, admin_client):
        resp = admin_client.post(
            BASE,
            {"ip_address": "192.168.1.100", "description": "Office IP"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["ip_address"] == "192.168.1.100"

    def test_list(self, admin_client):
        LoginIPWhitelistFactory.create_batch(3)
        resp = admin_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_delete(self, admin_client):
        entry = LoginIPWhitelistFactory()
        resp = admin_client.delete(f"{BASE}{entry.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestIPMatching:
    def test_exact_ip_match(self):
        entry = LoginIPWhitelistFactory(ip_address="10.0.0.1", cidr_prefix=None)
        assert entry.matches("10.0.0.1") is True
        assert entry.matches("10.0.0.2") is False

    def test_cidr_range_match(self):
        entry = LoginIPWhitelistFactory(ip_address="10.0.0.0", cidr_prefix=24)
        assert entry.matches("10.0.0.1") is True
        assert entry.matches("10.0.0.254") is True
        assert entry.matches("10.0.1.1") is False

    def test_invalid_ip_returns_false(self):
        entry = LoginIPWhitelistFactory(ip_address="10.0.0.0", cidr_prefix=24)
        assert entry.matches("not-an-ip") is False
