import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import {
  ComposeEmailPayload,
  EmailAccount,
  EmailMessageDetail,
  EmailMessageListItem,
  EmailSyncLog,
  EmailTemplate,
  EmailThreadDetail,
  EmailThreadListItem,
} from "@/types/email";

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export async function getMessages(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<EmailMessageListItem>>(
    "/emails/messages/",
    { params }
  );
  return data;
}

export async function getMessage(id: string) {
  const { data } = await api.get<EmailMessageDetail>(`/emails/messages/${id}/`);
  return data;
}

export async function composeEmail(
  payload: ComposeEmailPayload,
  files?: File[]
) {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append("account", payload.account);
    formData.append("to_addresses", JSON.stringify(payload.to_addresses));
    formData.append(
      "cc_addresses",
      JSON.stringify(payload.cc_addresses || [])
    );
    formData.append(
      "bcc_addresses",
      JSON.stringify(payload.bcc_addresses || [])
    );
    formData.append("subject", payload.subject);
    formData.append("body_text", payload.body_text);
    if (payload.contact) formData.append("contact", payload.contact);
    if (payload.case) formData.append("case", payload.case);
    if (payload.in_reply_to) formData.append("in_reply_to", payload.in_reply_to);
    if (payload.references) formData.append("references", payload.references);
    if (payload.template_id) formData.append("template_id", payload.template_id);
    if (payload.attachment_ids) {
      formData.append("attachment_ids", JSON.stringify(payload.attachment_ids));
    }
    for (const file of files) {
      formData.append("files", file);
    }
    const { data } = await api.post<EmailMessageDetail>(
      "/emails/messages/compose/",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }

  const { data } = await api.post<EmailMessageDetail>(
    "/emails/messages/compose/",
    payload
  );
  return data;
}

export async function markRead(id: string) {
  const { data } = await api.post(`/emails/messages/${id}/mark-read/`);
  return data;
}

export async function markUnread(id: string) {
  const { data } = await api.post(`/emails/messages/${id}/mark-unread/`);
  return data;
}

export async function toggleStar(id: string) {
  const { data } = await api.post(`/emails/messages/${id}/toggle-star/`);
  return data;
}

export async function assignEmail(id: string, userId: string | null) {
  const { data } = await api.post(`/emails/messages/${id}/assign/`, {
    user_id: userId,
  });
  return data;
}

export async function linkEmailToContact(id: string, contactId: string | null) {
  const { data } = await api.post(`/emails/messages/${id}/link-contact/`, {
    contact_id: contactId,
  });
  return data;
}

export async function linkEmailToCase(id: string, caseId: string | null) {
  const { data } = await api.post(`/emails/messages/${id}/link-case/`, {
    case_id: caseId,
  });
  return data;
}

export async function moveToTrash(id: string) {
  const { data } = await api.post(`/emails/messages/${id}/move-to-trash/`);
  return data;
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------
export async function getThreads(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<EmailThreadListItem>>(
    "/emails/threads/",
    { params }
  );
  return data;
}

export async function getThread(id: string) {
  const { data } = await api.get<EmailThreadDetail>(`/emails/threads/${id}/`);
  return data;
}

export async function archiveThread(id: string) {
  const { data } = await api.post(`/emails/threads/${id}/archive/`);
  return data;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function getTemplates(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<EmailTemplate>>(
    "/emails/templates/",
    { params }
  );
  return data;
}

export async function getTemplate(id: string) {
  const { data } = await api.get<EmailTemplate>(`/emails/templates/${id}/`);
  return data;
}

export async function createTemplate(payload: Partial<EmailTemplate>) {
  const { data } = await api.post<EmailTemplate>("/emails/templates/", payload);
  return data;
}

export async function updateTemplate(id: string, payload: Partial<EmailTemplate>) {
  const { data } = await api.patch<EmailTemplate>(`/emails/templates/${id}/`, payload);
  return data;
}

export async function deleteTemplate(id: string) {
  await api.delete(`/emails/templates/${id}/`);
}

export async function renderTemplate(id: string, context: Record<string, string>) {
  const { data } = await api.post<{ subject: string; body_text: string }>(
    `/emails/templates/${id}/render/`,
    { context }
  );
  return data;
}

// ---------------------------------------------------------------------------
// Settings: Email Accounts (admin)
// ---------------------------------------------------------------------------
export async function getEmailAccounts(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<EmailAccount>>(
    "/settings/email-accounts/",
    { params }
  );
  return data;
}

export async function getEmailAccount(id: string) {
  const { data } = await api.get<EmailAccount>(`/settings/email-accounts/${id}/`);
  return data;
}

export async function createEmailAccount(
  payload: Partial<EmailAccount> & { password: string }
) {
  const { data } = await api.post<EmailAccount>("/settings/email-accounts/", payload);
  return data;
}

export async function updateEmailAccount(id: string, payload: Partial<EmailAccount>) {
  const { data } = await api.patch<EmailAccount>(
    `/settings/email-accounts/${id}/`,
    payload
  );
  return data;
}

export async function deleteEmailAccount(id: string) {
  await api.delete(`/settings/email-accounts/${id}/`);
}

export async function testEmailConnection(id: string) {
  const { data } = await api.post<{ status: string; message: string }>(
    `/settings/email-accounts/${id}/test-connection/`
  );
  return data;
}

export async function syncEmailNow(id: string) {
  const { data } = await api.post<{ status: string; message: string }>(
    `/settings/email-accounts/${id}/sync-now/`
  );
  return data;
}

// ---------------------------------------------------------------------------
// Settings: Global Email Settings (admin)
// ---------------------------------------------------------------------------
export async function getEmailSettings() {
  const { data } = await api.get("/settings/email-settings/");
  return data;
}

export async function updateEmailSettings(payload: Record<string, unknown>) {
  const { data } = await api.put("/settings/email-settings/", payload);
  return data;
}

export async function resetEmailSettings() {
  const { data } = await api.post("/settings/email-settings/");
  return data;
}

// ---------------------------------------------------------------------------
// Settings: Email Sync Logs (admin)
// ---------------------------------------------------------------------------
export async function getEmailSyncLogs(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<EmailSyncLog>>(
    "/settings/email-logs/",
    { params }
  );
  return data;
}
