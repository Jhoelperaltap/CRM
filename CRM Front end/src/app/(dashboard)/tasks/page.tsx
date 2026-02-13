"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTasks } from "@/lib/api/tasks";
import type { TaskListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TasksPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<TaskListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      setData(await getTasks(params));
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <PageHeader title="Tasks" createHref="/tasks/new" createLabel="New Task" />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search tasks..." />
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="rounded-md border"><Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead><TableHead>Due Date</TableHead><TableHead>Created</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.results.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/tasks/${t.id}`)}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell><StatusBadge status={t.priority} /></TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell>{t.assigned_to_name || "-"}</TableCell>
                  <TableCell>{t.due_date || "-"}</TableCell>
                  <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
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
