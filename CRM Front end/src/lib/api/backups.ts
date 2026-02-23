import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";

export interface BackupCorporation {
  id: string;
  name: string;
}

export interface BackupUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

export interface Backup {
  id: string;
  name: string;
  backup_type: "global" | "tenant";
  status: "pending" | "in_progress" | "completed" | "failed";
  file_path?: string;
  file_size?: number;
  file_size_human?: string;
  checksum?: string;
  corporation?: string | BackupCorporation;
  corporation_name?: string;
  created_by?: string | BackupUser;
  created_by_name?: string;
  celery_task_id?: string;
  error_message?: string;
  completed_at?: string;
  include_media: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BackupCreatePayload {
  name: string;
  backup_type: "global" | "tenant";
  corporation?: string;
  include_media?: boolean;
}

export interface BackupTaskStatus {
  task_id: string;
  status: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface RestoreResponse {
  detail: string;
  task_id: string;
  backup_id: string;
}

export async function getBackups(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<Backup>>("/backups/", { params });
  return data;
}

export async function getBackup(id: string) {
  const { data } = await api.get<Backup>(`/backups/${id}/`);
  return data;
}

export async function createBackup(payload: BackupCreatePayload) {
  const { data } = await api.post<Backup>("/backups/", payload);
  return data;
}

export async function deleteBackup(id: string) {
  await api.delete(`/backups/${id}/`);
}

export function downloadBackupUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return `${base}/backups/${id}/download/`;
}

export async function restoreBackup(id: string, confirm: boolean = true) {
  const { data } = await api.post<RestoreResponse>(`/backups/${id}/restore/`, {
    confirm,
  });
  return data;
}

export async function getBackupTaskStatus(id: string) {
  const { data } = await api.get<BackupTaskStatus>(`/backups/${id}/task_status/`);
  return data;
}

export interface UploadBackupResponse {
  detail: string;
  backup: Backup;
  restore_task_id?: string;
}

export async function uploadBackup(
  file: File,
  name?: string,
  restoreAfterUpload: boolean = false
) {
  const formData = new FormData();
  formData.append("file", file);
  if (name) {
    formData.append("name", name);
  }
  if (restoreAfterUpload) {
    formData.append("restore", "true");
  }
  const { data } = await api.post<UploadBackupResponse>("/backups/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
