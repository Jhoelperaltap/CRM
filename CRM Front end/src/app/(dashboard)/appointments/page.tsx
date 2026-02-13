"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAppointments } from "@/lib/api/appointments";
import type { AppointmentListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AppointmentsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<AppointmentListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      setData(await getAppointments(params));
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <PageHeader title="Appointments" createHref="/appointments/new" createLabel="New Appointment" />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search appointments..." />
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="rounded-md border"><Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Date/Time</TableHead><TableHead>Contact</TableHead>
              <TableHead>Assigned To</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.results.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => router.push(`/appointments/${a.id}`)}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{format(new Date(a.start_datetime), "MMM d, yyyy h:mm a")}</TableCell>
                  <TableCell>{a.contact_name}</TableCell>
                  <TableCell>{a.assigned_to_name || "-"}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
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
