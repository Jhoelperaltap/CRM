export interface RevenueRow {
  period: string;
  estimated: number;
  actual: number;
  count: number;
}

export interface RevenueReport {
  rows: RevenueRow[];
  totals: {
    estimated: number;
    actual: number;
    count: number;
  };
}

export interface CaseReport {
  total: number;
  completed: number;
  completion_rate: number;
  status_breakdown: { status: string; count: number }[];
  aging_buckets: { bucket: string; count: number }[];
  by_type: { case_type: string; count: number }[];
}

export interface PreparerPerformance {
  preparer_id: string;
  preparer_name: string;
  assigned: number;
  completed: number;
  completion_rate: number;
  revenue_estimated: number;
  revenue_actual: number;
}

export interface ContactAcquisition {
  by_month: { month: string; count: number }[];
  by_source: { source: string; count: number }[];
  total: number;
  converted: number;
  conversion_rate: number;
}

/* ── User-defined reports (Vtiger-style) ────────────────────────── */

export interface ReportFolder {
  id: string;
  name: string;
  description: string;
  owner: string | null;
  report_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReportOwner {
  id: string;
  full_name: string;
  email: string;
}

export interface ReportListItem {
  id: string;
  name: string;
  report_type: string;
  primary_module: string;
  folder: string | null;
  folder_name: string;
  owner: string | null;
  owner_detail: ReportOwner | null;
  frequency: string;
  description: string;
  last_run: string | null;
  last_accessed: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportDetail extends ReportListItem {
  related_modules: string[];
  folder_detail: ReportFolder | null;
  shared_with: string[];
  shared_with_details: ReportOwner[];
  columns: string[];
  filters: ReportFilter[];
  sort_field: string;
  sort_order: string;
  chart_type: string;
  chart_config: Record<string, unknown>;
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: string;
}

export interface ReportCreatePayload {
  name: string;
  report_type: string;
  primary_module: string;
  related_modules?: string[];
  folder?: string | null;
  description?: string;
  frequency?: string;
  shared_with?: string[];
  columns?: string[];
  filters?: ReportFilter[];
  sort_field?: string;
  sort_order?: string;
  chart_type?: string;
  chart_config?: Record<string, unknown>;
}

export interface ModuleField {
  name: string;
  label: string;
  type: string;
  choices?: { value: string; label: string }[];
}

export interface ReportRunResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
}
