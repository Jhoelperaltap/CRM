"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { getUsers } from "@/lib/api/users";
import {
  getActivitiesAdded,
  getActivitiesCompleted,
  getActivityEfficiency,
  getCasesAdded,
  getPipelineValue,
  getPipelineActivity,
  getFunnelProgression,
  getProductPipeline,
  getClosedVsGoals,
  getProductRevenue,
  getSalesCycleDuration,
  getLostDeals,
} from "@/lib/api/sales-insights";
import type { User } from "@/types";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NONE = "__none__";

const REPORTS = [
  {
    section: "Activity Reports",
    items: [
      { id: "activities_added", label: "Activities Added" },
      { id: "activities_completed", label: "Activities Completed" },
      { id: "activity_efficiency", label: "Activity Efficiency" },
    ],
  },
  {
    section: "Pipeline Performance",
    items: [
      { id: "cases_added", label: "Cases Added" },
      { id: "pipeline_value", label: "Pipeline Value" },
      { id: "pipeline_activity", label: "Pipeline Activity" },
      { id: "funnel_progression", label: "Funnel Progression" },
      { id: "product_pipeline", label: "Product Pipeline" },
    ],
  },
  {
    section: "Sales Results",
    items: [
      { id: "closed_vs_goals", label: "Closed vs Goals" },
      { id: "product_revenue", label: "Product Revenue" },
      { id: "sales_cycle_duration", label: "Sales Cycle by Duration" },
      { id: "lost_deals", label: "Lost Deals" },
    ],
  },
] as const;

type ReportId = (typeof REPORTS)[number]["items"][number]["id"];

const REPORT_META: Record<
  ReportId,
  { title: string; subtitle: string; chartType: string }
> = {
  activities_added: {
    title: "Activities Added",
    subtitle: "What activities were added? Activities include Tasks and Appointments.",
    chartType: "bar",
  },
  activities_completed: {
    title: "Activities Completed",
    subtitle: "Completed tasks and appointments per period.",
    chartType: "bar",
  },
  activity_efficiency: {
    title: "Activity Efficiency",
    subtitle: "Ratio of completed to total activities.",
    chartType: "efficiency",
  },
  cases_added: {
    title: "Cases Added",
    subtitle: "How many new cases were created?",
    chartType: "bar",
  },
  pipeline_value: {
    title: "Pipeline Value",
    subtitle: "Estimated fee value by case status.",
    chartType: "pipeline_bar",
  },
  pipeline_activity: {
    title: "Pipeline Activity",
    subtitle: "Activities linked to cases per period.",
    chartType: "bar",
  },
  funnel_progression: {
    title: "Funnel Progression",
    subtitle: "Cases distribution across pipeline stages.",
    chartType: "funnel",
  },
  product_pipeline: {
    title: "Product Pipeline",
    subtitle: "Cases grouped by case type.",
    chartType: "pie",
  },
  closed_vs_goals: {
    title: "Closed vs Goals",
    subtitle: "Closed/completed cases and revenue per period.",
    chartType: "line",
  },
  product_revenue: {
    title: "Product Revenue",
    subtitle: "Revenue by case type.",
    chartType: "pie_revenue",
  },
  sales_cycle_duration: {
    title: "Sales Cycle by Duration",
    subtitle: "Average days from creation to closure by case type.",
    chartType: "horizontal_bar",
  },
  lost_deals: {
    title: "Lost Deals",
    subtitle: "Cases closed without being filed or completed.",
    chartType: "bar",
  },
};

const CASE_TYPES = [
  { value: "individual_1040", label: "Individual 1040" },
  { value: "corporate_1120", label: "Corporate 1120" },
  { value: "s_corp_1120s", label: "S-Corp 1120S" },
  { value: "partnership_1065", label: "Partnership 1065" },
  { value: "nonprofit_990", label: "Nonprofit 990" },
  { value: "trust_1041", label: "Trust 1041" },
  { value: "payroll", label: "Payroll" },
  { value: "sales_tax", label: "Sales Tax" },
  { value: "amendment", label: "Amendment" },
  { value: "other", label: "Other" },
];

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SalesInsightsPage() {
  const [activeReport, setActiveReport] = useState<ReportId>("activities_added");
  const [viewBy, setViewBy] = useState("monthly");
  const [userId, setUserId] = useState(NONE);
  const [caseType, setCaseType] = useState(NONE);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any>(null);

  // Date range state
  const now = new Date();
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [dateFrom, setDateFrom] = useState(
    format(subMonths(now, 5), "yyyy-MM-dd")
  );

  // Load users once
  useEffect(() => {
    getUsers({ page_size: "200" })
      .then((res) => setUsers(res.results))
      .catch(console.error);
  }, []);

  // Fetch data when report / filters change
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = {
      date_from: dateFrom,
      date_to: dateTo,
      group_by: viewBy,
      user: userId !== NONE ? userId : undefined,
      case_type: caseType !== NONE ? caseType : undefined,
    };

    try {
      const fetchers: Record<ReportId, () => Promise<unknown>> = {
        activities_added: () => getActivitiesAdded(params),
        activities_completed: () => getActivitiesCompleted(params),
        activity_efficiency: () => getActivityEfficiency(params),
        cases_added: () => getCasesAdded(params),
        pipeline_value: () => getPipelineValue(params),
        pipeline_activity: () => getPipelineActivity(params),
        funnel_progression: () => getFunnelProgression(params),
        product_pipeline: () => getProductPipeline(params),
        closed_vs_goals: () => getClosedVsGoals(params),
        product_revenue: () => getProductRevenue(params),
        sales_cycle_duration: () => getSalesCycleDuration(params),
        lost_deals: () => getLostDeals(params),
      };

      const result = await fetchers[activeReport]();
      setChartData(result);
    } catch (err) {
      console.error("Failed to fetch insight data", err);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, dateFrom, dateTo, viewBy, userId, caseType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const meta = REPORT_META[activeReport];

  // Date navigation
  const shiftDate = (direction: -1 | 1) => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const shift = direction === -1 ? -1 : 1;
    from.setMonth(from.getMonth() + shift);
    to.setMonth(to.getMonth() + shift);
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(to, "yyyy-MM-dd"));
  };

  const dateLabel = useMemo(() => {
    try {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return `${format(from, "d MMM yyyy")} - ${format(to, "d MMM yyyy")}`;
    } catch {
      return "";
    }
  }, [dateFrom, dateTo]);

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* ---- Left Sidebar ---- */}
      <div className="w-72 shrink-0 border-r bg-card overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Sales Insights</h1>
        </div>

        <div className="py-2">
          {REPORTS.map((section) => (
            <div key={section.section} className="mb-2">
              <div className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {section.section}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    "w-full text-left px-5 py-2 text-sm transition-colors",
                    activeReport === item.id
                      ? "border-l-[3px] border-primary bg-primary/10 font-medium text-primary"
                      : "border-l-[3px] border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveReport(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Main Content ---- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filters toolbar */}
        <div className="flex items-center gap-4 border-b bg-card px-6 py-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">Users</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value={NONE}>All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">Case Type</span>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value={NONE}>All</option>
              {CASE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">View By</span>
            <select
              value={viewBy}
              onChange={(e) => setViewBy(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="monthly">Month</option>
              <option value="weekly">Week</option>
            </select>
          </div>

          <div className="flex flex-col gap-0.5 ml-auto">
            <span className="text-xs font-medium text-muted-foreground">Date Filter</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftDate(-1)}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 h-8 flex items-center rounded-md border border-input text-sm min-w-[200px] justify-center">
                {dateLabel}
              </span>
              <button
                onClick={() => shiftDate(1)}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{meta.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {meta.subtitle}
            </p>

            {loading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : !chartData ||
              (chartData.data && chartData.data.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm mt-1">
                  Try adjusting your filters or date range.
                </p>
              </div>
            ) : (
              <ChartRenderer
                reportId={activeReport}
                chartType={meta.chartType}
                data={chartData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart Renderer
// ---------------------------------------------------------------------------
function ChartRenderer({
  reportId,
  chartType,
  data,
}: {
  reportId: ReportId;
  chartType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}) {
  if (chartType === "efficiency" && data) {
    return <EfficiencyCard data={data} />;
  }

  const rows = data?.data || [];
  if (rows.length === 0) return null;

  switch (chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RTooltip />
            {rows[0]?.appointments !== undefined ? (
              <>
                <Bar dataKey="appointments" name="Appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tasks" name="Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
              </>
            ) : rows[0]?.lost_value !== undefined ? (
              <>
                <Bar dataKey="count" name="Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost_value" name="Lost Value ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <Bar dataKey="count" name="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            )}
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      );

    case "pipeline_bar":
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <RTooltip formatter={(val) => typeof val === "number" ? `$${val.toLocaleString()}` : val} />
            <Bar yAxisId="left" dataKey="count" name="Cases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="estimated" name="Estimated ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      );

    case "funnel":
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rows} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 12 }} />
            <RTooltip />
            <Bar dataKey="count" name="Cases" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
              {rows.map((_: unknown, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case "pie":
    case "pie_revenue":
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={rows}
              dataKey={chartType === "pie_revenue" ? "actual" : "count"}
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={140}
              label={({ name, percent }) =>
                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
            >
              {rows.map((_: unknown, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <RTooltip
              formatter={(val) =>
                chartType === "pie_revenue" && typeof val === "number"
                  ? `$${val.toLocaleString()}`
                  : val
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <RTooltip />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="count"
              name="Closed Cases"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="Revenue ($)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      );

    case "horizontal_bar":
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rows} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 12 }} />
            <RTooltip formatter={(val) => `${val} days`} />
            <Bar dataKey="avg_days" name="Avg Days" fill="#f59e0b" radius={[0, 4, 4, 0]}>
              {rows.map((_: unknown, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Efficiency Card
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EfficiencyCard({ data }: { data: any }) {
  const rate = data.efficiency_rate || 0;
  const bk = data.breakdown || {};

  return (
    <div className="space-y-6">
      {/* Big number */}
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary">{rate}%</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Overall Efficiency Rate
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {data.completed_activities} of {data.total_activities} activities completed
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-semibold text-blue-600">
            {bk.appointments?.completed || 0}/{bk.appointments?.total || 0}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Appointments</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-semibold text-emerald-600">
            {bk.tasks?.completed || 0}/{bk.tasks?.total || 0}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Tasks</div>
        </div>
      </div>
    </div>
  );
}
