import api from "@/lib/api";
import type {
  Department,
  DepartmentPayload,
  DepartmentClientFolder,
  DepartmentClientFolderTree,
  DepartmentFolderGroup,
  DepartmentClientFolderCreatePayload,
  DepartmentClientFolderUpdatePayload,
  InitializeFoldersPayload,
} from "@/types/department";

// -------------------------------------------------------------------------
// Department API
// -------------------------------------------------------------------------

/**
 * Get all departments.
 */
export async function getDepartments(params?: { is_active?: string }) {
  const { data } = await api.get<Department[]>("/departments/", { params });
  return data;
}

/**
 * Get a single department by ID.
 */
export async function getDepartment(id: string) {
  const { data } = await api.get<Department>(`/departments/${id}/`);
  return data;
}

/**
 * Create a new department.
 */
export async function createDepartment(payload: DepartmentPayload) {
  const { data } = await api.post<Department>("/departments/", payload);
  return data;
}

/**
 * Update an existing department.
 */
export async function updateDepartment(id: string, payload: Partial<DepartmentPayload>) {
  const { data } = await api.patch<Department>(`/departments/${id}/`, payload);
  return data;
}

/**
 * Delete a department.
 */
export async function deleteDepartment(id: string) {
  await api.delete(`/departments/${id}/`);
}

/**
 * Seed default departments.
 */
export async function seedDepartments() {
  const { data } = await api.post<{ message: string; created: string[] }>(
    "/departments/seed/"
  );
  return data;
}

// -------------------------------------------------------------------------
// Department Client Folder API
// -------------------------------------------------------------------------

/**
 * Get department client folders with optional filters.
 */
export async function getDepartmentClientFolders(params?: {
  department?: string;
  contact?: string;
  corporation?: string;
  parent?: string;
}) {
  const { data } = await api.get<DepartmentClientFolder[]>("/department-folders/", {
    params,
  });
  return data;
}

/**
 * Get a single department client folder by ID.
 */
export async function getDepartmentClientFolder(id: string) {
  const { data } = await api.get<DepartmentClientFolder>(`/department-folders/${id}/`);
  return data;
}

/**
 * Create a new department client folder.
 */
export async function createDepartmentClientFolder(
  payload: DepartmentClientFolderCreatePayload
) {
  const { data } = await api.post<DepartmentClientFolder>(
    "/department-folders/",
    payload
  );
  return data;
}

/**
 * Update a department client folder.
 */
export async function updateDepartmentClientFolder(
  id: string,
  payload: DepartmentClientFolderUpdatePayload
) {
  const { data } = await api.patch<DepartmentClientFolder>(
    `/department-folders/${id}/`,
    payload
  );
  return data;
}

/**
 * Delete a department client folder.
 */
export async function deleteDepartmentClientFolder(id: string) {
  await api.delete(`/department-folders/${id}/`);
}

/**
 * Get folder tree for a client.
 */
export async function getDepartmentFolderTree(params: {
  contact?: string;
  corporation?: string;
}) {
  const { data } = await api.get<DepartmentClientFolderTree[]>(
    "/department-folders/tree/",
    { params }
  );
  return data;
}

/**
 * Get folder tree grouped by department for a client.
 */
export async function getClientDepartmentFolders(params: {
  contact?: string;
  corporation?: string;
}) {
  const { data } = await api.get<DepartmentFolderGroup[]>(
    "/department-folders/client-tree/",
    { params }
  );
  return data;
}

/**
 * Initialize default folders for a client.
 */
export async function initializeDepartmentFolders(payload: InitializeFoldersPayload) {
  const { data } = await api.post<{ message: string; created_count: number }>(
    "/department-folders/initialize/",
    payload
  );
  return data;
}
