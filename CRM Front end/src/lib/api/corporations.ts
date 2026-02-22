import api from "@/lib/api";
import type { PaginatedResponse, ImportResponse } from "@/types/api";
import type { Corporation, CorporationListItem } from "@/types";

export type ClientStatus = "active" | "payment_pending" | "paid" | "paused" | "business_closed";

export interface ClientStatusChangePayload {
  client_status: ClientStatus;
  closure_reason?: string;
  pause_reason?: string;
}

export async function getCorporations(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<CorporationListItem>>("/corporations/", { params });
  return data;
}

export async function getCorporation(id: string) {
  const { data } = await api.get<Corporation>(`/corporations/${id}/`);
  return data;
}

export async function createCorporation(payload: Record<string, unknown>) {
  const { data } = await api.post<Corporation>("/corporations/", payload);
  return data;
}

export async function updateCorporation(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<Corporation>(`/corporations/${id}/`, payload);
  return data;
}

export async function deleteCorporation(id: string) {
  await api.delete(`/corporations/${id}/`);
}

export async function importCorporationsCsv(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ImportResponse>("/corporations/import_csv/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function changeClientStatus(id: string, payload: ClientStatusChangePayload) {
  const { data } = await api.post<Corporation>(`/corporations/${id}/change-client-status/`, payload);
  return data;
}

export async function logCorporationAccess(id: string) {
  const { data } = await api.post<{ detail: string }>(`/corporations/${id}/log-access/`);
  return data;
}
