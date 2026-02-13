from rest_framework import serializers


class TwoFactorSetupResponseSerializer(serializers.Serializer):
    secret = serializers.CharField()
    qr_code = serializers.CharField()


class TwoFactorVerifySerializer(serializers.Serializer):
    code = serializers.CharField(
        min_length=6, max_length=6, help_text="6-digit TOTP code"
    )


class TwoFactorDisableSerializer(serializers.Serializer):
    password = serializers.CharField()
    code = serializers.CharField(
        min_length=6, max_length=6, help_text="6-digit TOTP code"
    )


class TwoFactorLoginVerifySerializer(serializers.Serializer):
    temp_token = serializers.CharField()
    code = serializers.CharField(
        min_length=6, max_length=6, help_text="6-digit TOTP code"
    )


class TwoFactorRecoverySerializer(serializers.Serializer):
    temp_token = serializers.CharField()
    recovery_code = serializers.CharField(
        min_length=8, max_length=8, help_text="8-character recovery code"
    )


class TwoFactorStatusSerializer(serializers.Serializer):
    is_enabled = serializers.BooleanField()
    enforce_required = serializers.BooleanField()
