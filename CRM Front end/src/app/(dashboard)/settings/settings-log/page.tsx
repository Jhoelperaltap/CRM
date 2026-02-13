"use client";

import { useEffect, useState, useCallback } from "react";
import { getSettingsLogs } from "@/lib/api/settings";
import type { SettingsLog } from "@/types/settings";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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

const SETTING_AREAS = [
  { value: "all", label: "All Areas" },
  { value: "auth_policy", label: "Auth Policy" },
  { value: "sharing_rules", label: "Sharing Rules" },
  { value: "roles", label: "Roles" },
  { value: "ip_whitelist", label: "IP Whitelist" },
  { value: "groups", label: "Groups" },
];

function formatValue(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) return "-";
  try {
    return JSON.stringify(value, null, 0);
  } catch {
    return String(value);
  }
}

export default function SettingsLogPage() {
  const [data, setData] = useState<PaginatedResponse<SettingsLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [areaFilter, setAreaFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (areaFilter !== "all") params.setting_area = areaFilter;
      const result = await getSettingsLogs(params);
      setData(result);
    } catch (err) {
      console.error("Failed to load settings log", err);
    } finally {
      setLoading(false);
    }
  }, [page, areaFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAreaChange = (value: string) => {
    setAreaFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings Log"
        description="Audit trail of all settings changes"
      />

      <div className="flex items-center gap-4 py-2">
        <Select value={areaFilter} onValueChange={handleAreaChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by area" />
          </SelectTrigger>
          <SelectContent>
            {SETTING_AREAS.map((opt) => (
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
                  <TableHead>Setting Area</TableHead>
                  <TableHead>Setting Key</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
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
                      {log.setting_area.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.setting_key}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm font-mono">
                      {formatValue(log.old_value)}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm font-mono">
                      {formatValue(log.new_value)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.ip_address || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data || data.results.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No settings log entries.
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
