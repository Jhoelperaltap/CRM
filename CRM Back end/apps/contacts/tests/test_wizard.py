"""Tests for the wizard-create endpoint (Light Mode)."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.contacts.models import Contact


@pytest.mark.django_db
class TestWizardCreateEndpoint:
    """Tests for the wizard-create endpoint."""

    def test_wizard_create_contact_only(self, authenticated_client, preparer_user):
        """Test creating a contact without relationship or corporations."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "phone": "555-1234",
            },
            "relationship": None,
            "corporations": [],
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["first_name"] == "John"
        assert response.data["last_name"] == "Doe"
        assert response.data["email"] == "john.doe@example.com"

        # Verify contact was created in DB
        contact = Contact.objects.get(id=response.data["id"])
        assert contact.first_name == "John"
        assert contact.created_by == preparer_user

    def test_wizard_create_with_corporation(self, authenticated_client, preparer_user):
        """Test creating a contact with a corporation."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane@example.com",
            },
            "relationship": None,
            "corporations": [
                {
                    "name": "ABC Corp",
                    "ein": "12-3456789",
                    "entity_type": "llc",
                    "industry": "Technology",
                }
            ],
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["first_name"] == "Jane"

        # Verify corporation was created and linked
        contact = Contact.objects.get(id=response.data["id"])
        assert contact.corporations.count() == 1
        corp = contact.corporations.first()
        assert corp.name == "ABC Corp"
        assert corp.ein == "12-3456789"
        assert contact.primary_corporation == corp

    def test_wizard_create_with_multiple_corporations(
        self, authenticated_client, preparer_user
    ):
        """Test creating a contact with multiple corporations."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "Bob",
                "last_name": "Wilson",
            },
            "relationship": None,
            "corporations": [
                {"name": "First Corp", "entity_type": "llc"},
                {"name": "Second Corp", "entity_type": "s_corp"},
                {"name": "Third Corp", "entity_type": "c_corp"},
            ],
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        contact = Contact.objects.get(id=response.data["id"])
        assert contact.corporations.count() == 3

        # First corporation should be primary
        assert contact.primary_corporation.name == "First Corp"

    def test_wizard_create_with_relationship(self, authenticated_client, preparer_user):
        """Test creating a contact with a relationship (second owner)."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "Mike",
                "last_name": "Johnson",
                "email": "mike@example.com",
            },
            "relationship": {
                "first_name": "Sarah",
                "last_name": "Johnson",
                "email": "sarah@example.com",
                "relationship_type": "Wife",
            },
            "corporations": [
                {"name": "Johnson LLC", "entity_type": "llc"},
            ],
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        # Verify main contact
        main_contact = Contact.objects.get(id=response.data["id"])
        assert main_contact.first_name == "Mike"

        # Verify relationship contact was created
        rel_contact = Contact.objects.get(first_name="Sarah", last_name="Johnson")
        assert rel_contact.reports_to == main_contact
        assert rel_contact.custom_fields.get("relationship_type") == "Wife"

        # Verify both contacts are linked to the same corporation
        assert main_contact.corporations.count() == 1
        assert rel_contact.corporations.count() == 1
        assert main_contact.corporations.first() == rel_contact.corporations.first()

    def test_wizard_create_with_custom_fields(
        self, authenticated_client, preparer_user
    ):
        """Test that custom fields are stored correctly."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "Test",
                "last_name": "User",
                "middle_name": "Middle",
                "priority": "high",
                "registered_agent": True,
                "sensitive_info": "Confidential data",
            },
            "corporations": [],
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        contact = Contact.objects.get(id=response.data["id"])
        assert contact.custom_fields.get("middle_name") == "Middle"
        assert contact.custom_fields.get("priority") == "high"
        assert contact.custom_fields.get("registered_agent") is True
        assert contact.custom_fields.get("sensitive_info") == "Confidential data"

    def test_wizard_create_validation_error(self, authenticated_client):
        """Test validation errors are returned properly."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                # Missing required first_name and last_name
                "email": "test@example.com",
            },
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "first_name" in response.data["contact"]
        assert "last_name" in response.data["contact"]

    def test_wizard_create_ssn_validation(self, authenticated_client):
        """Test SSN validation (must be exactly 4 digits)."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "Test",
                "last_name": "User",
                "ssn_last_four": "123",  # Invalid - only 3 digits
            },
        }

        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "ssn_last_four" in response.data["contact"]

    def test_wizard_create_unauthenticated(self, api_client):
        """Test that unauthenticated requests are rejected."""
        url = reverse("contacts-wizard-create")
        payload = {
            "contact": {
                "first_name": "Test",
                "last_name": "User",
            },
        }

        response = api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
