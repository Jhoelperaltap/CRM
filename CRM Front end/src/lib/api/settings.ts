import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import {
  AuthenticationPolicy,
  Branch,
  EncryptedFieldAccessLog,
  LoginHistory,
  LoginIPWhitelistEntry,
  RoleDetail,
  RoleTree,
  SettingsLog,
  SharingRule,
  StaffDocumentReview,
  StaffPortalAccess,
  StaffPortalAccessDetail,
  StaffPortalMessage,
  TwoFactorSetupResponse,
  TwoFactorStatus,
  UserGroup,
  UserGroupDetail,
} from "@/types/settings";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export async function getRolesTree() {
  const { data } = await api.get<RoleTree[]>("/roles/tree/");
  return data;
}

export async function getRoles() {
  const { data } = await api.get<RoleTree[]>("/roles/");
  return data;
}

export async function getRole(id: string) {
  const { data } = await api.get<RoleDetail>(`/roles/${id}/`);
  return data;
}

export async function createRole(payload: {
  name: string;
  slug: string;
  description?: string;
  parent?: string | null;
  level?: number;
  department?: string;
  assign_users_policy?: string;
  assign_groups_policy?: string;
}) {
  const { data } = await api.post<RoleDetail>("/roles/", payload);
  return data;
}

export async function updateRole(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    description: string;
    parent: string | null;
    level: number;
    department: string;
    assign_users_policy: string;
    assign_groups_policy: string;
  }>
) {
  const { data } = await api.patch<RoleDetail>(`/roles/${id}/`, payload);
  return data;
}

export async function deleteRole(id: string) {
  await api.delete(`/roles/${id}/`);
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------
export async function getGroups(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<UserGroup>>(
    "/settings/groups/",
    { params }
  );
  return data;
}

export async function getGroup(id: string) {
  const { data } = await api.get<UserGroupDetail>(`/settings/groups/${id}/`);
  return data;
}

export async function createGroup(payload: { name: string; description: string }) {
  const { data } = await api.post<UserGroup>("/settings/groups/", payload);
  return data;
}

export async function updateGroup(
  id: string,
  payload: { name?: string; description?: string }
) {
  const { data } = await api.patch<UserGroup>(`/settings/groups/${id}/`, payload);
  return data;
}

export async function deleteGroup(id: string) {
  await api.delete(`/settings/groups/${id}/`);
}

export async function addGroupMember(groupId: string, userId: string) {
  const { data } = await api.post(`/settings/groups/${groupId}/members/`, {
    user_id: userId,
  });
  return data;
}

export async function removeGroupMember(groupId: string, userId: string) {
  await api.delete(`/settings/groups/${groupId}/members/${userId}/`);
}

// ---------------------------------------------------------------------------
// Sharing Rules
// ---------------------------------------------------------------------------
export async function getSharingRules(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<SharingRule>>(
    "/settings/sharing-rules/",
    { params }
  );
  return data;
}

export async function createSharingRule(payload: Partial<SharingRule>) {
  const { data } = await api.post<SharingRule>(
    "/settings/sharing-rules/",
    payload
  );
  return data;
}

export async function updateSharingRule(
  id: string,
  payload: Partial<SharingRule>
) {
  const { data } = await api.patch<SharingRule>(
    `/settings/sharing-rules/${id}/`,
    payload
  );
  return data;
}

export async function deleteSharingRule(id: string) {
  await api.delete(`/settings/sharing-rules/${id}/`);
}

// ---------------------------------------------------------------------------
// Authentication Policy
// ---------------------------------------------------------------------------
export async function getAuthPolicy() {
  const { data } = await api.get<AuthenticationPolicy>(
    "/settings/auth-policy/"
  );
  return data;
}

export async function updateAuthPolicy(payload: Partial<AuthenticationPolicy>) {
  const { data } = await api.patch<AuthenticationPolicy>(
    "/settings/auth-policy/",
    payload
  );
  return data;
}

// ---------------------------------------------------------------------------
// IP Whitelist
// ---------------------------------------------------------------------------
export async function getIPWhitelist(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<LoginIPWhitelistEntry>>(
    "/settings/ip-whitelist/",
    { params }
  );
  return data;
}

export async function createIPWhitelistEntry(
  payload: Partial<LoginIPWhitelistEntry>
) {
  const { data } = await api.post<LoginIPWhitelistEntry>(
    "/settings/ip-whitelist/",
    payload
  );
  return data;
}

export async function deleteIPWhitelistEntry(id: string) {
  await api.delete(`/settings/ip-whitelist/${id}/`);
}

// ---------------------------------------------------------------------------
// Audit Logs (settings area)
// ---------------------------------------------------------------------------
export async function getLoginHistory(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<LoginHistory>>(
    "/settings/login-history/",
    { params }
  );
  return data;
}

export async function getSettingsLogs(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<SettingsLog>>(
    "/settings/settings-log/",
    { params }
  );
  return data;
}

export async function getPIIAccessLogs(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<EncryptedFieldAccessLog>>(
    "/settings/pii-access-log/",
    { params }
  );
  return data;
}

// ---------------------------------------------------------------------------
// Staff Portal Management
// ---------------------------------------------------------------------------
export async function getPortalAccounts(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<StaffPortalAccess>>(
    "/settings/portal/accounts/",
    { params }
  );
  return data;
}

export async function getPortalAccount(id: string) {
  const { data } = await api.get<StaffPortalAccessDetail>(
    `/settings/portal/accounts/${id}/`
  );
  return data;
}

export async function invitePortalClient(payload: {
  contact: string;
  email?: string;
}) {
  const { data } = await api.post<StaffPortalAccessDetail>(
    "/settings/portal/accounts/",
    payload
  );
  return data;
}

export async function updatePortalAccount(
  id: string,
  payload: { is_active?: boolean; email?: string }
) {
  const { data } = await api.patch<StaffPortalAccessDetail>(
    `/settings/portal/accounts/${id}/`,
    payload
  );
  return data;
}

export async function deletePortalAccount(id: string) {
  await api.delete(`/settings/portal/accounts/${id}/`);
}

export async function getPortalDocuments(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<StaffDocumentReview>>(
    "/settings/portal/documents/",
    { params }
  );
  return data;
}

export async function approvePortalDocument(id: string) {
  const { data } = await api.post<StaffDocumentReview>(
    `/settings/portal/documents/${id}/approve/`
  );
  return data;
}

export async function rejectPortalDocument(
  id: string,
  rejectionReason?: string
) {
  const { data } = await api.post<StaffDocumentReview>(
    `/settings/portal/documents/${id}/reject/`,
    { rejection_reason: rejectionReason || "" }
  );
  return data;
}

export async function getPortalMessages(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<StaffPortalMessage>>(
    "/settings/portal/messages/",
    { params }
  );
  return data;
}

export async function getPortalMessage(id: string) {
  const { data } = await api.get<StaffPortalMessage>(
    `/settings/portal/messages/${id}/`
  );
  return data;
}

export async function replyPortalMessage(
  id: string,
  payload: { body: string; subject?: string }
) {
  const { data } = await api.post<StaffPortalMessage>(
    `/settings/portal/messages/${id}/reply/`,
    payload
  );
  return data;
}

// ---------------------------------------------------------------------------
// Two-Factor Authentication
// ---------------------------------------------------------------------------
export async function get2FAStatus() {
  const { data } = await api.get<TwoFactorStatus>("/auth/2fa/status/");
  return data;
}

export async function setup2FA() {
  const { data } = await api.post<TwoFactorSetupResponse>("/auth/2fa/setup/");
  return data;
}

export async function verifySetup2FA(code: string) {
  const { data } = await api.post<{ recovery_codes: string[] }>(
    "/auth/2fa/verify-setup/",
    { code }
  );
  return data;
}

export async function disable2FA(password: string, code: string) {
  const { data } = await api.post("/auth/2fa/disable/", { password, code });
  return data;
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------
export async function getBranches(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<Branch>>("/branches/", { params });
  return data;
}

export async function getBranch(id: string) {
  const { data } = await api.get<Branch>(`/branches/${id}/`);
  return data;
}

export async function createBranch(payload: Partial<Branch>) {
  const { data } = await api.post<Branch>("/branches/", payload);
  return data;
}

export async function updateBranch(id: string, payload: Partial<Branch>) {
  const { data } = await api.patch<Branch>(`/branches/${id}/`, payload);
  return data;
}

export async function deleteBranch(id: string) {
  await api.delete(`/branches/${id}/`);
}
