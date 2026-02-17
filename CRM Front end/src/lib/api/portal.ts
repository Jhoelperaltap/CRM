import axios from "axios";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type {
  PortalAccess,
  PortalAppointment,
  PortalCase,
  PortalDocumentUpload,
  PortalLoginResponse,
  PortalMessage,
} from "@/types/portal";

/**
 * Portal API Client
 *
 * SECURITY: Uses httpOnly cookies for JWT authentication.
 * Tokens are never stored in localStorage or JavaScript-accessible storage.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const portalApi = axios.create({
  baseURL: `${API_BASE_URL}/portal`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Required for httpOnly cookies
});

// Handle 401 — redirect to portal login
portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("auth/login")
    ) {
      usePortalAuthStore.getState().clear();
      if (typeof window !== "undefined") {
        window.location.href = "/portal/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export async function portalLogin(email: string, password: string) {
  const { data } = await portalApi.post<PortalLoginResponse>("/auth/login/", {
    email,
    password,
  });
  return data;
}

export async function portalLogout() {
  await portalApi.post("/auth/logout/");
}

export async function portalGetMe() {
  const { data } = await portalApi.get<PortalAccess>("/auth/me/");
  return data;
}

export async function portalRequestPasswordReset(email: string) {
  const { data } = await portalApi.post("/auth/password-reset/", { email });
  return data;
}

export async function portalResetPassword(token: string, new_password: string) {
  const { data } = await portalApi.post("/auth/password-reset-confirm/", {
    token,
    new_password,
  });
  return data;
}

// Cases
export async function portalGetCases() {
  const { data } = await portalApi.get<PortalCase[]>("/cases/");
  return data;
}

export async function portalGetCase(id: string) {
  const { data } = await portalApi.get<PortalCase>(`/cases/${id}/`);
  return data;
}

// Documents
export async function portalGetDocuments() {
  const { data } = await portalApi.get<PortalDocumentUpload[]>("/documents/");
  return data;
}

export async function portalGetDocument(id: string) {
  const { data } = await portalApi.get<PortalDocumentUpload>(`/documents/${id}/`);
  return data;
}

export async function portalUploadDocument(formData: FormData) {
  const { data } = await portalApi.post<PortalDocumentUpload>("/documents/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Messages
export async function portalGetMessages() {
  const { data } = await portalApi.get<PortalMessage[]>("/messages/");
  return data;
}

export async function portalGetMessage(id: string) {
  const { data } = await portalApi.get<PortalMessage>(`/messages/${id}/`);
  return data;
}

export async function portalSendMessage(payload: {
  subject: string;
  body: string;
  case?: string;
  parent_message?: string;
}) {
  const { data } = await portalApi.post<PortalMessage>("/messages/", payload);
  return data;
}

export async function portalMarkMessageRead(id: string) {
  await portalApi.post(`/messages/${id}/mark-read/`);
}

// Appointments
export async function portalGetAppointments() {
  const { data } = await portalApi.get<PortalAppointment[]>("/appointments/");
  return data;
}
