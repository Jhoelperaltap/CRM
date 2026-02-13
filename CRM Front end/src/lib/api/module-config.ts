import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  CRMModule,
  CustomField,
  Picklist,
  PicklistValue,
  FieldLabel,
} from "@/types/index";

// --- Modules ---

export async function getModules(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<CRMModule>>(
    "/module-config/modules/",
    { params }
  );
  return data;
}

export async function getModule(id: string) {
  const { data } = await api.get<CRMModule>(`/module-config/modules/${id}/`);
  return data;
}

export async function updateModule(
  id: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<CRMModule>(
    `/module-config/modules/${id}/`,
    payload
  );
  return data;
}

export async function toggleModule(id: string) {
  const { data } = await api.post<CRMModule>(
    `/module-config/modules/${id}/toggle-active/`
  );
  return data;
}

export async function resetModuleNumbering(id: string) {
  const { data } = await api.post<CRMModule>(
    `/module-config/modules/${id}/reset-numbering/`
  );
  return data;
}

// --- Custom Fields ---

export async function getCustomFields(moduleId: string) {
  const { data } = await api.get<CustomField[]>(
    `/module-config/modules/${moduleId}/fields/`
  );
  return data;
}

export async function createCustomField(
  moduleId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.post<CustomField>(
    `/module-config/modules/${moduleId}/fields/`,
    payload
  );
  return data;
}

export async function updateCustomField(
  moduleId: string,
  fieldId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<CustomField>(
    `/module-config/modules/${moduleId}/fields/${fieldId}/`,
    payload
  );
  return data;
}

export async function deleteCustomField(moduleId: string, fieldId: string) {
  await api.delete(`/module-config/modules/${moduleId}/fields/${fieldId}/`);
}

export async function reorderCustomFields(
  moduleId: string,
  fieldIds: string[]
) {
  const { data } = await api.post(
    `/module-config/modules/${moduleId}/fields/reorder/`,
    { field_ids: fieldIds }
  );
  return data;
}

// --- Picklists ---

export async function getPicklists(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<Picklist>>(
    "/module-config/picklists/",
    { params }
  );
  return data;
}

export async function getPicklist(id: string) {
  const { data } = await api.get<Picklist>(
    `/module-config/picklists/${id}/`
  );
  return data;
}

export async function createPicklist(payload: Record<string, unknown>) {
  const { data } = await api.post<Picklist>(
    "/module-config/picklists/",
    payload
  );
  return data;
}

export async function updatePicklist(
  id: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<Picklist>(
    `/module-config/picklists/${id}/`,
    payload
  );
  return data;
}

export async function deletePicklist(id: string) {
  await api.delete(`/module-config/picklists/${id}/`);
}

export async function reorderPicklistValues(
  picklistId: string,
  valueIds: string[]
) {
  const { data } = await api.post(
    `/module-config/picklists/${picklistId}/reorder-values/`,
    { value_ids: valueIds }
  );
  return data;
}

// --- Picklist Values ---

export async function getPicklistValues(picklistId: string) {
  const { data } = await api.get<PicklistValue[]>(
    `/module-config/picklists/${picklistId}/values/`
  );
  return data;
}

export async function createPicklistValue(
  picklistId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.post<PicklistValue>(
    `/module-config/picklists/${picklistId}/values/`,
    payload
  );
  return data;
}

export async function updatePicklistValue(
  picklistId: string,
  valueId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<PicklistValue>(
    `/module-config/picklists/${picklistId}/values/${valueId}/`,
    payload
  );
  return data;
}

export async function deletePicklistValue(
  picklistId: string,
  valueId: string
) {
  await api.delete(
    `/module-config/picklists/${picklistId}/values/${valueId}/`
  );
}

// --- Field Labels ---

export async function getFieldLabels(moduleId: string) {
  const { data } = await api.get<FieldLabel[]>(
    `/module-config/modules/${moduleId}/labels/`
  );
  return data;
}

export async function saveFieldLabel(
  moduleId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.post<FieldLabel>(
    `/module-config/modules/${moduleId}/labels/`,
    payload
  );
  return data;
}

export async function updateFieldLabel(
  moduleId: string,
  labelId: string,
  payload: Record<string, unknown>
) {
  const { data } = await api.patch<FieldLabel>(
    `/module-config/modules/${moduleId}/labels/${labelId}/`,
    payload
  );
  return data;
}

export async function deleteFieldLabel(moduleId: string, labelId: string) {
  await api.delete(`/module-config/modules/${moduleId}/labels/${labelId}/`);
}
