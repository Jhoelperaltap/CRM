"""
Licensing Service for Portal Client Limits.

This service validates client licensing limits for:
- Commercial buildings
- Floors per building
- Units per building
- Residential rental properties

A limit of 0 means unlimited.
"""

from django.utils.translation import gettext as _


class LicensingService:
    """Service to validate client licensing limits."""

    @staticmethod
    def get_client_config(contact):
        """Get client config or return None if not exists."""
        if hasattr(contact, "portal_config") and contact.portal_config:
            return contact.portal_config
        return None

    @staticmethod
    def can_create_building(contact) -> tuple[bool, str]:
        """
        Check if client can create a new building.

        Args:
            contact: The Contact instance

        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        config = LicensingService.get_client_config(contact)
        if not config or config.max_buildings == 0:
            return True, ""

        from apps.portal.models_commercial import CommercialBuilding

        current_count = CommercialBuilding.objects.filter(
            contact=contact, is_active=True
        ).count()

        if current_count >= config.max_buildings:
            return False, _(
                "Building limit reached ({limit}). "
                "Contact support to upgrade your plan."
            ).format(limit=config.max_buildings)

        return True, ""

    @staticmethod
    def can_create_floor(contact, building) -> tuple[bool, str]:
        """
        Check if client can create a new floor in a building.

        Args:
            contact: The Contact instance
            building: The CommercialBuilding instance

        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        config = LicensingService.get_client_config(contact)
        if not config or config.max_floors_per_building == 0:
            return True, ""

        current_count = building.floors.count()

        if current_count >= config.max_floors_per_building:
            return False, _(
                "Floor limit reached ({limit} per building). "
                "Contact support to upgrade your plan."
            ).format(limit=config.max_floors_per_building)

        return True, ""

    @staticmethod
    def can_create_unit(contact, building) -> tuple[bool, str]:
        """
        Check if client can create a new unit in a building.

        Args:
            contact: The Contact instance
            building: The CommercialBuilding instance

        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        config = LicensingService.get_client_config(contact)
        if not config or config.max_units_per_building == 0:
            return True, ""

        from apps.portal.models_commercial import CommercialUnit

        current_count = CommercialUnit.objects.filter(
            floor__building=building
        ).count()

        if current_count >= config.max_units_per_building:
            return False, _(
                "Unit limit reached ({limit} per building). "
                "Contact support to upgrade your plan."
            ).format(limit=config.max_units_per_building)

        return True, ""

    @staticmethod
    def can_create_rental_property(contact) -> tuple[bool, str]:
        """
        Check if client can create a new rental property.

        Args:
            contact: The Contact instance

        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        config = LicensingService.get_client_config(contact)
        if not config or config.max_rental_properties == 0:
            return True, ""

        from apps.portal.models_rental import RentalProperty

        current_count = RentalProperty.objects.filter(
            contact=contact, is_active=True
        ).count()

        if current_count >= config.max_rental_properties:
            return False, _(
                "Rental property limit reached ({limit}). "
                "Contact support to upgrade your plan."
            ).format(limit=config.max_rental_properties)

        return True, ""

    @staticmethod
    def get_usage_summary(contact) -> dict:
        """
        Get current usage vs limits for a client.

        Args:
            contact: The Contact instance

        Returns:
            Dict with usage info for each resource type
        """
        from apps.portal.models_commercial import CommercialBuilding
        from apps.portal.models_rental import RentalProperty

        config = LicensingService.get_client_config(contact)

        buildings_count = CommercialBuilding.objects.filter(
            contact=contact, is_active=True
        ).count()
        rental_count = RentalProperty.objects.filter(
            contact=contact, is_active=True
        ).count()

        return {
            "buildings": {
                "current": buildings_count,
                "limit": config.max_buildings if config else 0,
                "unlimited": not config or config.max_buildings == 0,
            },
            "floors_per_building": {
                "limit": config.max_floors_per_building if config else 0,
                "unlimited": not config or config.max_floors_per_building == 0,
            },
            "units_per_building": {
                "limit": config.max_units_per_building if config else 0,
                "unlimited": not config or config.max_units_per_building == 0,
            },
            "rental_properties": {
                "current": rental_count,
                "limit": config.max_rental_properties if config else 0,
                "unlimited": not config or config.max_rental_properties == 0,
            },
        }

    @staticmethod
    def get_building_usage(contact, building) -> dict:
        """
        Get floor and unit usage for a specific building.

        Args:
            contact: The Contact instance
            building: The CommercialBuilding instance

        Returns:
            Dict with floor and unit counts for the building
        """
        from apps.portal.models_commercial import CommercialUnit

        config = LicensingService.get_client_config(contact)

        floors_count = building.floors.count()
        units_count = CommercialUnit.objects.filter(
            floor__building=building
        ).count()

        return {
            "floors": {
                "current": floors_count,
                "limit": config.max_floors_per_building if config else 0,
                "unlimited": not config or config.max_floors_per_building == 0,
            },
            "units": {
                "current": units_count,
                "limit": config.max_units_per_building if config else 0,
                "unlimited": not config or config.max_units_per_building == 0,
            },
        }
