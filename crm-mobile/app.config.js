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
    name: "EJFLOW Client",
    slug: "ejflow-client",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "ejflow-portal",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#2563eb",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ejflow.client",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2563eb",
      },
      package: "com.ejflow.client",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#2563eb",
        },
      ],
      // SSL Pinning Plugin - only enabled when properly configured
      ...(isSSLPinningConfigured
        ? [
            [
              "./plugins/withSSLPinning",
              {
                pins: SSL_PINS,
                // Certificate expiration date - update when rotating certificates
                pinExpiration: "2027-12-31",
                // Disable cleartext (HTTP) traffic in production
                allowCleartext: isDev,
              },
            ],
          ]
        : []),
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      // Expose SSL pinning status to the app
      sslPinningEnabled: isSSLPinningConfigured && !isDev,
    },
  },
};
