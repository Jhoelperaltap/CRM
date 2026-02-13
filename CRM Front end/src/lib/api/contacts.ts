import api from "@/lib/api";
import type { PaginatedResponse, ImportResponse } from "@/types/api";
import type { Contact, ContactListItem } from "@/types";

export async function getContacts(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ContactListItem>>("/contacts/", { params });
  return data;
}

export async function getContact(id: string) {
  const { data } = await api.get<Contact>(`/contacts/${id}/`);
  return data;
}

export async function createContact(payload: Record<string, unknown>) {
  const { data } = await api.post<Contact>("/contacts/", payload);
  return data;
}

export async function updateContact(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<Contact>(`/contacts/${id}/`, payload);
  return data;
}

export async function deleteContact(id: string) {
  await api.delete(`/contacts/${id}/`);
}

export async function toggleStar(id: string) {
  const { data } = await api.post<{ starred: boolean }>(`/contacts/${id}/star/`);
  return data;
}

export async function importContactsCsv(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ImportResponse>("/contacts/import_csv/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export function getContactsExportUrl() {
  return `${api.defaults.baseURL}/contacts/export_csv/`;
}

// Client Portal Messages
export interface ClientMessage {
  id: string;
  contact: string;
  contact_name: string;
  case: string | null;
  message_type: "client_to_staff" | "staff_to_client";
  subject: string;
  body: string;
  sender_user: string | null;
  sender_name: string | null;
  parent_message: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getClientMessages(contactId: string, params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ClientMessage>>(
    `/contacts/${contactId}/client-messages/`,
    { params }
  );
  return data;
}

export async function sendClientMessage(
  contactId: string,
  payload: { subject: string; body: string; case?: string }
) {
  const { data } = await api.post<ClientMessage>(
    `/contacts/${contactId}/send-client-message/`,
    payload
  );
  return data;
}
