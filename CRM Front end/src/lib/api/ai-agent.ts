/**
 * API functions for the AI Agent system.
 */

import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  AgentConfiguration,
  AgentConfigurationUpdate,
  AgentAction,
  AgentActionListItem,
  AgentLog,
  AgentInsight,
  AgentInsightListItem,
  AgentMetrics,
  AgentStatus,
  PerformanceSummary,
  LearningProgress,
  Recommendation,
  TrendDataPoint,
  ApproveActionPayload,
  RejectActionPayload,
  RecordOutcomePayload,
  AcknowledgeInsightPayload,
  RunCycleResponse,
  BackupWorkloadResponse,
  BackupAnalysisResponse,
} from "@/types/ai-agent";

const BASE_URL = "/ai-agent";

// =====================
// Configuration
// =====================

export async function getConfiguration(): Promise<AgentConfiguration> {
  const { data } = await api.get<AgentConfiguration>(`${BASE_URL}/config/`);
  return data;
}

export async function updateConfiguration(
  payload: AgentConfigurationUpdate
): Promise<AgentConfiguration> {
  const { data } = await api.patch<AgentConfiguration>(`${BASE_URL}/config/`, payload);
  return data;
}

export async function toggleAgent(): Promise<{ is_active: boolean; message: string }> {
  const { data } = await api.post<{ is_active: boolean; message: string }>(
    `${BASE_URL}/config/toggle/`
  );
  return data;
}

// =====================
// Status
// =====================

export async function getStatus(): Promise<AgentStatus> {
  const { data } = await api.get<AgentStatus>(`${BASE_URL}/status/`);
  return data;
}

// =====================
// Actions
// =====================

export async function getActions(
  params?: Record<string, string>
): Promise<PaginatedResponse<AgentActionListItem>> {
  const { data } = await api.get<PaginatedResponse<AgentActionListItem>>(
    `${BASE_URL}/actions/`,
    { params }
  );
  return data;
}

export async function getPendingActions(
  params?: Record<string, string>
): Promise<PaginatedResponse<AgentActionListItem>> {
  const { data } = await api.get<PaginatedResponse<AgentActionListItem>>(
    `${BASE_URL}/actions/pending/`,
    { params }
  );
  return data;
}

export async function getAction(id: string): Promise<AgentAction> {
  const { data } = await api.get<AgentAction>(`${BASE_URL}/actions/${id}/`);
  return data;
}

export async function approveAction(
  id: string,
  payload?: ApproveActionPayload
): Promise<AgentAction> {
  const { data } = await api.post<AgentAction>(
    `${BASE_URL}/actions/${id}/approve/`,
    payload || {}
  );
  return data;
}

export async function rejectAction(
  id: string,
  payload?: RejectActionPayload
): Promise<AgentAction> {
  const { data } = await api.post<AgentAction>(
    `${BASE_URL}/actions/${id}/reject/`,
    payload || {}
  );
  return data;
}

export async function recordOutcome(
  id: string,
  payload: RecordOutcomePayload
): Promise<AgentAction> {
  const { data } = await api.post<AgentAction>(
    `${BASE_URL}/actions/${id}/outcome/`,
    payload
  );
  return data;
}

// =====================
// Logs
// =====================

export async function getLogs(
  params?: Record<string, string>
): Promise<PaginatedResponse<AgentLog>> {
  const { data } = await api.get<PaginatedResponse<AgentLog>>(
    `${BASE_URL}/logs/`,
    { params }
  );
  return data;
}

export async function exportLogs(params?: Record<string, string>): Promise<Blob> {
  const { data } = await api.get<Blob>(`${BASE_URL}/logs/export/`, {
    params,
    responseType: "blob",
  });
  return data;
}

// =====================
// Insights
// =====================

export async function getInsights(
  params?: Record<string, string>
): Promise<PaginatedResponse<AgentInsightListItem>> {
  const { data } = await api.get<PaginatedResponse<AgentInsightListItem>>(
    `${BASE_URL}/insights/`,
    { params }
  );
  return data;
}

export async function getUnacknowledgedInsights(
  params?: Record<string, string>
): Promise<PaginatedResponse<AgentInsightListItem>> {
  const { data } = await api.get<PaginatedResponse<AgentInsightListItem>>(
    `${BASE_URL}/insights/unacknowledged/`,
    { params }
  );
  return data;
}

export async function getInsight(id: string): Promise<AgentInsight> {
  const { data } = await api.get<AgentInsight>(`${BASE_URL}/insights/${id}/`);
  return data;
}

export async function acknowledgeInsight(
  id: string,
  payload?: AcknowledgeInsightPayload
): Promise<AgentInsight> {
  const { data } = await api.post<AgentInsight>(
    `${BASE_URL}/insights/${id}/acknowledge/`,
    payload || {}
  );
  return data;
}

// =====================
// Metrics & Analytics
// =====================

export async function getMetrics(
  params?: Record<string, string>
): Promise<PaginatedResponse<AgentMetrics>> {
  const { data } = await api.get<PaginatedResponse<AgentMetrics>>(
    `${BASE_URL}/metrics/`,
    { params }
  );
  return data;
}

export async function getPerformanceSummary(days?: number): Promise<PerformanceSummary> {
  const params = days ? { days: String(days) } : undefined;
  const { data } = await api.get<PerformanceSummary>(
    `${BASE_URL}/metrics/summary/`,
    { params }
  );
  return data;
}

export async function getLearningProgress(): Promise<LearningProgress> {
  const { data } = await api.get<LearningProgress>(`${BASE_URL}/metrics/learning/`);
  return data;
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const { data } = await api.get<Recommendation[]>(`${BASE_URL}/metrics/recommendations/`);
  return data;
}

export async function getTrends(days?: number): Promise<TrendDataPoint[]> {
  const params = days ? { days: String(days) } : undefined;
  const { data } = await api.get<TrendDataPoint[]>(
    `${BASE_URL}/metrics/trends/`,
    { params }
  );
  return data;
}

// =====================
// Manual Triggers
// =====================

export async function runAgentCycle(runAsync = true): Promise<RunCycleResponse> {
  const { data } = await api.post<RunCycleResponse>(`${BASE_URL}/run-cycle/`, {
    async: runAsync,
  });
  return data;
}

export async function runMarketAnalysis(runAsync = true): Promise<RunCycleResponse> {
  const { data } = await api.post<RunCycleResponse>(`${BASE_URL}/run-analysis/`, {
    async: runAsync,
  });
  return data;
}

// =====================
// Backup Automation
// =====================

export async function getBackupWorkload(): Promise<BackupWorkloadResponse> {
  const { data } = await api.get<BackupWorkloadResponse>(`${BASE_URL}/backup/workload/`);
  return data;
}

export async function runBackupAnalysis(createBackup = false): Promise<BackupAnalysisResponse> {
  const { data } = await api.post<BackupAnalysisResponse>(`${BASE_URL}/backup/analyze/`, {
    create_backup: createBackup,
  });
  return data;
}
