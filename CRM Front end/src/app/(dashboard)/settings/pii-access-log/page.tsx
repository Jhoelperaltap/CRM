"use client";

import { useEffect, useState, useCallback } from "react";
import { getPIIAccessLogs } from "@/lib/api/settings";
import type { EncryptedFieldAccessLog } from "@/types/settings";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
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

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "contacts", label: "Contacts" },
  { value: "corporations", label: "Corporations" },
  { value: "cases", label: "Cases" },
  { value: "documents", label: "Documents" },
  { value: "users", label: "Users" },
];

const accessTypeColors: Record<string, string> = {
  view: "bg-blue-100 text-blue-800",
  export: "bg-orange-100 text-orange-800",
};

export default function PIIAccessLogPage() {
  const [data, setData] = useState<PaginatedResponse<EncryptedFieldAccessLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (moduleFilter !== "all") params.module = moduleFilter;
      const result = await getPIIAccessLogs(params);
      setData(result);
    } catch (err) {
      console.error("Failed to load PII access logs", err);
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleModuleChange = (value: string) => {
    setModuleFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="PII Access Log"
        description="Audit trail of encrypted / sensitive field access"
      />

      <div className="flex items-center gap-4 py-2">
        <Select value={moduleFilter} onValueChange={handleModuleChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            {MODULE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Access Type</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user_email || "-"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {log.module}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.field_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-0 ${accessTypeColors[log.access_type] || ""}`}
                      >
                        {log.access_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.ip_address || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data || data.results.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No PII access log entries.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {data && (
            <DataTablePagination
              page={page}
              pageSize={25}
              total={data.count}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
