/**
 * Expo Configuration with SSL Pinning
 *
 * This file extends app.json with SSL pinning configuration.
 *
 * SETUP FOR SSL PINNING:
 * 1. Get your server's certificate hash using:
 *    openssl s_client -connect api.yourdomain.com:443 < /dev/null 2>/dev/null | \
 *    openssl x509 -pubkey -noout | \
 *    openssl pkey -pubin -outform DER | \
 *    openssl dgst -sha256 -binary | \
 *    openssl enc -base64
 *
 * 2. Update the SSL_PINS array below with your domain and hash
 * 3. Run: npx expo prebuild --clean
 * 4. Build: npx expo run:android OR npx expo run:ios
 *
 * NOTE: SSL Pinning does NOT work in Expo Go - use development builds
 */

// SSL Certificate Pins Configuration
// TODO: Replace with your actual certificate hashes before production deployment
const SSL_PINS = [
  {
    // Your API server domain (without https://)
    hostname: "api.ejflow.com",
    // SHA-256 hashes of certificate public keys
    // Include both leaf certificate and intermediate CA for redundancy
    publicKeyHashes: [
      // Primary certificate - REPLACE WITH YOUR ACTUAL HASH
      "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      // Backup certificate - REPLACE WITH YOUR BACKUP HASH
      "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
    ],
    includeSubdomains: true,
  },
];

// Check if we're in development mode
const isDev = process.env.NODE_ENV === "development";

// Check if SSL pinning is configured (not using placeholder values)
const isSSLPinningConfigured = SSL_PINS.every(
  (pin) =>
    pin.hostname !== "api.ejflow.com" ||
    !pin.publicKeyHashes.some((h) => h.includes("AAAA") || h.includes("BBBB"))
);

module.exports = {
  expo: {
    name: "Ebenezer Client",
    slug: "ejflow-client",
    owner: "ejsupportit",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "ebenezer-portal",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#2563eb",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ebenezertax.clientportal",
      infoPlist: {
        NSFaceIDUsageDescription: "Use Face ID to securely access your account",
        NSCameraUsageDescription: "Take photos to upload documents",
        NSPhotoLibraryUsageDescription: "Select photos to upload documents",
      },
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2563eb",
      },
      package: "com.ebenezertax.clientportal",
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID to unlock the app",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#2563eb",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "3f2a268a-8b13-4113-8f38-589fe778fdad",
      },
      sslPinningEnabled: isSSLPinningConfigured && !isDev,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/3f2a268a-8b13-4113-8f38-589fe778fdad",
    },
  },
};
