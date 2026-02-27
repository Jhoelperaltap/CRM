import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { User } from "@/types/index";

export async function getMe() {
  const { data } = await api.get<User>("/users/me/");
  return data;
}

export async function updateMe(payload: Record<string, unknown>) {
  const { data } = await api.patch<User>("/users/me/", payload);
  return data;
}

export async function getUsers(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<User>>("/users/", { params });
  return data;
}

export async function getUser(id: string) {
  const { data } = await api.get<User>(`/users/${id}/`);
  return data;
}

export async function createUser(payload: Record<string, unknown>) {
  const { data } = await api.post<User>("/users/", payload);
  return data;
}

export async function updateUser(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<User>(`/users/${id}/`, payload);
  return data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}/`);
}

export async function importUsersCsv(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/users/import_csv/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export function exportUsersUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${base}/users/export_csv/`;
}

export async function getLockedUsers() {
  const { data } = await api.get<User[]>("/users/locked/");
  return data;
}

export async function unlockUser(id: string) {
  const { data } = await api.post<{ detail: string }>(`/users/${id}/unlock/`);
  return data;
}
