import api from "@/lib/api";

export interface TimeSeriesRow {
  period: string;
  label: string;
  count: number;
  appointments?: number;
  tasks?: number;
  revenue?: number;
  lost_value?: number;
}

export interface TimeSeriesResponse {
  data: TimeSeriesRow[];
  total?: number;
  total_count?: number;
  total_value?: number;
}

export interface EfficiencyResponse {
  total_activities: number;
  completed_activities: number;
  efficiency_rate: number;
  breakdown: {
    appointments: { total: number; completed: number };
    tasks: { total: number; completed: number };
  };
}

export interface PipelineRow {
  status?: string;
  case_type?: string;
  label: string;
  count: number;
  estimated?: number;
  actual?: number;
  avg_days?: number;
}

export interface PipelineResponse {
  data: PipelineRow[];
}

interface Params {
  date_from?: string;
  date_to?: string;
  group_by?: string;
  user?: string;
  case_type?: string;
}

function buildParams(p: Params): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.date_from) out.date_from = p.date_from;
  if (p.date_to) out.date_to = p.date_to;
  if (p.group_by) out.group_by = p.group_by;
  if (p.user) out.user = p.user;
  if (p.case_type) out.case_type = p.case_type;
  return out;
}

// Activity Reports
export async function getActivitiesAdded(p: Params = {}) {
  const { data } = await api.get<TimeSeriesResponse>(
    "/sales-insights/activities-added/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getActivitiesCompleted(p: Params = {}) {
  const { data } = await api.get<TimeSeriesResponse>(
    "/sales-insights/activities-completed/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getActivityEfficiency(p: Params = {}) {
  const { data } = await api.get<EfficiencyResponse>(
    "/sales-insights/activity-efficiency/",
    { params: buildParams(p) }
  );
  return data;
}

// Pipeline Performance
export async function getCasesAdded(p: Params = {}) {
  const { data } = await api.get<TimeSeriesResponse>(
    "/sales-insights/cases-added/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getPipelineValue(p: Params = {}) {
  const { data } = await api.get<PipelineResponse>(
    "/sales-insights/pipeline-value/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getPipelineActivity(p: Params = {}) {
  const { data } = await api.get<TimeSeriesResponse>(
    "/sales-insights/pipeline-activity/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getFunnelProgression(p: Params = {}) {
  const { data } = await api.get<PipelineResponse>(
    "/sales-insights/funnel-progression/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getProductPipeline(p: Params = {}) {
  const { data } = await api.get<PipelineResponse>(
    "/sales-insights/product-pipeline/",
    { params: buildParams(p) }
  );
  return data;
}

// Sales Results
export async function getClosedVsGoals(p: Params = {}) {
  const { data } = await api.get<TimeSeriesResponse>(
    "/sales-insights/closed-vs-goals/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getProductRevenue(p: Params = {}) {
  const { data } = await api.get<PipelineResponse>(
    "/sales-insights/product-revenue/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getSalesCycleDuration(p: Params = {}) {
  const { data } = await api.get<PipelineResponse>(
    "/sales-insights/sales-cycle-duration/",
    { params: buildParams(p) }
  );
  return data;
}

export async function getLostDeals(p: Params = {}) {
  const { data } = await api.get<TimeSeriesResponse>(
    "/sales-insights/lost-deals/",
    { params: buildParams(p) }
  );
  return data;
}
