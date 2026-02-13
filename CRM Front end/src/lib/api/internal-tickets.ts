import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { InternalTicket, InternalTicketListItem } from "@/types";

export async function getInternalTickets(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<InternalTicketListItem>>(
    "/internal-tickets/",
    { params }
  );
  return data;
}

export async function getInternalTicket(id: string) {
  const { data } = await api.get<InternalTicket>(`/internal-tickets/${id}/`);
  return data;
}

export async function createInternalTicket(payload: Record<string, unknown>) {
  const { data } = await api.post<InternalTicket>("/internal-tickets/", payload);
  return data;
}

export async function updateInternalTicket(
  id: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<InternalTicket>(
    `/internal-tickets/${id}/`,
    payload
  );
  return data;
}

export async function deleteInternalTicket(id: string) {
  await api.delete(`/internal-tickets/${id}/`);
}
