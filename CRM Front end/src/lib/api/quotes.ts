import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { Quote, QuoteListItem } from "@/types";

export async function getQuotes(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<QuoteListItem>>("/quotes/", { params });
  return data;
}

export async function getQuote(id: string) {
  const { data } = await api.get<Quote>(`/quotes/${id}/`);
  return data;
}

export async function createQuote(payload: Record<string, unknown>) {
  const { data } = await api.post<Quote>("/quotes/", payload);
  return data;
}

export async function updateQuote(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<Quote>(`/quotes/${id}/`, payload);
  return data;
}

export async function deleteQuote(id: string) {
  await api.delete(`/quotes/${id}/`);
}

export async function sendQuote(id: string) {
  const { data } = await api.post<Quote>(`/quotes/${id}/send/`);
  return data;
}

export async function acceptQuote(id: string) {
  const { data } = await api.post<Quote>(`/quotes/${id}/accept/`);
  return data;
}

export async function rejectQuote(id: string) {
  const { data } = await api.post<Quote>(`/quotes/${id}/reject/`);
  return data;
}
