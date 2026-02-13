"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { AuditLog } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AuditPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      const { data: result } = await api.get<PaginatedResponse<AuditLog>>("/audit/", { params });
      setData(result);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const actionColors: Record<string, string> = { create: "bg-green-100 text-green-800", update: "bg-blue-100 text-blue-800", delete: "bg-red-100 text-red-800", view: "bg-gray-100 text-gray-800" };

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Logs" description="System activity log (admin only)" />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search logs..." />
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="rounded-md border"><Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead>
              <TableHead>Module</TableHead><TableHead>Object</TableHead><TableHead>IP</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.results.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{log.user?.full_name || "-"}</TableCell>
                  <TableCell><Badge variant="outline" className={`border-0 ${actionColors[log.action] || ""}`}>{log.action}</Badge></TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{log.object_repr}</TableCell>
                  <TableCell className="text-sm">{log.ip_address || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
          {data && <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
