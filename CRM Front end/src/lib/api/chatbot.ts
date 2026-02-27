import api from "@/lib/api";
import {
  ChatbotConfiguration,
  ChatbotConfigurationUpdate,
  ChatbotKnowledgeEntry,
  ChatbotKnowledgeEntryCreate,
  ChatbotAppointmentSlot,
  ChatbotAppointmentSlotCreate,
  ChatbotConversation,
  ChatbotStats,
} from "@/types/chatbot";

// Configuration
export async function getChatbotConfig(): Promise<ChatbotConfiguration> {
  const response = await api.get<ChatbotConfiguration>("/chatbot/config/");
  return response.data;
}

export async function updateChatbotConfig(
  data: ChatbotConfigurationUpdate
): Promise<ChatbotConfiguration> {
  const response = await api.patch<ChatbotConfiguration>("/chatbot/config/", data);
  return response.data;
}

// Knowledge Base
export async function getKnowledgeEntries(params?: {
  type?: string;
}): Promise<ChatbotKnowledgeEntry[]> {
  const response = await api.get<ChatbotKnowledgeEntry[] | { results: ChatbotKnowledgeEntry[] }>("/chatbot/knowledge/", {
    params,
  });
  // Handle both array and paginated responses
  const data = response.data;
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function getKnowledgeEntry(id: string): Promise<ChatbotKnowledgeEntry> {
  const response = await api.get<ChatbotKnowledgeEntry>(`/chatbot/knowledge/${id}/`);
  return response.data;
}

export async function createKnowledgeEntry(
  data: ChatbotKnowledgeEntryCreate
): Promise<ChatbotKnowledgeEntry> {
  const response = await api.post<ChatbotKnowledgeEntry>("/chatbot/knowledge/", data);
  return response.data;
}

export async function updateKnowledgeEntry(
  id: string,
  data: Partial<ChatbotKnowledgeEntryCreate>
): Promise<ChatbotKnowledgeEntry> {
  const response = await api.patch<ChatbotKnowledgeEntry>(
    `/chatbot/knowledge/${id}/`,
    data
  );
  return response.data;
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await api.delete(`/chatbot/knowledge/${id}/`);
}

// Appointment Slots
export async function getAppointmentSlots(): Promise<ChatbotAppointmentSlot[]> {
  const response = await api.get<ChatbotAppointmentSlot[] | { results: ChatbotAppointmentSlot[] }>("/chatbot/slots/");
  // Handle both array and paginated responses
  const data = response.data;
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createAppointmentSlot(
  data: ChatbotAppointmentSlotCreate
): Promise<ChatbotAppointmentSlot> {
  const response = await api.post<ChatbotAppointmentSlot>("/chatbot/slots/", data);
  return response.data;
}

export async function updateAppointmentSlot(
  id: string,
  data: Partial<ChatbotAppointmentSlotCreate>
): Promise<ChatbotAppointmentSlot> {
  const response = await api.patch<ChatbotAppointmentSlot>(
    `/chatbot/slots/${id}/`,
    data
  );
  return response.data;
}

export async function deleteAppointmentSlot(id: string): Promise<void> {
  await api.delete(`/chatbot/slots/${id}/`);
}

// Conversations
export async function getConversations(params?: {
  status?: string;
}): Promise<ChatbotConversation[]> {
  const response = await api.get<ChatbotConversation[]>("/chatbot/conversations/", {
    params,
  });
  return response.data;
}

export async function getConversation(id: string): Promise<ChatbotConversation> {
  const response = await api.get<ChatbotConversation>(`/chatbot/conversations/${id}/`);
  return response.data;
}

export async function closeConversation(id: string): Promise<void> {
  await api.post(`/chatbot/conversations/${id}/close/`);
}

export async function assignConversation(
  id: string,
  staffId: string
): Promise<ChatbotConversation> {
  const response = await api.post<ChatbotConversation>(
    `/chatbot/conversations/${id}/assign/`,
    { staff_id: staffId }
  );
  return response.data;
}

// Stats
export async function getChatbotStats(): Promise<ChatbotStats> {
  const response = await api.get<ChatbotStats>("/chatbot/stats/");
  return response.data;
}

// CRM Chat (for CRM users)
export interface CRMChatStartResponse {
  conversation_id: string;
  message: string;
  status: string;
}

export interface CRMChatResponse {
  conversation_id: string;
  message: string;
  action: string | null;
  metadata: Record<string, unknown>;
  status: string;
}

export interface CRMChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface CRMChatHistoryResponse {
  conversation_id: string;
  status: string;
  messages: CRMChatMessage[];
}

export async function startCRMChat(): Promise<CRMChatStartResponse> {
  const response = await api.post<CRMChatStartResponse>("/chatbot/chat/start/");
  return response.data;
}

export async function sendCRMChatMessage(
  message: string,
  conversationId?: string
): Promise<CRMChatResponse> {
  const response = await api.post<CRMChatResponse>("/chatbot/chat/", {
    message,
    conversation_id: conversationId,
  });
  return response.data;
}

export async function getCRMChatHistory(): Promise<CRMChatHistoryResponse> {
  const response = await api.get<CRMChatHistoryResponse>("/chatbot/chat/history/");
  return response.data;
}
