import api from "@/lib/api";
import type {
  EsignDocumentListItem,
  EsignDocumentDetail,
} from "@/types";

/* ---------- List ---------- */

export async function getEsignDocuments(
  params?: Record<string, string>
): Promise<EsignDocumentListItem[]> {
  const { data } = await api.get<EsignDocumentListItem[]>(
    "/esign-documents/",
    { params }
  );
  return data;
}

/* ---------- Detail ---------- */

export async function getEsignDocument(
  id: string
): Promise<EsignDocumentDetail> {
  const { data } = await api.get<EsignDocumentDetail>(
    `/esign-documents/${id}/`
  );
  return data;
}

/* ---------- Create ---------- */

export async function createEsignDocument(
  formData: FormData
): Promise<EsignDocumentDetail> {
  const { data } = await api.post<EsignDocumentDetail>(
    "/esign-documents/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/* ---------- Update ---------- */

export async function updateEsignDocument(
  id: string,
  payload: Record<string, unknown>
): Promise<EsignDocumentDetail> {
  const { data } = await api.patch<EsignDocumentDetail>(
    `/esign-documents/${id}/`,
    payload
  );
  return data;
}

/* ---------- Delete ---------- */

export async function deleteEsignDocument(id: string): Promise<void> {
  await api.delete(`/esign-documents/${id}/`);
}

/* ---------- Actions ---------- */

export async function sendEsignDocument(
  id: string
): Promise<EsignDocumentDetail> {
  const { data } = await api.post<EsignDocumentDetail>(
    `/esign-documents/${id}/send/`
  );
  return data;
}

export async function voidEsignDocument(
  id: string
): Promise<EsignDocumentDetail> {
  const { data } = await api.post<EsignDocumentDetail>(
    `/esign-documents/${id}/void/`
  );
  return data;
}
