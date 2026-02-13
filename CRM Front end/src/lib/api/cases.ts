import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { TaxCase, TaxCaseListItem, TaxCaseNote } from "@/types";

export async function getCases(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<TaxCaseListItem>>("/cases/", { params });
  return data;
}

export async function getCase(id: string) {
  const { data } = await api.get<TaxCase>(`/cases/${id}/`);
  return data;
}

export async function createCase(payload: Record<string, unknown>) {
  const { data } = await api.post<TaxCase>("/cases/", payload);
  return data;
}

export async function updateCase(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<TaxCase>(`/cases/${id}/`, payload);
  return data;
}

export async function deleteCase(id: string) {
  await api.delete(`/cases/${id}/`);
}

export async function transitionCase(id: string, status: string) {
  const { data } = await api.post<TaxCase>(`/cases/${id}/transition/`, { status });
  return data;
}

export async function getCaseNotes(id: string) {
  const { data } = await api.get<TaxCaseNote[]>(`/cases/${id}/notes/`);
  return data;
}

export async function addCaseNote(id: string, payload: { content: string; is_internal: boolean }) {
  const { data } = await api.post<TaxCaseNote>(`/cases/${id}/notes/`, payload);
  return data;
}
