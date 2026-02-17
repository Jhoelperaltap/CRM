/**
 * SSL Certificate Pinning Configuration
 *
 * SECURITY: Certificate pinning prevents Man-in-the-Middle (MITM) attacks
 * by verifying that the server's certificate matches a known hash.
 *
 * HOW TO GET THE CERTIFICATE HASH:
 *
 * 1. Using OpenSSL (recommended):
 *    openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com < /dev/null 2>/dev/null | \
 *    openssl x509 -pubkey -noout | \
 *    openssl pkey -pubin -outform DER | \
 *    openssl dgst -sha256 -binary | \
 *    openssl enc -base64
 *
 * 2. Using online tools:
 *    - https://www.ssllabs.com/ssltest/ (check certificate details)
 *    - Extract the SPKI fingerprint (SHA-256)
 *
 * IMPORTANT:
 * - Include BOTH the leaf certificate AND intermediate CA certificate hashes
 * - When certificates are renewed, you need to update these hashes
 * - Consider having a backup pin for certificate rotation
 * - Test thoroughly before deploying to production
 *
 * CERTIFICATE ROTATION STRATEGY:
 * - Add new certificate hash BEFORE rotation
 * - Deploy app update with both old and new hashes
 * - Rotate certificate on server
 * - Remove old hash in next app update
 */

export interface SSLPinConfig {
  /**
   * The domain to pin (without protocol)
   * Example: "api.ejflow.com"
   */
  hostname: string;

  /**
   * SHA-256 hashes of the certificate's Subject Public Key Info (SPKI)
   * Format: "sha256/BASE64_ENCODED_HASH"
   * Include multiple hashes for certificate rotation
   */
  publicKeyHashes: string[];

  /**
   * Whether to include subdomains
   */
  includeSubdomains?: boolean;
}

/**
 * SSL Pinning Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Replace 'api.yourdomain.com' with your actual API domain
 * 2. Generate the SHA-256 hash using the OpenSSL command above
 * 3. Replace the placeholder hashes with your actual certificate hashes
 * 4. Rebuild the app with `expo prebuild` and `expo run:android/ios`
 */
export const SSL_PIN_CONFIG: SSLPinConfig[] = [
  {
    // Primary API server
    hostname: "api.ejflow.com", // TODO: Update with actual domain
    publicKeyHashes: [
      // Primary certificate hash (leaf certificate)
      // TODO: Replace with actual hash from your SSL certificate
      "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",

      // Backup hash (intermediate CA or backup certificate)
      // TODO: Add backup hash for certificate rotation
      "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
    ],
    includeSubdomains: true,
  },
];

/**
 * Check if SSL pinning is properly configured
 */
export function isSSLPinningConfigured(): boolean {
  return SSL_PIN_CONFIG.every(
    (config) =>
      config.hostname !== "api.ejflow.com" && // Not placeholder
      config.publicKeyHashes.every(
        (hash) =>
          !hash.includes("AAAA") && !hash.includes("BBBB") // Not placeholder hashes
      )
  );
}

/**
 * Get the pin configuration for a specific hostname
 */
export function getPinConfigForHost(hostname: string): SSLPinConfig | undefined {
  return SSL_PIN_CONFIG.find((config) => {
    if (config.includeSubdomains) {
      return hostname === config.hostname || hostname.endsWith(`.${config.hostname}`);
    }
    return hostname === config.hostname;
  });
}
