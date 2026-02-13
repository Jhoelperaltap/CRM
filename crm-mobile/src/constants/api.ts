// API Configuration
// Change this to your actual backend URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
