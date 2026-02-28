"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCorporations, importCorporationsCsv } from "@/lib/api/corporations";
import type { CorporationListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, PauseCircle, LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUIStore } from "@/stores/ui-store";
import { CorporationGrid } from "@/components/corporations/corporation-grid";

export default function CorporationsPage() {
  const router = useRouter();
  const uiMode = useUIStore((s) => s.uiMode);
  const [data, setData] = useState<PaginatedResponse<CorporationListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">(uiMode === "light" ? "grid" : "list");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      setData(await getCorporations(params));
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const r = await importCorporationsCsv(file);
          alert(`Created: ${r.created}, Skipped: ${r.skipped?.length || 0}, Errors: ${r.errors.length}`);
          fetchData();
        } catch { alert("Import failed"); }
      }
    };
    input.click();
  };

  const isLightMode = uiMode === "light";

  return (
    <div className={isLightMode ? "min-h-screen bg-gray-100 -m-6 p-4 space-y-4" : "space-y-4"}>
      <PageHeader
        title="Companies"
        createHref="/corporations/new"
        createLabel={isLightMode ? "Add Company" : "New Corporation"}
        actions={
          <div className="flex items-center gap-2">
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
            {!isLightMode && (
              <Button variant="outline" onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
            )}
          </div>
        }
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search companies..."
      />
      {loading ? <LoadingSpinner /> : (
        <>
          {viewMode === "grid" ? (
            <CorporationGrid corporations={data?.results || []} />
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>EIN</TableHead>
                    <TableHead>Client Status</TableHead><TableHead>Contact</TableHead><TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${
                        c.client_status === "business_closed" ? "bg-red-50 hover:bg-red-100" :
                        c.client_status === "paused" ? "bg-amber-50 hover:bg-amber-100" : ""
                      }`}
                      onClick={() => router.push(`/corporations/${c.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {c.client_status === "business_closed" && (
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          {c.client_status === "paused" && (
                            <PauseCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <span className={c.client_status === "business_closed" ? "line-through text-muted-foreground" : ""}>
                            {c.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{c.entity_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{c.ein || "-"}</TableCell>
                      <TableCell><StatusBadge status={c.client_status} /></TableCell>
                      <TableCell>{c.primary_contact_name || "-"}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
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
