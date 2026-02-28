"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCases } from "@/lib/api/cases";
import type { TaxCaseListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUIStore } from "@/stores/ui-store";
import { CaseGrid } from "@/components/cases/case-grid";

export default function CasesPage() {
  const router = useRouter();
  const uiMode = useUIStore((s) => s.uiMode);
  const [data, setData] = useState<PaginatedResponse<TaxCaseListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">(uiMode === "light" ? "grid" : "list");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      setData(await getCases(params));
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isLightMode = uiMode === "light";

  return (
    <div className={isLightMode ? "min-h-screen bg-gray-100 -m-6 p-4 space-y-4" : "space-y-4"}>
      <PageHeader
        title="Cases"
        createHref="/cases/new"
        createLabel={isLightMode ? "Add Case" : "New Case"}
        actions={
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search cases..."
      />
      {loading ? <LoadingSpinner /> : (
        <>
          {viewMode === "grid" ? (
            <CaseGrid cases={data?.results || []} />
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead>
                    <TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Contact</TableHead>
                    <TableHead>Due Date</TableHead><TableHead>Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/cases/${c.id}`)}>
                      <TableCell className="font-mono text-sm">{c.case_number}</TableCell>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>{c.case_type.replace(/_/g, " ")}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell><StatusBadge status={c.priority} /></TableCell>
                      <TableCell>{c.contact_name}</TableCell>
                      <TableCell>{c.due_date || "-"}</TableCell>
                      <TableCell>{c.estimated_fee ? `$${Number(c.estimated_fee).toLocaleString()}` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data && <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
