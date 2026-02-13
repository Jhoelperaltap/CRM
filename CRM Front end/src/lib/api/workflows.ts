import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { WorkflowRule, WorkflowExecutionLog } from "@/types/workflows";

export async function getWorkflowRules(
  params?: Record<string, string>
): Promise<PaginatedResponse<WorkflowRule>> {
  const { data } = await api.get("/settings/workflows/", { params });
  return data;
}

export async function getWorkflowRule(id: string): Promise<WorkflowRule> {
  const { data } = await api.get(`/settings/workflows/${id}/`);
  return data;
}

export async function createWorkflowRule(
  payload: Partial<WorkflowRule>
): Promise<WorkflowRule> {
  const { data } = await api.post("/settings/workflows/", payload);
  return data;
}

export async function updateWorkflowRule(
  id: string,
  payload: Partial<WorkflowRule>
): Promise<WorkflowRule> {
  const { data } = await api.patch(`/settings/workflows/${id}/`, payload);
  return data;
}

export async function deleteWorkflowRule(id: string): Promise<void> {
  await api.delete(`/settings/workflows/${id}/`);
}

export async function getWorkflowLogs(
  params?: Record<string, string>
): Promise<PaginatedResponse<WorkflowExecutionLog>> {
  const { data } = await api.get("/settings/workflow-logs/", { params });
  return data;
}
