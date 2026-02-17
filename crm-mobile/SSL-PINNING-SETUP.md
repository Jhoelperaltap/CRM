# SSL Certificate Pinning Setup Guide

## Overview

SSL Certificate Pinning is a security measure that prevents Man-in-the-Middle (MITM) attacks by verifying that the server's certificate matches a known hash. This is especially important for mobile apps handling sensitive data.

## Prerequisites

- **Development Build Required**: SSL pinning does NOT work in Expo Go. You must use a development build.
- **Certificate Access**: You need access to your production server's SSL certificate.
- **Expo SDK 54+**: This configuration is designed for Expo SDK 54.

## Step 1: Get Your Certificate Hash

### Option A: Using OpenSSL (Recommended)

```bash
# Replace api.yourdomain.com with your actual domain
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com < /dev/null 2>/dev/null | \
openssl x509 -pubkey -noout | \
openssl pkey -pubin -outform DER | \
openssl dgst -sha256 -binary | \
openssl enc -base64
```

This will output something like:
```
47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=
```

### Option B: Using SSL Labs

1. Go to https://www.ssllabs.com/ssltest/
2. Enter your domain
3. In the results, find "Certificate #1" → "Pin SHA256"
4. Copy the hash value

## Step 2: Get Backup/Intermediate CA Hash

For certificate rotation safety, also get the intermediate CA certificate hash:

```bash
# Get the full certificate chain
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com -showcerts < /dev/null 2>/dev/null | \
openssl x509 -pubkey -noout | \
openssl pkey -pubin -outform DER | \
openssl dgst -sha256 -binary | \
openssl enc -base64
```

## Step 3: Configure the App

Edit `app.config.js` and update the `SSL_PINS` array:

```javascript
const SSL_PINS = [
  {
    hostname: "api.yourdomain.com",  // Your actual domain
    publicKeyHashes: [
      "sha256/YOUR_LEAF_CERTIFICATE_HASH_HERE=",
      "sha256/YOUR_INTERMEDIATE_CA_HASH_HERE=",
    ],
    includeSubdomains: true,
  },
];
```

## Step 4: Build the App

```bash
# Clean previous builds
npx expo prebuild --clean

# Build for Android
npx expo run:android

# OR Build for iOS (macOS only)
npx expo run:ios
```

## Step 5: Test the Configuration

1. Install the development build on a device
2. Try connecting to your API
3. Verify connections succeed with valid certificates
4. (Optional) Test with a proxy like Charles/mitmproxy to verify pinning blocks MITM

## Certificate Rotation Strategy

When rotating certificates:

1. **Before rotation**: Add the new certificate hash to the app
2. **Deploy app update**: Users get both old and new hashes
3. **Rotate certificate**: Server starts using new certificate
4. **After rotation**: Remove old hash in next app update

```javascript
// During rotation period - both hashes active
const SSL_PINS = [
  {
    hostname: "api.yourdomain.com",
    publicKeyHashes: [
      "sha256/OLD_CERTIFICATE_HASH=",  // Current certificate
      "sha256/NEW_CERTIFICATE_HASH=",  // New certificate (backup)
      "sha256/INTERMEDIATE_CA_HASH=",  // CA certificate
    ],
  },
];
```

## Troubleshooting

### "Connection failed" errors after enabling pinning

1. Verify the certificate hash is correct
2. Check the domain matches exactly
3. Ensure you're using a development build, not Expo Go
4. Check if the certificate has been rotated

### Testing pinning is working

Use a proxy tool like Charles Proxy:
1. Install Charles root certificate on device
2. Enable SSL proxying for your domain
3. Connection should FAIL with pinning enabled (expected behavior)
4. This proves MITM attacks are blocked

### Disabling pinning for debugging

Set `allowCleartext: true` in development or temporarily remove the plugin from `app.config.js`.

## Security Considerations

- **Never commit actual certificate hashes to public repositories** - use environment variables for production hashes
- **Keep backup hashes** for certificate rotation
- **Plan for certificate expiration** - update hashes before certificates expire
- **Test thoroughly** before production deployment

## Files Reference

- `app.config.js` - Main configuration with SSL_PINS array
- `plugins/withSSLPinning.js` - Expo plugin for native configuration
- `src/config/ssl-pins.ts` - TypeScript configuration (alternative)

## Platform-Specific Notes

### Android
- Uses Network Security Config (`network_security_config.xml`)
- Pinning is enforced at the system level
- Debug builds allow user-installed CA certificates

### iOS
- Uses App Transport Security + TrustKit configuration
- For full pinning support, consider adding TrustKit pod
- ATS enforces HTTPS-only connections

## References

- [OWASP Certificate Pinning](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning)
- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [iOS App Transport Security](https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity)
