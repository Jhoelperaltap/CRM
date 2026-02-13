import api from "@/lib/api";

export interface DashboardData {
  stats: {
    total_contacts: number;
    total_corporations: number;
    active_cases: number;
    cases_filed_this_month: number;
    total_estimated_revenue: number;
  };
  cases_by_status: Array<{ status: string; count: number }>;
  revenue_pipeline: Array<{ month: string; estimated: number; actual: number }>;
  cases_by_preparer: Array<{ preparer_name: string; count: number }>;
  cases_by_type: Array<{ case_type: string; count: number }>;
  monthly_filings: Array<{ month: string; count: number }>;
  upcoming_deadlines: Array<Record<string, unknown>>;
  appointments_today: Array<{
    id: string;
    title: string;
    start_datetime: string;
    end_datetime: string;
    status: string;
    contact_name: string;
    assigned_to_name: string;
  }>;
  missing_docs: Array<{
    case_id: string;
    case_number: string;
    title: string;
    contact_name: string;
    missing_types: string[];
  }>;
  tasks_by_user: Array<{
    user_id: string | null;
    user_name: string;
    total: number;
    overdue: number;
  }>;
}

export async function getDashboardData(params?: Record<string, string>) {
  const { data } = await api.get<DashboardData>("/dashboard/", { params });
  return data;
}

export async function getDashboardConfig() {
  const { data } = await api.get("/dashboard/config/");
  return data;
}

export async function updateDashboardConfig(widgets: Array<Record<string, unknown>>) {
  const { data } = await api.put("/dashboard/config/", { widgets });
  return data;
}

export async function getDashboardWidgets() {
  const { data } = await api.get("/dashboard/widgets/");
  return data;
}

export async function getUserPreferences() {
  const { data } = await api.get("/preferences/");
  return data;
}

export async function updateUserPreferences(payload: Record<string, unknown>) {
  const { data } = await api.put("/preferences/", payload);
  return data;
}
