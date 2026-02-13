import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  ChecklistTemplate,
  ChecklistTemplateItem,
  ChecklistTemplateListItem,
  CaseChecklist,
  CaseChecklistItem,
} from "@/types/checklists";

// --- Checklist Templates (admin) ---

export async function getChecklistTemplates(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ChecklistTemplateListItem>>(
    "/settings/checklist-templates/",
    { params }
  );
  return data;
}

export async function getChecklistTemplate(id: string) {
  const { data } = await api.get<ChecklistTemplate>(
    `/settings/checklist-templates/${id}/`
  );
  return data;
}

export async function createChecklistTemplate(
  payload: Record<string, unknown>
) {
  const { data } = await api.post<ChecklistTemplate>(
    "/settings/checklist-templates/",
    payload
  );
  return data;
}

export async function updateChecklistTemplate(
  id: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<ChecklistTemplate>(
    `/settings/checklist-templates/${id}/`,
    payload
  );
  return data;
}

export async function deleteChecklistTemplate(id: string) {
  await api.delete(`/settings/checklist-templates/${id}/`);
}

// --- Template Items ---

export async function getTemplateItems(templateId: string) {
  const { data } = await api.get<ChecklistTemplateItem[]>(
    `/settings/checklist-templates/${templateId}/items/`
  );
  return data;
}

export async function addTemplateItem(
  templateId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.post<ChecklistTemplateItem>(
    `/settings/checklist-templates/${templateId}/items/`,
    payload
  );
  return data;
}

export async function updateTemplateItem(
  templateId: string,
  itemId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<ChecklistTemplateItem>(
    `/settings/checklist-templates/${templateId}/items/${itemId}/`,
    payload
  );
  return data;
}

export async function deleteTemplateItem(templateId: string, itemId: string) {
  await api.delete(
    `/settings/checklist-templates/${templateId}/items/${itemId}/`
  );
}

// --- Case Checklist ---

export async function getCaseChecklist(caseId: string) {
  const { data } = await api.get<CaseChecklist>(
    `/cases/${caseId}/checklist/`
  );
  return data;
}

export async function toggleChecklistItem(caseId: string, itemId: string) {
  const { data } = await api.post<CaseChecklistItem>(
    `/cases/${caseId}/checklist/items/${itemId}/toggle/`
  );
  return data;
}
