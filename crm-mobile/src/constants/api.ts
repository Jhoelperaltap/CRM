// API Configuration
// Change this to your actual backend URL

/**
 * SECURITY: Validate and normalize API URL
 *
 * In production builds, HTTPS is required. HTTP is only allowed during
 * development for local testing (localhost/10.0.2.2/192.168.x.x).
 */
function getSecureApiUrl(): string {
  const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  const isDev = __DEV__;

  // Parse the URL to check protocol
  try {
    const url = new URL(rawUrl);

    // In production, enforce HTTPS
    if (!isDev && url.protocol === 'http:') {
      // Allow localhost variants in development builds that slip through
      const isLocalhost =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '10.0.2.2' || // Android emulator
        url.hostname.startsWith('192.168.') ||
        url.hostname.startsWith('10.0.');

      if (!isLocalhost) {
        // Force HTTPS for non-localhost URLs in production
        console.warn(
          '[SECURITY] HTTP is not allowed in production. Upgrading to HTTPS.'
        );
        url.protocol = 'https:';
        return url.toString().replace(/\/$/, ''); // Remove trailing slash
      }
    }

    // In development, warn about HTTP usage with non-local URLs
    if (isDev && url.protocol === 'http:') {
      const isLocalhost =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '10.0.2.2' ||
        url.hostname.startsWith('192.168.') ||
        url.hostname.startsWith('10.0.');

      if (!isLocalhost) {
        console.warn(
          '[SECURITY WARNING] Using HTTP with a non-local URL. ' +
            'This is insecure and should only be used for testing. ' +
            'Use HTTPS in production.'
        );
      }
    }

    return rawUrl;
  } catch {
    console.error('[API] Invalid API URL:', rawUrl);
    return rawUrl;
  }
}

export const API_BASE_URL = getSecureApiUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/portal/auth/login/',
  LOGOUT: '/portal/auth/logout/',
  ME: '/portal/auth/me/',
  TOKEN_REFRESH: '/portal/auth/refresh/',
  PASSWORD_RESET: '/portal/auth/password-reset/',
  PASSWORD_RESET_CONFIRM: '/portal/auth/password-reset-confirm/',
  PASSWORD_CHANGE: '/portal/auth/password-change/',

  // Cases
  CASES: '/portal/cases/',
  CASE_DETAIL: (id: string) => `/portal/cases/${id}/`,

  // Documents
  DOCUMENTS: '/portal/documents/',
  DOCUMENT_DETAIL: (id: string) => `/portal/documents/${id}/`,

  // Messages
  MESSAGES: '/portal/messages/',
  MESSAGE_DETAIL: (id: string) => `/portal/messages/${id}/`,
  MESSAGE_MARK_READ: (id: string) => `/portal/messages/${id}/mark-read/`,

  // Appointments
  APPOINTMENTS: '/portal/appointments/',

  // Notifications
  REGISTER_DEVICE: '/portal/notifications/register-device/',
  NOTIFICATIONS: '/portal/notifications/',
  NOTIFICATION_DETAIL: (id: string) => `/portal/notifications/${id}/`,
  NOTIFICATION_MARK_READ: (id: string) => `/portal/notifications/${id}/mark-read/`,
  NOTIFICATIONS_UNREAD_COUNT: '/portal/notifications/unread-count/',
  NOTIFICATIONS_MARK_ALL_READ: '/portal/notifications/mark-all-read/',
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Token refresh threshold in seconds (refresh 5 minutes before expiry)
export const TOKEN_REFRESH_THRESHOLD = 300;
