import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import {
  PortalNotification,
  PortalNotificationListResponse,
} from '../types/notifications';

export interface RegisterDeviceRequest {
  token: string;
  platform: 'ios' | 'android';
}

export interface RegisterDeviceResponse {
  id: string;
  token: string;
  platform: string;
  is_active: boolean;
}

/**
 * Register a device for push notifications
 */
export async function registerDevice(
  data: RegisterDeviceRequest
): Promise<RegisterDeviceResponse> {
  const response = await apiClient.post<RegisterDeviceResponse>(
    API_ENDPOINTS.REGISTER_DEVICE,
    data
  );
  return response.data;
}

/**
 * Unregister a device (deactivate push notifications)
 */
export async function unregisterDevice(token: string): Promise<void> {
  await apiClient.delete(`${API_ENDPOINTS.REGISTER_DEVICE}${token}/`);
}

/**
 * Get list of notifications for the authenticated contact
 */
export async function getNotifications(params?: {
  page?: number;
}): Promise<PortalNotificationListResponse> {
  const response = await apiClient.get<PortalNotification[] | PortalNotificationListResponse>(
    API_ENDPOINTS.NOTIFICATIONS,
    { params }
  );
  // Handle both array and paginated response formats
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length, next: null, previous: null };
  }
  return response.data;
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get<{ count: number }>(
    API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT
  );
  return response.data.count;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.NOTIFICATION_MARK_READ(id));
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.post(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ);
}
