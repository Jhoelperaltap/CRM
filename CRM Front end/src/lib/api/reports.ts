import api from "@/lib/api";
import type {
  RevenueReport,
  CaseReport,
  PreparerPerformance,
  ContactAcquisition,
  ReportListItem,
  ReportDetail,
  ReportCreatePayload,
  ReportFolder,
  ModuleField,
  ReportRunResult,
} from "@/types/reports";

/* ── Built-in analytics reports (dashboard) ─────────────────────── */

export async function getRevenueReport(params?: Record<string, string>) {
  const { data } = await api.get<RevenueReport>("/reports/analytics/revenue/", { params });
  return data;
}

export async function getCaseReport(params?: Record<string, string>) {
  const { data } = await api.get<CaseReport>("/reports/analytics/cases/", { params });
  return data;
}

export async function getPreparerReport(params?: Record<string, string>) {
  const { data } = await api.get<PreparerPerformance[]>("/reports/analytics/preparers/", { params });
  return data;
}

export async function getContactReport(params?: Record<string, string>) {
  const { data } = await api.get<ContactAcquisition>("/reports/analytics/contacts/", { params });
  return data;
}

export function downloadReportCSV(endpoint: string, params?: Record<string, string>) {
  const searchParams = new URLSearchParams({ ...params, format: "csv" });
  const baseURL = api.defaults.baseURL || "";
  window.open(`${baseURL}/reports/analytics/${endpoint}/?${searchParams.toString()}`, "_blank");
}

/* ── User-defined reports CRUD ──────────────────────────────────── */

export async function getReports(params?: Record<string, string>): Promise<ReportListItem[]> {
  const { data } = await api.get<ReportListItem[]>("/reports/", { params });
  return data;
}

export async function getReport(id: string): Promise<ReportDetail> {
  const { data } = await api.get<ReportDetail>(`/reports/${id}/`);
  return data;
}

export async function createReport(payload: ReportCreatePayload): Promise<ReportDetail> {
  const { data } = await api.post<ReportDetail>("/reports/", payload);
  return data;
}

export async function updateReport(id: string, payload: Partial<ReportCreatePayload>): Promise<ReportDetail> {
  const { data } = await api.patch<ReportDetail>(`/reports/${id}/`, payload);
  return data;
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/reports/${id}/`);
}

export async function runReport(id: string, page = 1, pageSize = 50): Promise<ReportRunResult> {
  const { data } = await api.get<ReportRunResult>(`/reports/${id}/run/`, {
    params: { page, page_size: pageSize },
  });
  return data;
}

/* ── Report folders ─────────────────────────────────────────────── */

export async function getReportFolders(): Promise<ReportFolder[]> {
  const { data } = await api.get<ReportFolder[]>("/reports/folders/");
  return data;
}

export async function createReportFolder(payload: { name: string; description?: string }): Promise<ReportFolder> {
  const { data } = await api.post<ReportFolder>("/reports/folders/", payload);
  return data;
}

export async function updateReportFolder(id: string, payload: { name: string; description?: string }): Promise<ReportFolder> {
  const { data } = await api.patch<ReportFolder>(`/reports/folders/${id}/`, payload);
  return data;
}

export async function deleteReportFolder(id: string): Promise<void> {
  await api.delete(`/reports/folders/${id}/`);
}

/* ── Module fields (for report builder) ─────────────────────────── */

export async function getModuleFields(module: string): Promise<ModuleField[]> {
  const { data } = await api.get<ModuleField[]>("/reports/module-fields/", {
    params: { module },
  });
  return data;
}
