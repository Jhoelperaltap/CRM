"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getLogs, exportLogs } from "@/lib/api/ai-agent";
import type { AgentLog, LogLevel } from "@/types/ai-agent";
import { LOG_LEVEL_COLORS } from "@/types/ai-agent";
import type { PaginatedResponse } from "@/types/api";

const LOG_LEVEL_BADGES: Record<LogLevel, string> = {
  debug: "bg-gray-100 text-gray-800",
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  decision: "bg-purple-100 text-purple-800",
};

const COMPONENTS = [
  "agent_brain",
  "email_analyzer",
  "appointment_monitor",
  "task_enforcer",
  "market_analyzer",
  "learning_engine",
];

export default function AIAgentLogsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [data, setData] = useState<PaginatedResponse<AgentLog> | null>(null);
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [componentFilter, setComponentFilter] = useState<string>("");

  // Context modal
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);

  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (levelFilter) params.level = levelFilter;
      if (componentFilter) params.component = componentFilter;

      const result = await getLogs(params);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setMessage({ type: "error", text: "Failed to load logs" });
    } finally {
      setLoading(false);
    }
  }, [page, levelFilter, componentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (levelFilter) params.level = levelFilter;
      if (componentFilter) params.component = componentFilter;

      const blob = await exportLogs(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agent_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: "success", text: "Logs have been exported to CSV" });
    } catch (err) {
      console.error("Failed to export logs:", err);
      setMessage({ type: "error", text: "Failed to export logs" });
    } finally {
      setExporting(false);
    }
  };

  const handleViewContext = (log: AgentLog) => {
    setSelectedLog(log);
    setShowContextModal(true);
  };

  const totalPages = data ? Math.ceil(data.count / 25) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Logs</h1>
          <p className="text-muted-foreground">
            Detailed activity logs from the AI agent
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={levelFilter}
            onValueChange={(v) => {
              setLevelFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="decision">Decision</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select
          value={componentFilter}
          onValueChange={(v) => {
            setComponentFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All components" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All components</SelectItem>
            {COMPONENTS.map((comp) => (
              <SelectItem key={comp} value={comp}>
                {comp.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : !data?.results.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No logs found</p>
            <p className="text-muted-foreground">
              Logs will appear here when the AI agent runs
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead className="max-w-[400px]">Message</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={LOG_LEVEL_BADGES[log.level]}
                        variant="secondary"
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.component.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate text-sm">
                      {log.message}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.tokens_used || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.ai_latency_ms ? `${log.ai_latency_ms}ms` : "-"}
                    </TableCell>
                    <TableCell>
                      {Object.keys(log.context).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContext(log)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {data.results.length} of {data.count} logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Context Modal */}
      <Dialog open={showContextModal} onOpenChange={setShowContextModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Context</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={LOG_LEVEL_BADGES[selectedLog.level]} variant="secondary">
                  {selectedLog.level.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedLog.component}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedLog.created_at), "MMM d, yyyy HH:mm:ss")}
                </span>
              </div>

              <div>
                <h4 className="font-medium mb-1">Message</h4>
                <p className="text-sm text-muted-foreground">{selectedLog.message}</p>
              </div>

              {selectedLog.action_title && (
                <div>
                  <h4 className="font-medium mb-1">Related Action</h4>
                  <p className="text-sm">{selectedLog.action_title}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-1">Context Data</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(selectedLog.context, null, 2)}
                </pre>
              </div>

              {(selectedLog.tokens_used || selectedLog.ai_latency_ms) && (
                <div className="flex gap-4 text-sm">
                  {selectedLog.tokens_used && (
                    <div>
                      <span className="font-medium">Tokens:</span>{" "}
                      {selectedLog.tokens_used}
                    </div>
                  )}
                  {selectedLog.ai_latency_ms && (
                    <div>
                      <span className="font-medium">Latency:</span>{" "}
                      {selectedLog.ai_latency_ms}ms
                    </div>
                  )}
                  {selectedLog.ai_model && (
                    <div>
                      <span className="font-medium">Model:</span>{" "}
                      {selectedLog.ai_model}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
