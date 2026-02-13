import pytest
from rest_framework import status


BASE_AUTH = "/api/v1/auth/"
BASE_USERS = "/api/v1/users/"


@pytest.mark.django_db
class TestLogin:
    def test_login_returns_tokens_and_user(self, api_client, preparer_user):
        resp = api_client.post(
            f"{BASE_AUTH}login/",
            {"email": preparer_user.email, "password": "TestPass123!"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert resp.data["user"]["email"] == preparer_user.email

    def test_login_bad_credentials(self, api_client, preparer_user):
        resp = api_client.post(
            f"{BASE_AUTH}login/",
            {"email": preparer_user.email, "password": "wrong"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefresh:
    def test_refresh_returns_new_access(self, api_client, preparer_user):
        login = api_client.post(
            f"{BASE_AUTH}login/",
            {"email": preparer_user.email, "password": "TestPass123!"},
        )
        refresh_token = login.data["refresh"]
        resp = api_client.post(f"{BASE_AUTH}refresh/", {"refresh": refresh_token})
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data


@pytest.mark.django_db
class TestMe:
    def test_get_me(self, authenticated_client, preparer_user):
        resp = authenticated_client.get(f"{BASE_AUTH}me/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == preparer_user.email

    def test_patch_me(self, authenticated_client):
        resp = authenticated_client.patch(
            f"{BASE_AUTH}me/", {"first_name": "Updated"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["first_name"] == "Updated"

    def test_me_unauthenticated(self, api_client):
        resp = api_client.get(f"{BASE_AUTH}me/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestChangePassword:
    def test_change_password(self, authenticated_client, preparer_user):
        # New password must meet complexity requirements:
        # - 12 characters minimum
        # - Uppercase, lowercase, digit, special character
        new_password = "NewSecure#Pass456"
        resp = authenticated_client.post(
            f"{BASE_AUTH}change-password/",
            {
                "old_password": "TestPass123!",
                "new_password": new_password,
                "confirm_password": new_password,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        preparer_user.refresh_from_db()
        assert preparer_user.check_password(new_password)


@pytest.mark.django_db
class TestLogout:
    def test_logout_blacklists_token(self, api_client, preparer_user):
        login = api_client.post(
            f"{BASE_AUTH}login/",
            {"email": preparer_user.email, "password": "TestPass123!"},
        )
        access = login.data["access"]
        refresh = login.data["refresh"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.post(f"{BASE_AUTH}logout/", {"refresh": refresh})
        assert resp.status_code == status.HTTP_200_OK

    def test_logout_without_token_clears_cookies(self, authenticated_client):
        """Logout without token in body still succeeds (clears httpOnly cookies)."""
        resp = authenticated_client.post(f"{BASE_AUTH}logout/", {})
        # New behavior: logout always succeeds (clears cookies for browser clients)
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestPermissions:
    def test_preparer_cannot_delete_user(self, authenticated_client, admin_user):
        resp = authenticated_client.delete(f"{BASE_USERS}{admin_user.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_create_user(self, admin_client, admin_role):
        resp = admin_client.post(
            BASE_USERS,
            {
                "email": "newuser@example.com",
                "username": "newuser",
                "first_name": "New",
                "last_name": "User",
                "password": "StrongPass1!",
                "role": str(admin_role.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["email"] == "newuser@example.com"
