import api from "@/lib/api";
import type {
  Playbook,
  PlaybookStep,
  PlaybookExecution,
  PlaybookStepExecution,
  PlaybookTemplate,
  StartPlaybookRequest,
  CompleteStepRequest,
  PlaybookStats,
} from "@/types/playbooks";

// Playbooks
export const playbookApi = {
  list: async (params?: Record<string, string | boolean>): Promise<Playbook[]> => {
    const response = await api.get<Playbook[] | { results: Playbook[] }>("/playbooks/playbooks/", {
      params,
    });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<Playbook> => {
    const response = await api.get<Playbook>(`/playbooks/playbooks/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Playbook>): Promise<Playbook> => {
    const response = await api.post<Playbook>("/playbooks/playbooks/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Playbook>): Promise<Playbook> => {
    const response = await api.patch<Playbook>(`/playbooks/playbooks/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/playbooks/playbooks/${id}/`);
  },

  duplicate: async (id: string): Promise<Playbook> => {
    const response = await api.post<Playbook>(
      `/playbooks/playbooks/${id}/duplicate/`
    );
    return response.data;
  },

  start: async (id: string, data: Omit<StartPlaybookRequest, "playbook_id">): Promise<PlaybookExecution> => {
    const response = await api.post<PlaybookExecution>(
      `/playbooks/playbooks/${id}/start/`,
      data
    );
    return response.data;
  },

  stats: async (): Promise<PlaybookStats> => {
    const response = await api.get<PlaybookStats>("/playbooks/playbooks/stats/");
    return response.data;
  },
};

// Playbook Steps
export const playbookStepApi = {
  list: async (playbookId?: string): Promise<PlaybookStep[]> => {
    const params = playbookId ? { playbook: playbookId } : {};
    const response = await api.get<PlaybookStep[] | { results: PlaybookStep[] }>("/playbooks/steps/", { params });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<PlaybookStep> => {
    const response = await api.get<PlaybookStep>(`/playbooks/steps/${id}/`);
    return response.data;
  },

  create: async (data: Partial<PlaybookStep>): Promise<PlaybookStep> => {
    const response = await api.post<PlaybookStep>("/playbooks/steps/", data);
    return response.data;
  },

  update: async (id: string, data: Partial<PlaybookStep>): Promise<PlaybookStep> => {
    const response = await api.patch<PlaybookStep>(`/playbooks/steps/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/playbooks/steps/${id}/`);
  },

  reorder: async (id: string, order: number): Promise<PlaybookStep> => {
    const response = await api.post<PlaybookStep>(
      `/playbooks/steps/${id}/reorder/`,
      { order }
    );
    return response.data;
  },
};

// Playbook Executions
export const playbookExecutionApi = {
  list: async (params?: Record<string, string>): Promise<PlaybookExecution[]> => {
    const response = await api.get<PlaybookExecution[] | { results: PlaybookExecution[] }>("/playbooks/executions/", {
      params,
    });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<PlaybookExecution> => {
    const response = await api.get<PlaybookExecution>(
      `/playbooks/executions/${id}/`
    );
    return response.data;
  },

  pause: async (id: string): Promise<PlaybookExecution> => {
    const response = await api.post<PlaybookExecution>(
      `/playbooks/executions/${id}/pause/`
    );
    return response.data;
  },

  resume: async (id: string): Promise<PlaybookExecution> => {
    const response = await api.post<PlaybookExecution>(
      `/playbooks/executions/${id}/resume/`
    );
    return response.data;
  },

  abandon: async (id: string, reason?: string): Promise<PlaybookExecution> => {
    const response = await api.post<PlaybookExecution>(
      `/playbooks/executions/${id}/abandon/`,
      { reason }
    );
    return response.data;
  },

  complete: async (
    id: string,
    data?: { outcome?: string; outcome_notes?: string }
  ): Promise<PlaybookExecution> => {
    const response = await api.post<PlaybookExecution>(
      `/playbooks/executions/${id}/complete/`,
      data
    );
    return response.data;
  },

  myExecutions: async (): Promise<PlaybookExecution[]> => {
    const response = await api.get<PlaybookExecution[]>(
      "/playbooks/executions/my_executions/"
    );
    return response.data;
  },

  overdue: async (): Promise<PlaybookExecution[]> => {
    const response = await api.get<PlaybookExecution[]>(
      "/playbooks/executions/overdue/"
    );
    return response.data;
  },
};

// Step Executions
export const stepExecutionApi = {
  list: async (executionId?: string): Promise<PlaybookStepExecution[]> => {
    const params = executionId ? { execution: executionId } : {};
    const response = await api.get<PlaybookStepExecution[] | { results: PlaybookStepExecution[] }>(
      "/playbooks/step-executions/",
      { params }
    );
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<PlaybookStepExecution> => {
    const response = await api.get<PlaybookStepExecution>(
      `/playbooks/step-executions/${id}/`
    );
    return response.data;
  },

  start: async (id: string): Promise<PlaybookStepExecution> => {
    const response = await api.post<PlaybookStepExecution>(
      `/playbooks/step-executions/${id}/start/`
    );
    return response.data;
  },

  complete: async (
    id: string,
    data?: CompleteStepRequest
  ): Promise<PlaybookStepExecution> => {
    const response = await api.post<PlaybookStepExecution>(
      `/playbooks/step-executions/${id}/complete/`,
      data
    );
    return response.data;
  },
};

// Playbook Templates
export const playbookTemplateApi = {
  list: async (params?: Record<string, string | boolean>): Promise<PlaybookTemplate[]> => {
    const response = await api.get<PlaybookTemplate[] | { results: PlaybookTemplate[] }>("/playbooks/templates/", {
      params,
    });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<PlaybookTemplate> => {
    const response = await api.get<PlaybookTemplate>(
      `/playbooks/templates/${id}/`
    );
    return response.data;
  },

  create: async (data: Partial<PlaybookTemplate>): Promise<PlaybookTemplate> => {
    const response = await api.post<PlaybookTemplate>(
      "/playbooks/templates/",
      data
    );
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<PlaybookTemplate>
  ): Promise<PlaybookTemplate> => {
    const response = await api.patch<PlaybookTemplate>(
      `/playbooks/templates/${id}/`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/playbooks/templates/${id}/`);
  },

  createPlaybook: async (id: string): Promise<Playbook> => {
    const response = await api.post<Playbook>(
      `/playbooks/templates/${id}/create_playbook/`
    );
    return response.data;
  },

  rate: async (id: string, rating: number): Promise<PlaybookTemplate> => {
    const response = await api.post<PlaybookTemplate>(
      `/playbooks/templates/${id}/rate/`,
      { rating }
    );
    return response.data;
  },
};
