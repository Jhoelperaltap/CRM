/**
 * API client for Contact Tags
 */

import api from "../api";
import type {
  ContactTag,
  ContactTagAssignment,
  CreateTagPayload,
  BulkAssignPayload,
} from "@/types/contact-tags";
import type { PaginatedResponse } from "@/types/api";

// Tags API
export async function getContactTags(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ContactTag>>("/contacts/tags/", { params });
  return data;
}

export async function getContactTag(id: string) {
  const { data } = await api.get<ContactTag>(`/contacts/tags/${id}/`);
  return data;
}

export async function createContactTag(payload: CreateTagPayload) {
  const { data } = await api.post<ContactTag>("/contacts/tags/", payload);
  return data;
}

export async function updateContactTag(id: string, payload: Partial<CreateTagPayload>) {
  const { data } = await api.patch<ContactTag>(`/contacts/tags/${id}/`, payload);
  return data;
}

export async function deleteContactTag(id: string) {
  await api.delete(`/contacts/tags/${id}/`);
}

// Tag Assignments API
export async function getTagAssignments(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ContactTagAssignment>>(
    "/contacts/tag-assignments/",
    { params }
  );
  return data;
}

export async function assignTag(contactId: string, tagId: string) {
  const { data } = await api.post<ContactTagAssignment>("/contacts/tag-assignments/", {
    contact: contactId,
    tag: tagId,
  });
  return data;
}

export async function removeTagAssignment(assignmentId: string) {
  await api.delete(`/contacts/tag-assignments/${assignmentId}/`);
}

export async function bulkAssignTags(payload: BulkAssignPayload) {
  const { data } = await api.post<{ created: number }>(
    "/contacts/tag-assignments/bulk-assign/",
    payload
  );
  return data;
}

export async function bulkRemoveTags(payload: BulkAssignPayload) {
  const { data } = await api.post<{ deleted: number }>(
    "/contacts/tag-assignments/bulk-remove/",
    payload
  );
  return data;
}
