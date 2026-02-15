"""
JWT Key Rotation Management Command.

Security: Provides a process for rotating JWT signing keys without
immediately invalidating all existing tokens.

Usage:
    # Generate a new JWT key
    python manage.py rotate_jwt_keys --generate

    # Show current key info
    python manage.py rotate_jwt_keys --info

    # Invalidate all existing tokens (force logout all users)
    python manage.py rotate_jwt_keys --invalidate-all

Key Rotation Process:
1. Generate new key with --generate
2. Update JWT_SIGNING_KEY in environment with new key
3. Restart application servers
4. Wait for old token lifetime to expire (24h for refresh tokens)
5. Old tokens will naturally expire

For immediate rotation (emergency):
1. Update JWT_SIGNING_KEY in environment
2. Run --invalidate-all to blacklist all tokens
3. Restart application servers
4. All users will need to log in again
"""

import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "JWT key rotation utilities"

    def add_arguments(self, parser):
        parser.add_argument(
            "--generate",
            action="store_true",
            help="Generate a new JWT signing key",
        )
        parser.add_argument(
            "--info",
            action="store_true",
            help="Show information about current JWT configuration",
        )
        parser.add_argument(
            "--invalidate-all",
            action="store_true",
            help="Blacklist all existing tokens (force logout all users)",
        )

    def handle(self, *args, **options):
        if options["generate"]:
            self.generate_key()
        elif options["info"]:
            self.show_info()
        elif options["invalidate_all"]:
            self.invalidate_all()
        else:
            self.stdout.write(
                self.style.WARNING("No action specified. Use --help for options.")
            )

    def generate_key(self):
        """Generate a new JWT signing key."""
        # Generate a secure 256-bit key
        key = secrets.token_urlsafe(32)

        self.stdout.write(
            self.style.SUCCESS("\n=== New JWT Signing Key Generated ===\n")
        )
        self.stdout.write(f"JWT_SIGNING_KEY={key}\n")
        self.stdout.write(
            self.style.WARNING(
                "\nTo rotate keys:\n"
                "1. Add the new key to your environment variables\n"
                "2. Restart your application servers\n"
                "3. Existing tokens will become invalid\n"
                "4. Users will need to log in again\n"
            )
        )

    def show_info(self):
        """Show information about current JWT configuration."""
        jwt_settings = getattr(settings, "SIMPLE_JWT", {})

        self.stdout.write(self.style.SUCCESS("\n=== JWT Configuration ===\n"))

        # Key info (masked for security)
        signing_key = jwt_settings.get("SIGNING_KEY", "")
        if signing_key:
            # Show first and last 4 characters only
            masked_key = f"{signing_key[:4]}...{signing_key[-4:]}"
            self.stdout.write(f"Signing Key: {masked_key} (length: {len(signing_key)})")
        else:
            self.stdout.write(self.style.ERROR("Signing Key: NOT SET"))

        # Token lifetimes
        access_lifetime = jwt_settings.get("ACCESS_TOKEN_LIFETIME")
        refresh_lifetime = jwt_settings.get("REFRESH_TOKEN_LIFETIME")

        if access_lifetime:
            self.stdout.write(f"Access Token Lifetime: {access_lifetime}")
        if refresh_lifetime:
            self.stdout.write(f"Refresh Token Lifetime: {refresh_lifetime}")

        # Rotation settings
        rotate = jwt_settings.get("ROTATE_REFRESH_TOKENS", False)
        blacklist = jwt_settings.get("BLACKLIST_AFTER_ROTATION", False)
        self.stdout.write(f"Rotate Refresh Tokens: {rotate}")
        self.stdout.write(f"Blacklist After Rotation: {blacklist}")

        # Portal key
        portal_key = getattr(settings, "PORTAL_JWT_SIGNING_KEY", "")
        if portal_key:
            masked_portal = f"{portal_key[:4]}...{portal_key[-4:]}"
            self.stdout.write(f"\nPortal Signing Key: {masked_portal}")
            if portal_key == signing_key:
                self.stdout.write(
                    self.style.WARNING(
                        "  WARNING: Portal key is the same as staff key!"
                    )
                )

        # Active sessions
        try:
            from apps.users.models import UserSession

            active_sessions = UserSession.objects.filter(is_active=True).count()
            self.stdout.write(f"\nActive Sessions: {active_sessions}")
        except Exception:
            pass

        # Blacklisted tokens
        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

            blacklisted = BlacklistedToken.objects.count()
            self.stdout.write(f"Blacklisted Tokens: {blacklisted}")
        except Exception:
            pass

    def invalidate_all(self):
        """Invalidate all existing tokens by blacklisting them."""
        self.stdout.write(
            self.style.WARNING("\nWARNING: This will log out ALL users immediately!\n")
        )

        confirm = input("Type 'yes' to confirm: ")
        if confirm.lower() != "yes":
            self.stdout.write(self.style.ERROR("Aborted."))
            return

        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )

            from apps.users.models import UserSession

            # Blacklist all outstanding tokens
            outstanding = OutstandingToken.objects.all()
            count = 0
            for token in outstanding:
                BlacklistedToken.objects.get_or_create(token=token)
                count += 1

            # Deactivate all user sessions
            sessions_count = UserSession.objects.filter(is_active=True).update(
                is_active=False
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"\nInvalidated {count} tokens and {sessions_count} sessions."
                )
            )
            self.stdout.write("All users will need to log in again.")

        except Exception as e:
            raise CommandError(f"Failed to invalidate tokens: {e}")
