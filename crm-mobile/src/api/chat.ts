import apiClient from './client';
import {
  ChatConversation,
  ChatStartResponse,
  ChatMessageResponse,
  AppointmentSlot,
  BookAppointmentRequest,
  BookAppointmentResponse,
} from '../types/chat';

/**
 * Start a new chat conversation
 */
export async function startChat(): Promise<ChatStartResponse> {
  const response = await apiClient.post<ChatStartResponse>('/portal/chat/start/');
  return response.data;
}

/**
 * Send a message to the chatbot
 */
export async function sendMessage(
  message: string,
  conversationId?: string
): Promise<ChatMessageResponse> {
  const response = await apiClient.post<ChatMessageResponse>('/portal/chat/message/', {
    message,
    conversation_id: conversationId,
  });
  return response.data;
}

/**
 * Get chat history
 */
export async function getChatHistory(): Promise<ChatConversation[]> {
  const response = await apiClient.get<ChatConversation[]>('/portal/chat/history/');
  return response.data;
}

/**
 * Get a specific conversation
 */
export async function getConversation(conversationId: string): Promise<ChatConversation> {
  const response = await apiClient.get<ChatConversation>(
    `/portal/chat/conversation/${conversationId}/`
  );
  return response.data;
}

/**
 * Get available appointment slots
 */
export async function getAppointmentSlots(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<AppointmentSlot[]> {
  const response = await apiClient.get<AppointmentSlot[]>('/portal/chat/slots/', {
    params,
  });
  return response.data;
}

/**
 * Book an appointment
 */
export async function bookAppointment(
  data: BookAppointmentRequest
): Promise<BookAppointmentResponse> {
  const response = await apiClient.post<BookAppointmentResponse>('/portal/chat/book/', data);
  return response.data;
}
