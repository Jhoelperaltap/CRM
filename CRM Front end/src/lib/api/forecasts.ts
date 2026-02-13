import api from "@/lib/api";

/* ---------- Types ---------- */

export interface TeamUser {
  id: string;
  email: string;
  full_name: string;
}

export interface QuarterSummary {
  fiscal_year: number;
  quarter: number;
  period_label: string;
  quota: string;
  closed_won: string;
  gap: string;
  pipeline: string;
  best_case: string;
  commit: string;
  funnel_total: string;
}

export interface ForecastTotals {
  quota: string;
  closed_won: string;
  gap: string;
  pipeline: string;
}

export interface ForecastSummaryResponse {
  fiscal_year: number;
  quarters: QuarterSummary[];
  totals: ForecastTotals;
}

export interface TeamMemberDetail {
  user_id: string;
  full_name: string;
  fiscal_year: number;
  quarter: number;
  period_label: string;
  quota: string;
  closed_won: string;
  gap: string;
  pipeline: string;
  best_case: string;
  commit: string;
  funnel_total: string;
}

export interface SalesQuota {
  id: string;
  user: string;
  user_detail: { id: string; full_name: string; email: string };
  fiscal_year: number;
  quarter: number;
  amount: string;
  period_label: string;
  notify_by_email: boolean;
  set_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotaBulkItem {
  user: string;
  fiscal_year: number;
  quarter: number;
  amount: number;
}

/* ---------- API Functions ---------- */

export async function getTeamUsers(): Promise<TeamUser[]> {
  const { data } = await api.get<TeamUser[]>("/forecasts/team-users/");
  return data;
}

export async function getForecastSummary(
  fiscalYear: number
): Promise<ForecastSummaryResponse> {
  const { data } = await api.get<ForecastSummaryResponse>(
    "/forecasts/summary/",
    { params: { fiscal_year: fiscalYear } }
  );
  return data;
}

export async function getTeamQuarterDetail(
  fiscalYear: number,
  quarter: number
): Promise<TeamMemberDetail[]> {
  const { data } = await api.get<TeamMemberDetail[]>(
    "/forecasts/team-detail/",
    { params: { fiscal_year: fiscalYear, quarter } }
  );
  return data;
}

export async function getQuotas(params?: {
  fiscal_year?: number;
  quarter?: number;
  user?: string;
}): Promise<SalesQuota[]> {
  const { data } = await api.get<SalesQuota[]>("/forecasts/quotas/", {
    params,
  });
  return data;
}

export async function bulkSetQuotas(
  quotas: QuotaBulkItem[],
  notifyByEmail: boolean
): Promise<SalesQuota[]> {
  const { data } = await api.post<SalesQuota[]>("/forecasts/quotas/bulk/", {
    quotas,
    notify_by_email: notifyByEmail,
  });
  return data;
}
