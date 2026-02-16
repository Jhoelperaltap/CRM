import api from "@/lib/api";
import {
  ChatDepartment,
  ChatAgent,
  ChatSession,
  ChatSessionList,
  ChatMessage,
  CannedResponse,
  ChatWidgetSettings,
  OfflineMessage,
  ChatStats,
} from "@/types/live-chat";

// Department API
export const chatDepartmentApi = {
  list: async (params?: { is_active?: boolean }): Promise<ChatDepartment[]> => {
    const response = await api.get("/live-chat/departments/", { params });
    return response.data.results || response.data;
  },

  get: async (id: string): Promise<ChatDepartment> => {
    const response = await api.get(`/live-chat/departments/${id}/`);
    return response.data;
  },

  create: async (data: Partial<ChatDepartment>): Promise<ChatDepartment> => {
    const response = await api.post("/live-chat/departments/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<ChatDepartment>): Promise<ChatDepartment> => {
    const response = await api.patch(`/live-chat/departments/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/live-chat/departments/${id}/`);
  },
};

// Agent API
export const chatAgentApi = {
  list: async (params?: {
    department?: string;
    is_available?: boolean;
    status?: string;
  }): Promise<ChatAgent[]> => {
    const response = await api.get("/live-chat/agents/", { params });
    return response.data.results || response.data;
  },

  me: async (): Promise<ChatAgent> => {
    const response = await api.get("/live-chat/agents/me/");
    return response.data;
  },

  updateMe: async (data: Partial<ChatAgent>): Promise<ChatAgent> => {
    const response = await api.patch("/live-chat/agents/me/", data);
    return response.data;
  },

  goOnline: async (): Promise<void> => {
    await api.post("/live-chat/agents/go_online/");
  },

  goOffline: async (): Promise<void> => {
    await api.post("/live-chat/agents/go_offline/");
  },

  updateStatus: async (
    status: ChatAgent["status"],
    statusMessage?: string
  ): Promise<ChatAgent> => {
    const response = await api.post("/live-chat/agents/update_status/", {
      status,
      status_message: statusMessage,
    });
    return response.data;
  },
};

// Session API
export const chatSessionApi = {
  list: async (params?: {
    status?: string;
    department?: string;
    mine?: boolean;
    unassigned?: boolean;
    start_date?: string;
    end_date?: string;
  }): Promise<ChatSessionList[]> => {
    const response = await api.get("/live-chat/sessions/", { params });
    return response.data.results || response.data;
  },

  get: async (id: string): Promise<ChatSession> => {
    const response = await api.get(`/live-chat/sessions/${id}/`);
    return response.data;
  },

  accept: async (id: string): Promise<ChatSession> => {
    const response = await api.post(`/live-chat/sessions/${id}/accept/`);
    return response.data;
  },

  transfer: async (
    id: string,
    data: { agent_id?: string; department_id?: string; note?: string }
  ): Promise<ChatSession> => {
    const response = await api.post(`/live-chat/sessions/${id}/transfer/`, data);
    return response.data;
  },

  close: async (id: string): Promise<ChatSession> => {
    const response = await api.post(`/live-chat/sessions/${id}/close/`);
    return response.data;
  },

  sendMessage: async (
    id: string,
    content: string,
    options?: { message_type?: string; is_internal?: boolean }
  ): Promise<ChatMessage> => {
    const response = await api.post(`/live-chat/sessions/${id}/send_message/`, {
      content,
      ...options,
    });
    return response.data;
  },

  getMessages: async (
    id: string,
    showInternal?: boolean
  ): Promise<ChatMessage[]> => {
    const response = await api.get(`/live-chat/sessions/${id}/messages/`, {
      params: { show_internal: showInternal },
    });
    return response.data;
  },

  markRead: async (id: string): Promise<void> => {
    await api.post(`/live-chat/sessions/${id}/mark_read/`);
  },

  sendTranscript: async (id: string): Promise<void> => {
    await api.post(`/live-chat/sessions/${id}/send_transcript/`);
  },
};

// Canned Response API
export const cannedResponseApi = {
  list: async (params?: {
    department?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<CannedResponse[]> => {
    const response = await api.get("/live-chat/canned-responses/", { params });
    return response.data.results || response.data;
  },

  get: async (id: string): Promise<CannedResponse> => {
    const response = await api.get(`/live-chat/canned-responses/${id}/`);
    return response.data;
  },

  create: async (data: Partial<CannedResponse>): Promise<CannedResponse> => {
    const response = await api.post("/live-chat/canned-responses/", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<CannedResponse>
  ): Promise<CannedResponse> => {
    const response = await api.patch(`/live-chat/canned-responses/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/live-chat/canned-responses/${id}/`);
  },

  use: async (id: string): Promise<{ content: string }> => {
    const response = await api.post(`/live-chat/canned-responses/${id}/use/`);
    return response.data;
  },
};

// Widget Settings API
export const chatWidgetSettingsApi = {
  get: async (): Promise<ChatWidgetSettings> => {
    const response = await api.get("/live-chat/widget-settings/");
    return response.data;
  },

  update: async (
    data: Partial<ChatWidgetSettings>
  ): Promise<ChatWidgetSettings> => {
    const response = await api.patch("/live-chat/widget-settings/", data);
    return response.data;
  },
};

// Offline Message API
export const offlineMessageApi = {
  list: async (params?: {
    is_read?: boolean;
    is_responded?: boolean;
    department?: string;
  }): Promise<OfflineMessage[]> => {
    const response = await api.get("/live-chat/offline-messages/", { params });
    return response.data.results || response.data;
  },

  get: async (id: string): Promise<OfflineMessage> => {
    const response = await api.get(`/live-chat/offline-messages/${id}/`);
    return response.data;
  },

  markRead: async (id: string): Promise<OfflineMessage> => {
    const response = await api.post(
      `/live-chat/offline-messages/${id}/mark_read/`
    );
    return response.data;
  },

  markResponded: async (id: string): Promise<OfflineMessage> => {
    const response = await api.post(
      `/live-chat/offline-messages/${id}/mark_responded/`
    );
    return response.data;
  },

  convertToContact: async (
    id: string
  ): Promise<{ message: string; contact_id: string }> => {
    const response = await api.post(
      `/live-chat/offline-messages/${id}/convert_to_contact/`
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/live-chat/offline-messages/${id}/`);
  },
};

// Stats API
export const chatStatsApi = {
  get: async (): Promise<ChatStats> => {
    const response = await api.get("/live-chat/stats/");
    return response.data;
  },
};
