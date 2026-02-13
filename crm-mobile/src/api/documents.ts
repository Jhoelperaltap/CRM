import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import {
  PortalDocument,
  PortalDocumentListResponse,
  PortalDocumentUpload,
} from '../types/documents';
import { useAuthStore } from '../stores/auth-store';

/**
 * Get the download URL for a document with auth token
 */
export function getDocumentDownloadUrl(documentId: string, inline: boolean = true): string {
  const baseUrl = apiClient.defaults.baseURL || '';
  const token = useAuthStore.getState().accessToken;
  const inlineParam = inline ? '?inline=true' : '';
  return `${baseUrl}/portal/documents/${documentId}/download/${inlineParam}`;
}

/**
 * Get auth headers for document download
 */
export function getDocumentAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Get list of documents for the authenticated contact
 */
export async function getDocuments(params?: {
  page?: number;
  status?: string;
  case_id?: string;
}): Promise<PortalDocumentListResponse> {
  const response = await apiClient.get<PortalDocument[] | PortalDocumentListResponse>(
    API_ENDPOINTS.DOCUMENTS,
    { params }
  );
  // Handle both array and paginated response formats
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length };
  }
  return response.data;
}

/**
 * Get a specific document by ID
 */
export async function getDocument(id: string): Promise<PortalDocument> {
  const response = await apiClient.get<PortalDocument>(API_ENDPOINTS.DOCUMENT_DETAIL(id));
  return response.data;
}

/**
 * Upload a new document
 */
export async function uploadDocument(data: PortalDocumentUpload): Promise<PortalDocument> {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('doc_type', data.doc_type);

  if (data.description) {
    formData.append('description', data.description);
  }

  if (data.case_id) {
    formData.append('case', data.case_id);
  }

  // Append the file
  formData.append('file', {
    uri: data.file.uri,
    name: data.file.name,
    type: data.file.type,
  } as any);

  const response = await apiClient.post<PortalDocument>(API_ENDPOINTS.DOCUMENTS, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
