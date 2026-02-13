"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getReport, runReport, deleteReport } from "@/lib/api/reports";
import type { ReportDetail, ReportRunResult } from "@/types/reports";

function fmtDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [result, setResult] = useState<ReportRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const data = await getReport(id);
      setReport(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleRun = async (p = 1) => {
    setRunning(true);
    try {
      const data = await runReport(id, p);
      setResult(data);
      setPage(p);
    } catch {
      /* empty */
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    await deleteReport(id);
    router.push("/reports");
  };

  if (loading) return <LoadingSpinner />;
  if (!report)
    return (
      <p className="py-12 text-center text-muted-foreground">
        Report not found.
      </p>
    );

  const totalPages = result
    ? Math.ceil(result.total / result.page_size)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.name}
        description={report.description || undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/reports")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button size="sm" onClick={() => handleRun(1)} disabled={running}>
              <Play className="mr-2 size-4" />
              {running ? "Running..." : "Run Report"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      {/* Report info */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="py-3 gap-0">
          <CardContent className="px-4 py-0">
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{report.report_type}</p>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0">
          <CardContent className="px-4 py-0">
            <p className="text-xs text-muted-foreground">Primary Module</p>
            <p className="font-medium capitalize">{report.primary_module}</p>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0">
          <CardContent className="px-4 py-0">
            <p className="text-xs text-muted-foreground">Folder</p>
            <p className="font-medium">
              {report.folder_detail?.name || "None"}
            </p>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0">
          <CardContent className="px-4 py-0">
            <p className="text-xs text-muted-foreground">Frequency</p>
            <p className="font-medium capitalize">
              {report.frequency === "none" ? "None" : report.frequency}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Owner: {report.owner_detail?.full_name || "--"}</span>
        <span>Created: {fmtDate(report.created_at)}</span>
        <span>Last Run: {fmtDate(report.last_run)}</span>
        <span>Last Accessed: {fmtDate(report.last_accessed)}</span>
        {report.filters.length > 0 && (
          <Badge variant="outline">{report.filters.length} filter(s)</Badge>
        )}
        {report.chart_type && (
          <Badge variant="outline">Chart: {report.chart_type}</Badge>
        )}
      </div>

      {/* Results table */}
      {!result && !running && (
        <Card className="py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Click &quot;Run Report&quot; to execute this report and see
              results.
            </p>
            <Button onClick={() => handleRun(1)}>
              <Play className="mr-2 size-4" />
              Run Report
            </Button>
          </CardContent>
        </Card>
      )}

      {running && <LoadingSpinner />}

      {result && !running && (
        <Card className="py-0 gap-0">
          <CardHeader className="border-b">
            <CardTitle className="text-base">
              Results ({result.total} records)
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium capitalize"
                    >
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={result.columns.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No data found.
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      {result.columns.map((col) => (
                        <td key={col} className="px-3 py-2">
                          {row[col] != null ? String(row[col]) : "--"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.total > result.page_size && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page <= 1}
                onClick={() => handleRun(page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page >= totalPages}
                onClick={() => handleRun(page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Report"
        description={`This will permanently delete "${report.name}". Continue?`}
        variant="destructive"
      />
    </div>
  );
}
