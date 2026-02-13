import re

from django.contrib.auth.hashers import check_password
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class PasswordComplexityValidator:
    """
    Validates that the password contains a mix of character types.

    Requires:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Security: Enforces strong password complexity to prevent
    dictionary attacks and brute force attacks.
    """

    def __init__(
        self,
        require_uppercase=True,
        require_lowercase=True,
        require_digit=True,
        require_special=True,
        min_unique_chars=4,
    ):
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digit = require_digit
        self.require_special = require_special
        self.min_unique_chars = min_unique_chars

    def validate(self, password, user=None):
        errors = []

        if self.require_uppercase and not re.search(r"[A-Z]", password):
            errors.append(
                _("Password must contain at least one uppercase letter (A-Z).")
            )

        if self.require_lowercase and not re.search(r"[a-z]", password):
            errors.append(
                _("Password must contain at least one lowercase letter (a-z).")
            )

        if self.require_digit and not re.search(r"\d", password):
            errors.append(_("Password must contain at least one digit (0-9)."))

        if self.require_special and not re.search(
            r"[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?`~\\]", password
        ):
            errors.append(
                _("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\).")
            )

        # Check for unique characters
        unique_chars = len(set(password))
        if unique_chars < self.min_unique_chars:
            errors.append(
                _("Password must contain at least %(count)d unique characters.")
                % {"count": self.min_unique_chars}
            )

        if errors:
            raise ValidationError(errors, code="password_complexity")

    def get_help_text(self):
        requirements = []
        if self.require_uppercase:
            requirements.append(_("one uppercase letter"))
        if self.require_lowercase:
            requirements.append(_("one lowercase letter"))
        if self.require_digit:
            requirements.append(_("one digit"))
        if self.require_special:
            requirements.append(_("one special character"))

        return _("Your password must contain at least: %(requirements)s.") % {
            "requirements": ", ".join(str(r) for r in requirements)
        }


class PasswordHistoryValidator:
    """
    Rejects a new password if it matches any of the user's recent passwords
    stored in PasswordHistory, up to the count defined by AuthenticationPolicy.
    """

    def validate(self, password, user=None):
        if user is None:
            return

        from apps.users.models import AuthenticationPolicy, PasswordHistory

        policy = AuthenticationPolicy.load()
        recent = PasswordHistory.objects.filter(user=user).order_by("-created_at")[
            : policy.password_history_count
        ]

        for entry in recent:
            if check_password(password, entry.password_hash):
                raise ValidationError(
                    _(
                        "You cannot reuse any of your last %(count)d passwords."
                    )
                    % {"count": policy.password_history_count},
                    code="password_reuse",
                )

    def get_help_text(self):
        return _("Your password cannot be a recently used password.")
