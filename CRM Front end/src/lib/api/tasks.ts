import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { Task, TaskListItem } from "@/types";

export async function getTasks(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<TaskListItem>>("/tasks/", { params });
  return data;
}

export async function getTask(id: string) {
  const { data } = await api.get<Task>(`/tasks/${id}/`);
  return data;
}

export async function createTask(payload: Record<string, unknown>) {
  const { data } = await api.post<Task>("/tasks/", payload);
  return data;
}

export async function updateTask(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<Task>(`/tasks/${id}/`, payload);
  return data;
}

export async function deleteTask(id: string) {
  await api.delete(`/tasks/${id}/`);
}
