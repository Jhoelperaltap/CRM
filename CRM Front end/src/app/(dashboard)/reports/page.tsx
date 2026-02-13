"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  getReports,
  getReportFolders,
  createReport,
  deleteReport,
  createReportFolder,
  getModuleFields,
} from "@/lib/api/reports";
import type {
  ReportListItem,
  ReportFolder,
  ReportCreatePayload,
  ModuleField,
  ReportFilter,
} from "@/types/reports";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REPORT_TYPES = [
  { value: "detail", label: "Detail" },
  { value: "summary", label: "Summary" },
  { value: "tabular", label: "Tabular" },
];

const PRIMARY_MODULES = [
  { value: "contacts", label: "Contacts" },
  { value: "corporations", label: "Corporations" },
  { value: "cases", label: "Cases" },
  { value: "quotes", label: "Quotes" },
  { value: "appointments", label: "Appointments" },
  { value: "tasks", label: "Tasks" },
  { value: "documents", label: "Documents" },
  { value: "users", label: "Users" },
];

const FREQUENCIES = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const FILTER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

const CHART_TYPES = [
  { value: "", label: "None" },
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "funnel", label: "Funnel" },
];

const PAGE_SIZE = 20;

function fmtDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Add Report Dialog (Multi-step wizard)                              */
/* ------------------------------------------------------------------ */

interface AddReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: ReportFolder[];
  onCreated: () => void;
}

type WizardStep = "details" | "properties" | "filters" | "charts";
const STEPS: WizardStep[] = ["details", "properties", "filters", "charts"];
const STEP_LABELS: Record<WizardStep, string> = {
  details: "Details",
  properties: "Properties",
  filters: "Filters",
  charts: "Charts",
};

function AddReportDialog({
  open,
  onOpenChange,
  folders,
  onCreated,
}: AddReportDialogProps) {
  const [step, setStep] = useState<WizardStep>("details");
  const [saving, setSaving] = useState(false);

  // Details
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [primaryModule, setPrimaryModule] = useState("");
  const [relatedModules, setRelatedModules] = useState("");
  const [description, setDescription] = useState("");
  const [shareWith, setShareWith] = useState("");

  // Properties
  const [reportType, setReportType] = useState("detail");
  const [frequency, setFrequency] = useState("none");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState<ReportFilter[]>([]);

  // Charts
  const [chartType, setChartType] = useState("");
  const [chartGroupBy, setChartGroupBy] = useState("");
  const [chartMeasure, setChartMeasure] = useState("");

  // Module fields (fetched when primary module changes)
  const [moduleFields, setModuleFields] = useState<ModuleField[]>([]);

  useEffect(() => {
    if (primaryModule) {
      getModuleFields(primaryModule).then(setModuleFields).catch(() => {});
    } else {
      setModuleFields([]);
    }
  }, [primaryModule]);

  const resetForm = () => {
    setStep("details");
    setName("");
    setFolderId("");
    setPrimaryModule("");
    setRelatedModules("");
    setDescription("");
    setShareWith("");
    setReportType("detail");
    setFrequency("none");
    setSortField("");
    setSortOrder("asc");
    setSelectedColumns([]);
    setFilters([]);
    setChartType("");
    setChartGroupBy("");
    setChartMeasure("");
    setModuleFields([]);
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const stepIndex = STEPS.indexOf(step);
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const canProceed = () => {
    if (step === "details") return name.trim() && primaryModule;
    return true;
  };

  const handleNext = async () => {
    if (isLast) {
      // Save
      setSaving(true);
      try {
        const payload: ReportCreatePayload = {
          name: name.trim(),
          report_type: reportType,
          primary_module: primaryModule,
          related_modules: relatedModules
            ? relatedModules.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2)
            : [],
          folder: folderId || null,
          description,
          frequency,
          columns: selectedColumns,
          filters,
          sort_field: sortField,
          sort_order: sortOrder,
          chart_type: chartType,
          chart_config: chartType
            ? { group_by: chartGroupBy, measure: chartMeasure }
            : {},
        };
        await createReport(payload);
        handleClose(false);
        onCreated();
      } catch {
        /* empty */
      } finally {
        setSaving(false);
      }
    } else {
      setStep(STEPS[stepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (!isFirst) setStep(STEPS[stepIndex - 1]);
  };

  // Filter management
  const addFilter = () =>
    setFilters((prev) => [...prev, { field: "", operator: "equals", value: "" }]);
  const updateFilter = (i: number, patch: Partial<ReportFilter>) =>
    setFilters((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeFilter = (i: number) =>
    setFilters((prev) => prev.filter((_, idx) => idx !== i));

  // Column toggle
  const toggleColumn = (fieldName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(fieldName)
        ? prev.filter((c) => c !== fieldName)
        : [...prev, fieldName]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Report</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-4">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (i <= stepIndex) setStep(s);
              }}
              className={cn(
                "relative px-5 py-2 text-sm font-medium transition-colors",
                "clip-path-chevron",
                i <= stepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              style={{
                clipPath:
                  i === 0
                    ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                    : i === STEPS.length - 1
                      ? "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                      : "polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
              }}
            >
              {STEP_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4 min-h-[300px]">
          {step === "details" && (
            <>
              <div className="space-y-2">
                <Label>
                  Report Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Enter the report title..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Report Folder <span className="text-destructive">*</span>
                </Label>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Primary Module <span className="text-destructive">*</span>
                </Label>
                <Select value={primaryModule} onValueChange={setPrimaryModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_MODULES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Modules (Max 2)</Label>
                <Input
                  placeholder="e.g. cases, quotes"
                  value={relatedModules}
                  onChange={(e) => setRelatedModules(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Enter Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Share Report</Label>
                <Input
                  placeholder="Add Users, Roles..."
                  value={shareWith}
                  onChange={(e) => setShareWith(e.target.value)}
                />
              </div>
            </>
          )}

          {step === "properties" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortField || "__none__"} onValueChange={(v) => setSortField(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {moduleFields.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column selection */}
              <div className="space-y-2">
                <Label>
                  Columns to Display{" "}
                  <span className="text-muted-foreground text-xs">
                    ({selectedColumns.length} selected)
                  </span>
                </Label>
                {moduleFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Select a primary module first to see available columns.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto rounded-md border p-2">
                    {moduleFields.map((f) => (
                      <label
                        key={f.name}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(f.name)}
                          onChange={() => toggleColumn(f.name)}
                          className="rounded"
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === "filters" && (
            <>
              <div className="flex items-center justify-between">
                <Label>Filter Conditions</Label>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="mr-1 size-3" />
                  Add Filter
                </Button>
              </div>

              {filters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No filters added. Click &quot;Add Filter&quot; to add conditions.
                </p>
              ) : (
                <div className="space-y-3">
                  {filters.map((f, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Field</Label>
                        <Select
                          value={f.field || "__none__"}
                          onValueChange={(v) =>
                            updateFilter(i, { field: v === "__none__" ? "" : v })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select</SelectItem>
                            {moduleFields.map((mf) => (
                              <SelectItem key={mf.name} value={mf.name}>
                                {mf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={f.operator}
                          onValueChange={(v) => updateFilter(i, { operator: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) =>
                            updateFilter(i, { value: e.target.value })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive"
                        onClick={() => removeFilter(i)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "charts" && (
            <>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select value={chartType || "__none__"} onValueChange={(v) => setChartType(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((ct) => (
                      <SelectItem key={ct.value || "__none__"} value={ct.value || "__none__"}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {chartType && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Group By</Label>
                    <Select value={chartGroupBy || "__none__"} onValueChange={(v) => setChartGroupBy(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {moduleFields.map((f) => (
                          <SelectItem key={f.name} value={f.name}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Measure</Label>
                    <Select value={chartMeasure || "__none__"} onValueChange={(v) => setChartMeasure(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Count</SelectItem>
                        {moduleFields
                          .filter((f) => f.type === "number")
                          .map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {!chartType && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Select a chart type to configure visualization options.
                </p>
              )}
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirst}
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
          >
            {isLast ? (saving ? "Saving..." : "Save") : "Next"}
            {!isLast && <ChevronRight className="ml-1 size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Reports Page                                                  */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [page, setPage] = useState(1);

  // Column filters
  const [searchName, setSearchName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterFolder, setFilterFolder] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterFrequency, setFilterFrequency] = useState("");
  const [searchDesc, setSearchDesc] = useState("");

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchName) params.search = searchName;
      if (filterType) params.report_type = filterType;
      if (filterModule) params.primary_module = filterModule;
      if (filterFolder) params.folder = filterFolder;
      if (filterOwner) params.owner = filterOwner;
      if (filterFrequency) params.frequency = filterFrequency;

      const [reportsData, foldersData] = await Promise.all([
        getReports(params),
        getReportFolders(),
      ]);
      setReports(reportsData);
      setFolders(foldersData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [searchName, filterType, filterModule, filterFolder, filterOwner, filterFrequency]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filter on description (not a query param)
  const filteredReports = useMemo(() => {
    let list = reports;
    if (searchDesc) {
      const q = searchDesc.toLowerCase();
      list = list.filter((r) => r.description.toLowerCase().includes(q));
    }
    return list;
  }, [reports, searchDesc]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
  const paginatedReports = filteredReports.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filteredReports.length);

  // Unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((r) => {
      if (r.owner && r.owner_detail) {
        map.set(r.owner, r.owner_detail.full_name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [reports]);

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteReport(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    }
  };

  const clearValue = "__all__";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="mr-2 size-4" />
                  All Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterFolder("")}>
                  All Reports
                </DropdownMenuItem>
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => setFilterFolder(f.id)}
                  >
                    {f.name} ({f.report_count})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Report
            </Button>
          </div>
        }
      />

      {/* Built-in analytics reports cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Revenue", href: "/reports/revenue", color: "bg-green-500" },
          { label: "Cases", href: "/reports/cases", color: "bg-blue-500" },
          { label: "Preparers", href: "/reports/preparers", color: "bg-purple-500" },
          { label: "Contacts", href: "/reports/contacts", color: "bg-amber-500" },
        ].map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="py-3 px-4 hover:bg-accent/50 transition-colors cursor-pointer gap-0">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", r.color)} />
                <span className="text-sm font-medium">{r.label} Report</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Reports table */}
      <Card className="py-0 gap-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Column headers */}
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium w-8">
                  <input type="checkbox" className="rounded" disabled />
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[160px]">
                  Report Name
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                  Report Type
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[130px]">
                  Primary Module
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[140px]">
                  Folder Name
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                  Owner
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[110px]">
                  Frequency
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[160px]">
                  Description
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                  Report Created
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                  Last Run
                </th>
                <th className="px-3 py-2 text-left font-medium min-w-[120px]">
                  Last Accessed
                </th>
              </tr>

              {/* Column filters */}
              <tr className="border-b">
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                    <Input
                      className="h-7 text-xs pl-7"
                      placeholder="Search"
                      value={searchName}
                      onChange={(e) => {
                        setSearchName(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={filterType || clearValue}
                    onValueChange={(v) => {
                      setFilterType(v === clearValue ? "" : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={clearValue}>All</SelectItem>
                      {REPORT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={filterModule || clearValue}
                    onValueChange={(v) => {
                      setFilterModule(v === clearValue ? "" : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={clearValue}>All</SelectItem>
                      {PRIMARY_MODULES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={filterFolder || clearValue}
                    onValueChange={(v) => {
                      setFilterFolder(v === clearValue ? "" : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={clearValue}>All</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={filterOwner || clearValue}
                    onValueChange={(v) => {
                      setFilterOwner(v === clearValue ? "" : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={clearValue}>All</SelectItem>
                      {uniqueOwners.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={filterFrequency || clearValue}
                    onValueChange={(v) => {
                      setFilterFrequency(v === clearValue ? "" : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={clearValue}>All</SelectItem>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                    <Input
                      className="h-7 text-xs pl-7"
                      placeholder="Search"
                      value={searchDesc}
                      onChange={(e) => {
                        setSearchDesc(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : paginatedReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No reports found. Click &quot;+ Add Report&quot; to create
                    one.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/reports/${r.id}`)}
                  >
                    <td
                      className="px-3 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-primary">
                      {r.name}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{r.report_type}</Badge>
                    </td>
                    <td className="px-3 py-2.5 capitalize">
                      {r.primary_module}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.folder_name && (
                        <span className="flex items-center gap-1.5">
                          <FolderOpen className="size-3.5 text-muted-foreground" />
                          {r.folder_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.owner_detail?.full_name || "--"}
                    </td>
                    <td className="px-3 py-2.5 capitalize">
                      {r.frequency === "none" ? "--" : r.frequency}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {r.description || "--"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {fmtDate(r.last_run)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {fmtDate(r.last_accessed)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredReports.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {startRow} to {endRow} of {filteredReports.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Add Report Dialog */}
      <AddReportDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        folders={folders}
        onCreated={fetchData}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Report"
        description={`This will permanently delete the report "${deleteTarget?.name}". Continue?`}
      />
    </div>
  );
}
