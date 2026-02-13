"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Download,
  Settings,
  Filter,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getForecastSummary,
  getTeamQuarterDetail,
  getTeamUsers,
  bulkSetQuotas,
} from "@/lib/api/forecasts";
import type {
  ForecastSummaryResponse,
  QuarterSummary,
  TeamMemberDetail,
  TeamUser,
  QuotaBulkItem,
} from "@/lib/api/forecasts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n) || n === 0) return "Not Set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtOrZero(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/* ------------------------------------------------------------------ */
/*  Summary Cards                                                      */
/* ------------------------------------------------------------------ */

const CARD_COLORS = [
  { label: "QUOTA", bg: "bg-blue-500", key: "quota" as const },
  { label: "CLOSED WON", bg: "bg-green-500", key: "closed_won" as const },
  { label: "GAP", bg: "bg-amber-500", key: "gap" as const },
  { label: "PIPELINE", bg: "bg-purple-500", key: "pipeline" as const },
];

function SummaryCards({ totals }: { totals: ForecastSummaryResponse["totals"] | null }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {CARD_COLORS.map((c) => (
        <Card key={c.key} className="overflow-hidden py-0 gap-0">
          <div className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider text-white", c.bg)}>
            {c.label}
          </div>
          <CardContent className="px-4 py-4">
            <span className="text-2xl font-bold">
              {totals ? fmtOrZero(totals[c.key]) : "--"}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quarter Row (expandable)                                           */
/* ------------------------------------------------------------------ */

function QuarterRow({
  q,
  fiscalYear,
}: {
  q: QuarterSummary;
  fiscalYear: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<TeamMemberDetail[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && members.length === 0) {
      setLoading(true);
      try {
        const data = await getTeamQuarterDetail(fiscalYear, q.quarter);
        setMembers(data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  return (
    <>
      {/* Quarter header row */}
      <tr
        className="cursor-pointer border-b hover:bg-muted/50 transition-colors"
        onClick={toggle}
      >
        <td className="px-4 py-3 font-medium">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            {q.period_label}
          </div>
        </td>
        <td className="px-4 py-3 text-right">{fmt(q.quota)}</td>
        <td className="px-4 py-3 text-right">{fmt(q.closed_won)}</td>
        <td className="px-4 py-3 text-right">{fmt(q.gap)}</td>
        <td className="px-4 py-3 text-right">{fmt(q.pipeline)}</td>
        <td className="px-4 py-3 text-right">{fmt(q.best_case)}</td>
        <td className="px-4 py-3 text-right">{fmt(q.commit)}</td>
        <td className="px-4 py-3 text-right">{fmt(q.funnel_total)}</td>
      </tr>

      {/* Expanded member rows */}
      {expanded && (
        <>
          {loading ? (
            <tr>
              <td colSpan={8} className="px-8 py-3">
                <LoadingSpinner />
              </td>
            </tr>
          ) : members.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-8 py-3 text-sm text-muted-foreground"
              >
                No team members found.
              </td>
            </tr>
          ) : (
            members.map((m) => (
              <tr
                key={m.user_id}
                className="border-b bg-muted/30 text-sm"
              >
                <td className="px-4 py-2 pl-12">{m.full_name}</td>
                <td className="px-4 py-2 text-right">{fmt(m.quota)}</td>
                <td className="px-4 py-2 text-right">{fmt(m.closed_won)}</td>
                <td className="px-4 py-2 text-right">{fmt(m.gap)}</td>
                <td className="px-4 py-2 text-right">{fmt(m.pipeline)}</td>
                <td className="px-4 py-2 text-right">{fmt(m.best_case)}</td>
                <td className="px-4 py-2 text-right">{fmt(m.commit)}</td>
                <td className="px-4 py-2 text-right">{fmt(m.funnel_total)}</td>
              </tr>
            ))
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Set / Revise Quota Dialog                                          */
/* ------------------------------------------------------------------ */

interface QuotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiscalYear: number;
  teamUsers: TeamUser[];
  onSaved: () => void;
}

function SetQuotaDialog({
  open,
  onOpenChange,
  fiscalYear,
  teamUsers,
  onSaved,
}: QuotaDialogProps) {
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(1);
  const [values, setValues] = useState<Record<string, string>>({});

  const qKey = (userId: string, quarter: number) => `${userId}_${quarter}`;

  const handleSave = async () => {
    const quotas: QuotaBulkItem[] = [];
    for (const [key, val] of Object.entries(values)) {
      const amt = parseFloat(val);
      if (isNaN(amt) || amt <= 0) continue;
      const [userId, qStr] = key.split("_");
      quotas.push({
        user: userId,
        fiscal_year: fiscalYear,
        quarter: parseInt(qStr, 10),
        amount: amt,
      });
    }
    if (quotas.length === 0) return;

    setSaving(true);
    try {
      await bulkSetQuotas(quotas, notify);
      onOpenChange(false);
      setValues({});
      onSaved();
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set or Revise Team&apos;s Quota</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">My Team</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="notify-toggle" className="text-sm">
                Notify team via Email
              </Label>
              <Switch
                id="notify-toggle"
                checked={notify}
                onCheckedChange={setNotify}
              />
            </div>
          </div>

          {/* Quarter sections */}
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">
                    Time Period
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Set Quota
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Target Mismatch
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((quarter) => (
                  <QuotaQuarterSection
                    key={quarter}
                    quarter={quarter}
                    fiscalYear={fiscalYear}
                    teamUsers={teamUsers}
                    expanded={expandedQ === quarter}
                    onToggle={() =>
                      setExpandedQ(expandedQ === quarter ? null : quarter)
                    }
                    values={values}
                    onChange={(key, val) =>
                      setValues((prev) => ({ ...prev, [key]: val }))
                    }
                    qKey={qKey}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuotaQuarterSection({
  quarter,
  fiscalYear,
  teamUsers,
  expanded,
  onToggle,
  values,
  onChange,
  qKey,
}: {
  quarter: number;
  fiscalYear: number;
  teamUsers: TeamUser[];
  expanded: boolean;
  onToggle: () => void;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  qKey: (uid: string, q: number) => string;
}) {
  // Sum up the quota values for this quarter
  const totalQuota = teamUsers.reduce((sum, u) => {
    const v = parseFloat(values[qKey(u.id, quarter)] || "0");
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  return (
    <>
      <tr
        className="cursor-pointer border-b hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-medium">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            Q{quarter} FY {fiscalYear}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          {totalQuota > 0 ? fmtOrZero(totalQuota) : "Not Set"}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">--</td>
      </tr>
      {expanded &&
        teamUsers.map((user) => (
          <tr key={user.id} className="border-b bg-muted/30">
            <td className="px-4 py-2 pl-12 text-sm">{user.full_name}</td>
            <td className="px-4 py-2">
              <Input
                type="number"
                placeholder="Not Set"
                className="ml-auto w-32 text-right text-sm h-8"
                value={values[qKey(user.id, quarter)] || ""}
                onChange={(e) =>
                  onChange(qKey(user.id, quarter), e.target.value)
                }
                onClick={(e) => e.stopPropagation()}
              />
            </td>
            <td className="px-4 py-2 text-right text-sm text-muted-foreground">
              --
            </td>
          </tr>
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ForecastQuotaPage() {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ForecastSummaryResponse | null>(null);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, users] = await Promise.all([
        getForecastSummary(fiscalYear),
        getTeamUsers(),
      ]);
      setSummary(summaryData);
      setTeamUsers(users);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevYear = () => setFiscalYear((y) => y - 1);
  const handleNextYear = () => setFiscalYear((y) => y + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecast and Quota"
        description="Track team quotas, pipeline, and forecast performance"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => setQuotaDialogOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              Set or Revise Team&apos;s Quota
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 size-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="size-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
              <Filter className="mr-2 size-4" />
              Filters
              {(filterQuarter !== "all" || filterStatus !== "all") && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {[filterQuarter !== "all", filterStatus !== "all"].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* Fiscal year navigation */}
      <div className="flex items-center gap-2">
        <Select value="my-team">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="My Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="my-team">My Team</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevYear}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">FY {fiscalYear}</span>
          <Button variant="ghost" size="icon" onClick={handleNextYear}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary cards */}
          <SummaryCards totals={summary?.totals ?? null} />

          {/* Quarterly table */}
          <Card className="py-0 gap-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium" rowSpan={2}>
                      <div className="text-xs text-muted-foreground">
                        Time Period: Q1 FY {fiscalYear}–Q4 FY {fiscalYear}
                      </div>
                    </th>
                    <th
                      className="px-4 py-2 text-center font-medium border-l"
                      colSpan={3}
                    >
                      Quota
                    </th>
                    <th
                      className="px-4 py-2 text-center font-medium border-l"
                      colSpan={4}
                    >
                      Forecast
                    </th>
                  </tr>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-right border-l">Quota</th>
                    <th className="px-4 py-2 text-right">Closed Won</th>
                    <th className="px-4 py-2 text-right">Gap</th>
                    <th className="px-4 py-2 text-right border-l">Pipeline</th>
                    <th className="px-4 py-2 text-right">Best Case</th>
                    <th className="px-4 py-2 text-right">Commit</th>
                    <th className="px-4 py-2 text-right">Funnel Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Load Previous link */}
                  <tr>
                    <td colSpan={8} className="px-4 py-2">
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={handlePrevYear}
                      >
                        Load Previous
                      </button>
                    </td>
                  </tr>

                  {summary?.quarters
                    .filter((q) => filterQuarter === "all" || q.quarter.toString() === filterQuarter)
                    .map((q) => (
                      <QuarterRow
                        key={q.quarter}
                        q={q}
                        fiscalYear={fiscalYear}
                      />
                    ))}

                  {/* Load More link */}
                  <tr>
                    <td colSpan={8} className="px-4 py-2">
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={handleNextYear}
                      >
                        Load More
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Set / Revise Quota Dialog */}
      <SetQuotaDialog
        open={quotaDialogOpen}
        onOpenChange={setQuotaDialogOpen}
        fiscalYear={fiscalYear}
        teamUsers={teamUsers}
        onSaved={fetchData}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forecast Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fiscal Year Start Month</Label>
              <Select defaultValue="january">
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="january">January</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                  <SelectItem value="july">July</SelectItem>
                  <SelectItem value="october">October</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default View</Label>
              <Select defaultValue="quarterly">
                <SelectTrigger>
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-closed">Show Closed Deals</Label>
              <Switch id="show-closed" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-pipeline">Include Pipeline in Forecast</Label>
              <Switch id="show-pipeline" defaultChecked />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setSettingsOpen(false)}>
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters Dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Forecasts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                  <SelectItem value="behind">Behind</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterQuarter("all");
                  setFilterStatus("all");
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={() => setFiltersOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
