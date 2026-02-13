import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import {
  PortalMessage,
  PortalMessageListResponse,
  PortalMessageCreate,
} from '../types/messages';

/**
 * Get list of messages for the authenticated contact
 */
export async function getMessages(params?: {
  page?: number;
  is_read?: boolean;
}): Promise<PortalMessageListResponse> {
  const response = await apiClient.get<PortalMessage[] | PortalMessageListResponse>(
    API_ENDPOINTS.MESSAGES,
    { params }
  );
  // Handle both array and paginated response formats
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length };
  }
  return response.data;
}

/**
 * Get a specific message thread by ID
 */
export async function getMessage(id: string): Promise<PortalMessage> {
  const response = await apiClient.get<PortalMessage>(API_ENDPOINTS.MESSAGE_DETAIL(id));
  return response.data;
}

/**
 * Send a new message
 */
export async function sendMessage(data: PortalMessageCreate): Promise<PortalMessage> {
  const response = await apiClient.post<PortalMessage>(API_ENDPOINTS.MESSAGES, data);
  return response.data;
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(id: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.MESSAGE_MARK_READ(id));
}

/**
 * Reply to a message
 */
export async function replyToMessage(
  parentId: string,
  data: Omit<PortalMessageCreate, 'parent_message_id'>
): Promise<PortalMessage> {
  const response = await apiClient.post<PortalMessage>(API_ENDPOINTS.MESSAGES, {
    ...data,
    parent_message_id: parentId,
  });
  return response.data;
}
