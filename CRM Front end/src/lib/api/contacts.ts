import api from "@/lib/api";
import type { PaginatedResponse, ImportResponse } from "@/types/api";
import type { Contact, ContactListItem } from "@/types";

export async function getContacts(params?: Record<string, string>) {
  // When searching, include related contacts (same corporation, reports_to)
  const finalParams = { ...params };
  if (params?.search && params.search.length >= 2) {
    finalParams.include_related = "true";
  }
  const { data } = await api.get<PaginatedResponse<ContactListItem>>("/contacts/", { params: finalParams });
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

// Wizard Create (Light Mode)
export interface WizardContactData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string | null;
  ssn_last_four?: string;
  priority?: string;
  registered_agent?: boolean;
  mailing_street?: string;
  email?: string;
  phone?: string;
  office_services?: string;
  description?: string;
  sensitive_info?: string;
}

export interface WizardRelationshipData {
  first_name: string;
  last_name: string;
  email?: string;
  mailing_street?: string;
  date_of_birth?: string | null;
  ssn_last_four?: string;
  relationship_type?: string;
}

export interface WizardCorporationData {
  name: string;
  date_incorporated?: string | null;
  state_id?: string;
  dot_number?: string;
  ein?: string;
  entity_type?: string;
  fiscal_year_end?: string;
  industry?: string;
  billing_street?: string;
  description?: string;
}

export interface WizardCreatePayload {
  contact: WizardContactData;
  relationship?: WizardRelationshipData | null;
  corporations?: WizardCorporationData[];
}

export async function wizardCreateContact(payload: WizardCreatePayload) {
  const { data } = await api.post<Contact>("/contacts/wizard-create/", payload);
  return data;
}
