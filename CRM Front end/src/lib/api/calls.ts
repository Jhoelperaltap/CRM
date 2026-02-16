import api from "@/lib/api";
import type {
  TelephonyProvider,
  PhoneLine,
  Call,
  CallQueue,
  CallQueueMember,
  Voicemail,
  CallScript,
  CallSettings,
  CallStats,
  ClickToCallRequest,
} from "@/types/calls";

// Telephony Providers
export const telephonyProviderApi = {
  list: async (): Promise<TelephonyProvider[]> => {
    const response = await api.get<TelephonyProvider[] | { results: TelephonyProvider[] }>("/calls/providers/");
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<TelephonyProvider> => {
    const response = await api.get<TelephonyProvider>(`/calls/providers/${id}/`);
    return response.data;
  },

  create: async (data: Partial<TelephonyProvider>): Promise<TelephonyProvider> => {
    const response = await api.post<TelephonyProvider>("/calls/providers/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<TelephonyProvider>): Promise<TelephonyProvider> => {
    const response = await api.patch<TelephonyProvider>(`/calls/providers/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/calls/providers/${id}/`);
  },

  testConnection: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>(
      `/calls/providers/${id}/test_connection/`
    );
    return response.data;
  },

  setDefault: async (id: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      `/calls/providers/${id}/set_default/`
    );
    return response.data;
  },
};

// Phone Lines
export const phoneLineApi = {
  list: async (params?: Record<string, string | boolean>): Promise<PhoneLine[]> => {
    const response = await api.get<PhoneLine[] | { results: PhoneLine[] }>("/calls/lines/", { params });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<PhoneLine> => {
    const response = await api.get<PhoneLine>(`/calls/lines/${id}/`);
    return response.data;
  },

  create: async (data: Partial<PhoneLine>): Promise<PhoneLine> => {
    const response = await api.post<PhoneLine>("/calls/lines/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<PhoneLine>): Promise<PhoneLine> => {
    const response = await api.patch<PhoneLine>(`/calls/lines/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/calls/lines/${id}/`);
  },

  myLines: async (): Promise<PhoneLine[]> => {
    const response = await api.get<PhoneLine[]>("/calls/lines/my_lines/");
    return response.data;
  },
};

// Calls
export const callApi = {
  list: async (params?: Record<string, string | boolean>): Promise<Call[]> => {
    const response = await api.get<Call[] | { results: Call[] }>("/calls/calls/", { params });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<Call> => {
    const response = await api.get<Call>(`/calls/calls/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Call>): Promise<Call> => {
    const response = await api.post<Call>("/calls/calls/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Call>): Promise<Call> => {
    const response = await api.patch<Call>(`/calls/calls/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/calls/calls/${id}/`);
  },

  clickToCall: async (data: ClickToCallRequest): Promise<Call> => {
    const response = await api.post<Call>("/calls/calls/click_to_call/", data);
    return response.data;
  },

  endCall: async (id: string): Promise<Call> => {
    const response = await api.post<Call>(`/calls/calls/${id}/end_call/`);
    return response.data;
  },

  transfer: async (id: string, userId: string): Promise<Call> => {
    const response = await api.post<Call>(`/calls/calls/${id}/transfer/`, {
      user_id: userId,
    });
    return response.data;
  },

  logNotes: async (
    id: string,
    data: {
      notes?: string;
      outcome?: string;
      follow_up_date?: string;
      follow_up_notes?: string;
    }
  ): Promise<Call> => {
    const response = await api.post<Call>(`/calls/calls/${id}/log_notes/`, data);
    return response.data;
  },

  stats: async (period?: "today" | "week" | "month"): Promise<CallStats> => {
    const response = await api.get<CallStats>("/calls/calls/stats/", {
      params: { period },
    });
    return response.data;
  },

  recent: async (): Promise<Call[]> => {
    const response = await api.get<Call[]>("/calls/calls/recent/");
    return response.data;
  },
};

// Call Queues
export const callQueueApi = {
  list: async (): Promise<CallQueue[]> => {
    const response = await api.get<CallQueue[] | { results: CallQueue[] }>("/calls/queues/");
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<CallQueue> => {
    const response = await api.get<CallQueue>(`/calls/queues/${id}/`);
    return response.data;
  },

  create: async (data: Partial<CallQueue>): Promise<CallQueue> => {
    const response = await api.post<CallQueue>("/calls/queues/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CallQueue>): Promise<CallQueue> => {
    const response = await api.patch<CallQueue>(`/calls/queues/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/calls/queues/${id}/`);
  },

  addMember: async (
    id: string,
    userId: string,
    priority?: number
  ): Promise<CallQueueMember> => {
    const response = await api.post<CallQueueMember>(
      `/calls/queues/${id}/add_member/`,
      { user_id: userId, priority }
    );
    return response.data;
  },

  removeMember: async (id: string, userId: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      `/calls/queues/${id}/remove_member/`,
      { user_id: userId }
    );
    return response.data;
  },
};

// Queue Members
export const queueMemberApi = {
  list: async (params?: Record<string, string | boolean>): Promise<CallQueueMember[]> => {
    const response = await api.get<CallQueueMember[] | { results: CallQueueMember[] }>("/calls/queue-members/", {
      params,
    });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  pause: async (id: string, reason?: string): Promise<CallQueueMember> => {
    const response = await api.post<CallQueueMember>(
      `/calls/queue-members/${id}/pause/`,
      { reason }
    );
    return response.data;
  },

  unpause: async (id: string): Promise<CallQueueMember> => {
    const response = await api.post<CallQueueMember>(
      `/calls/queue-members/${id}/unpause/`
    );
    return response.data;
  },
};

// Voicemails
export const voicemailApi = {
  list: async (params?: Record<string, string>): Promise<Voicemail[]> => {
    const response = await api.get<Voicemail[] | { results: Voicemail[] }>("/calls/voicemails/", { params });
    // Handle both paginated and non-paginated responses
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<Voicemail> => {
    const response = await api.get<Voicemail>(`/calls/voicemails/${id}/`);
    return response.data;
  },

  markListened: async (id: string): Promise<Voicemail> => {
    const response = await api.post<Voicemail>(
      `/calls/voicemails/${id}/mark_listened/`
    );
    return response.data;
  },

  archive: async (id: string): Promise<Voicemail> => {
    const response = await api.post<Voicemail>(`/calls/voicemails/${id}/archive/`);
    return response.data;
  },

  newCount: async (): Promise<{ count: number }> => {
    const response = await api.get<{ count: number }>(
      "/calls/voicemails/new_count/"
    );
    return response.data;
  },
};

// Call Scripts
export const callScriptApi = {
  list: async (params?: Record<string, string | boolean>): Promise<CallScript[]> => {
    const response = await api.get<CallScript[] | { results: CallScript[] }>("/calls/scripts/", { params });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<CallScript> => {
    const response = await api.get<CallScript>(`/calls/scripts/${id}/`);
    return response.data;
  },

  create: async (data: Partial<CallScript>): Promise<CallScript> => {
    const response = await api.post<CallScript>("/calls/scripts/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CallScript>): Promise<CallScript> => {
    const response = await api.patch<CallScript>(`/calls/scripts/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/calls/scripts/${id}/`);
  },

  useScript: async (id: string, success?: boolean): Promise<CallScript> => {
    const response = await api.post<CallScript>(`/calls/scripts/${id}/use_script/`, {
      success,
    });
    return response.data;
  },
};

// Call Settings
export const callSettingsApi = {
  get: async (): Promise<CallSettings> => {
    const response = await api.get<CallSettings>("/calls/settings/");
    return response.data;
  },

  update: async (data: Partial<CallSettings>): Promise<CallSettings> => {
    const response = await api.patch<CallSettings>("/calls/settings/", data);
    return response.data;
  },
};
