import api from "@/lib/api";

/* ---------- Types ---------- */

export interface ApprovalAction {
  id: string;
  phase: "approval" | "rejection";
  action_type: string;
  action_title: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ApprovalRule {
  id: string;
  rule_number: number;
  conditions: Record<string, unknown>[];
  owner_profile_ids: string[];
  approver_ids: string[];
  created_at: string;
}

export interface ApprovalListItem {
  id: string;
  name: string;
  module: string;
  is_active: boolean;
  trigger: string;
  apply_on: string;
  created_by: string | null;
  created_by_name: string;
  rule_count: number;
  created_at: string;
}

export interface ApprovalDetail extends ApprovalListItem {
  description: string;
  entry_criteria_all: Record<string, unknown>[];
  entry_criteria_any: Record<string, unknown>[];
  rules: ApprovalRule[];
  actions: ApprovalAction[];
  updated_at: string;
}

export interface ApprovalPayload {
  name: string;
  module: string;
  is_active?: boolean;
  description?: string;
  trigger?: string;
  entry_criteria_all?: Record<string, unknown>[];
  entry_criteria_any?: Record<string, unknown>[];
  apply_on?: string;
  rules?: {
    rule_number: number;
    conditions: Record<string, unknown>[];
    owner_profile_ids: string[];
    approver_ids: string[];
  }[];
  actions?: {
    phase: string;
    action_type: string;
    action_title: string;
    action_config?: Record<string, unknown>;
    is_active?: boolean;
  }[];
}

/* ---------- API Functions ---------- */

export async function getApprovals(
  params?: Record<string, string>
): Promise<ApprovalListItem[]> {
  const { data } = await api.get<ApprovalListItem[]>(
    "/settings/approvals/",
    { params }
  );
  return data;
}

export async function getApproval(id: string): Promise<ApprovalDetail> {
  const { data } = await api.get<ApprovalDetail>(
    `/settings/approvals/${id}/`
  );
  return data;
}

export async function createApproval(
  payload: ApprovalPayload
): Promise<ApprovalDetail> {
  const { data } = await api.post<ApprovalDetail>(
    "/settings/approvals/",
    payload
  );
  return data;
}

export async function updateApproval(
  id: string,
  payload: Partial<ApprovalPayload>
): Promise<ApprovalDetail> {
  const { data } = await api.patch<ApprovalDetail>(
    `/settings/approvals/${id}/`,
    payload
  );
  return data;
}

export async function deleteApproval(id: string): Promise<void> {
  await api.delete(`/settings/approvals/${id}/`);
}
