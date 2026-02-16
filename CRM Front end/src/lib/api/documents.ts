import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  Document,
  DocumentAccessLog,
  DocumentFolder,
  DocumentFolderTreeNode,
  DocumentLink,
  DocumentLinkDetail,
  DocumentListItem,
  DocumentTag,
} from "@/types";

// ---------------------------------------------------------------------------
// Download Token Response (for secure document downloads)
// ---------------------------------------------------------------------------
interface DownloadTokenResponse {
  token: string;
  expires_at: string;
  download_url: string;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export async function getDocuments(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<DocumentListItem>>("/documents/", { params });
  return data;
}

export async function getDocumentsByDepartmentFolder(folderId: string) {
  const { data } = await api.get<PaginatedResponse<DocumentListItem>>("/documents/", {
    params: { department_folder: folderId },
  });
  return data;
}

export async function getDocument(id: string) {
  const { data } = await api.get<Document>(`/documents/${id}/`);
  return data;
}

export async function createDocument(formData: FormData) {
  const { data } = await api.post<Document>("/documents/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateDocument(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<Document>(`/documents/${id}/`, payload);
  return data;
}

export async function deleteDocument(id: string) {
  await api.delete(`/documents/${id}/`);
}

/**
 * Get a secure download token for a document.
 *
 * SECURITY: This replaces the insecure pattern of passing JWT tokens in URLs.
 * The returned token is:
 * - Single-use (invalidated after first download)
 * - Short-lived (expires in 5 minutes)
 * - Tied to the specific document
 */
export async function getDocumentDownloadToken(id: string): Promise<DownloadTokenResponse> {
  const { data } = await api.post<DownloadTokenResponse>(`/documents/${id}/download-token/`);
  return data;
}

/**
 * Get a secure download URL for a document.
 *
 * SECURITY: Uses single-use download tokens instead of JWT access tokens.
 * Call this function immediately before download/view - tokens expire in 5 minutes.
 */
export async function getDocumentDownloadUrl(id: string, inline: boolean = false): Promise<string> {
  const tokenResponse = await getDocumentDownloadToken(id);
  const base = `${api.defaults.baseURL}/documents/${id}/download/`;
  const params = new URLSearchParams({ token: tokenResponse.token });
  if (inline) params.append("inline", "true");
  return `${base}?${params.toString()}`;
}

/**
 * Get a secure view URL for a document (inline display).
 *
 * SECURITY: Uses single-use download tokens instead of JWT access tokens.
 * Call this function immediately before viewing - tokens expire in 5 minutes.
 */
export async function getDocumentViewUrl(id: string): Promise<string> {
  return getDocumentDownloadUrl(id, true);
}

export async function getDocumentVersions(id: string) {
  const { data } = await api.get<DocumentListItem[]>(`/documents/${id}/versions/`);
  return data;
}

export async function getDocumentAccessLogs(id: string) {
  const { data } = await api.get<DocumentAccessLog[]>(`/documents/${id}/access-logs/`);
  return data;
}

export async function uploadNewVersion(id: string, formData: FormData) {
  const { data } = await api.post<Document>(`/documents/${id}/new-version/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function bulkUploadDocuments(formData: FormData) {
  const { data } = await api.post<DocumentListItem[]>("/documents/bulk-upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------
export async function getFolders(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<DocumentFolder>>("/documents/folders/", { params });
  return data;
}

export async function getFolderTree() {
  const { data } = await api.get<DocumentFolderTreeNode[]>("/documents/folders/tree/");
  return data;
}

export async function createFolder(payload: { name: string; parent?: string | null; description?: string }) {
  const { data } = await api.post<DocumentFolder>("/documents/folders/", payload);
  return data;
}

export async function updateFolder(id: string, payload: { name?: string; parent?: string | null; description?: string }) {
  const { data } = await api.patch<DocumentFolder>(`/documents/folders/${id}/`, payload);
  return data;
}

export async function deleteFolder(id: string) {
  await api.delete(`/documents/folders/${id}/`);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export async function getTags(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<DocumentTag>>("/documents/tags/", { params });
  return data;
}

export async function createTag(payload: { name: string; color: string; tag_type: "shared" | "personal" }) {
  const { data } = await api.post<DocumentTag>("/documents/tags/", payload);
  return data;
}

export async function updateTag(id: string, payload: { name?: string; color?: string; tag_type?: "shared" | "personal" }) {
  const { data } = await api.patch<DocumentTag>(`/documents/tags/${id}/`, payload);
  return data;
}

export async function deleteTag(id: string) {
  await api.delete(`/documents/tags/${id}/`);
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------
export async function getLinks(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<DocumentLink>>("/documents/links/", { params });
  return data;
}

export async function createLink(payload: {
  title: string;
  url: string;
  description?: string;
  folder?: string | null;
  tags?: string[];
  contact?: string | null;
  corporation?: string | null;
  case?: string | null;
}) {
  const { data } = await api.post<DocumentLinkDetail>("/documents/links/", payload);
  return data;
}

export async function deleteLink(id: string) {
  await api.delete(`/documents/links/${id}/`);
}
