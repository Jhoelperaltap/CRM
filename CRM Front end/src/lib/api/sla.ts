import api from "@/lib/api";
import {
  SLA,
  SLAList,
  SLAFormData,
  EscalationRule,
  EscalationRuleFormData,
  SLABreach,
  CaseSLAStatus,
  SLAMetrics,
  SLADashboard,
} from "@/types/sla";

// SLA endpoints
export const slaApi = {
  // List all SLAs
  list: async (params?: { is_active?: boolean }): Promise<SLAList[]> => {
    const response = await api.get("/sla/slas/", { params });
    return response.data.results || response.data;
  },

  // Get single SLA
  get: async (id: string): Promise<SLA> => {
    const response = await api.get(`/sla/slas/${id}/`);
    return response.data;
  },

  // Create SLA
  create: async (data: SLAFormData): Promise<SLA> => {
    const response = await api.post("/sla/slas/", data);
    return response.data;
  },

  // Update SLA
  update: async (id: string, data: Partial<SLAFormData>): Promise<SLA> => {
    const response = await api.patch(`/sla/slas/${id}/`, data);
    return response.data;
  },

  // Delete SLA
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sla/slas/${id}/`);
  },

  // Set SLA as default
  setDefault: async (id: string): Promise<void> => {
    await api.post(`/sla/slas/${id}/set_default/`);
  },

  // Get escalation rules for SLA
  getEscalationRules: async (id: string): Promise<EscalationRule[]> => {
    const response = await api.get(`/sla/slas/${id}/escalation_rules/`);
    return response.data;
  },
};

// Escalation Rule endpoints
export const escalationRuleApi = {
  // List all escalation rules
  list: async (params?: { sla?: string }): Promise<EscalationRule[]> => {
    const response = await api.get("/sla/escalation-rules/", { params });
    return response.data.results || response.data;
  },

  // Get single escalation rule
  get: async (id: string): Promise<EscalationRule> => {
    const response = await api.get(`/sla/escalation-rules/${id}/`);
    return response.data;
  },

  // Create escalation rule
  create: async (data: EscalationRuleFormData): Promise<EscalationRule> => {
    const response = await api.post("/sla/escalation-rules/", data);
    return response.data;
  },

  // Update escalation rule
  update: async (
    id: string,
    data: Partial<EscalationRuleFormData>
  ): Promise<EscalationRule> => {
    const response = await api.patch(`/sla/escalation-rules/${id}/`, data);
    return response.data;
  },

  // Delete escalation rule
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sla/escalation-rules/${id}/`);
  },

  // Reorder escalation rule
  reorder: async (id: string, order: number): Promise<void> => {
    await api.post(`/sla/escalation-rules/${id}/reorder/`, { order });
  },
};

// SLA Breach endpoints
export const slaBreachApi = {
  // List all breaches
  list: async (params?: {
    breach_type?: "response" | "resolution";
    is_resolved?: boolean;
    assigned_to?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SLABreach[]> => {
    const response = await api.get("/sla/breaches/", { params });
    return response.data.results || response.data;
  },

  // Get single breach
  get: async (id: string): Promise<SLABreach> => {
    const response = await api.get(`/sla/breaches/${id}/`);
    return response.data;
  },

  // Acknowledge breach
  acknowledge: async (id: string): Promise<void> => {
    await api.post(`/sla/breaches/${id}/acknowledge/`);
  },

  // Resolve breach
  resolve: async (id: string, notes?: string): Promise<void> => {
    await api.post(`/sla/breaches/${id}/resolve/`, { notes });
  },
};

// Case SLA Status endpoints
export const caseSlaStatusApi = {
  // List all case SLA statuses
  list: async (params?: {
    response_status?: string;
    resolution_status?: string;
    breached?: boolean;
    is_paused?: boolean;
  }): Promise<CaseSLAStatus[]> => {
    const response = await api.get("/sla/case-status/", { params });
    return response.data.results || response.data;
  },

  // Get single case SLA status
  get: async (id: string): Promise<CaseSLAStatus> => {
    const response = await api.get(`/sla/case-status/${id}/`);
    return response.data;
  },

  // Pause SLA tracking
  pause: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/sla/case-status/${id}/pause/`, { reason });
  },

  // Resume SLA tracking
  resume: async (id: string): Promise<void> => {
    await api.post(`/sla/case-status/${id}/resume/`);
  },

  // Refresh SLA status
  refresh: async (id: string): Promise<CaseSLAStatus> => {
    const response = await api.get(`/sla/case-status/${id}/refresh/`);
    return response.data;
  },
};

// SLA Metrics endpoints
export const slaMetricsApi = {
  // Get SLA metrics
  get: async (params?: {
    start_date?: string;
    end_date?: string;
    assigned_to?: string;
  }): Promise<SLAMetrics> => {
    const response = await api.get("/sla/metrics/", { params });
    return response.data;
  },
};

// SLA Dashboard endpoints
export const slaDashboardApi = {
  // Get dashboard data
  get: async (): Promise<SLADashboard> => {
    const response = await api.get("/sla/dashboard/");
    return response.data;
  },
};
