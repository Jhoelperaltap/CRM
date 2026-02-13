"""
TOTP two-factor authentication utilities.

Uses pyotp for TOTP generation/verification and qrcode for QR image output.
"""

import base64
import io
import string

import pyotp
import qrcode
from django.contrib.auth.hashers import check_password, make_password
from django.utils.crypto import get_random_string

ISSUER_NAME = "Ebenezer Tax CRM"


def generate_totp_secret():
    """Return a new random base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(user, secret):
    """Return the otpauth:// provisioning URI for a TOTP secret."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=user.email, issuer_name=ISSUER_NAME)


def generate_qr_code(uri):
    """Return a base64-encoded PNG image of the QR code for the given URI."""
    img = qrcode.make(uri, box_size=6, border=2)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def verify_totp(secret, code):
    """Verify a TOTP code with 2-step time tolerance (±60 seconds)."""
    if not secret or not code:
        return False
    # Strip whitespace and ensure code is a string of digits
    code = str(code).strip()
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=2)


def generate_recovery_codes(count=8):
    """Return a list of random 8-character alphanumeric recovery codes."""
    chars = string.ascii_uppercase + string.digits
    return [get_random_string(8, allowed_chars=chars) for _ in range(count)]


def hash_recovery_code(code):
    """Return a Django password hash for a recovery code."""
    return make_password(code.upper())


def check_recovery_code(user, code):
    """
    Check a recovery code against the user's stored hashed codes.
    If valid, consume it (remove from stored codes) and return True.
    """
    code_upper = code.upper()
    stored = list(user.recovery_codes)
    for i, hashed in enumerate(stored):
        if check_password(code_upper, hashed):
            stored.pop(i)
            user.recovery_codes = stored
            user.save(update_fields=["recovery_codes"])
            return True
    return False
