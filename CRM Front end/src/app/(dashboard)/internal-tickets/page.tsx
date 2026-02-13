"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getInternalTickets } from "@/lib/api/internal-tickets";
import type { InternalTicketListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";

import { CreateTicketDialog } from "@/components/internal-tickets/create-ticket-dialog";

import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  Ticket,
  ChevronDown,
} from "lucide-react";

const filterPresets = [
  { value: "my_outstanding", label: "My Outstanding Internal Tickets" },
  { value: "all", label: "All Internal Tickets" },
  { value: "new", label: "New Tickets" },
  { value: "open", label: "Open Tickets" },
  { value: "closed", label: "Closed Tickets" },
];

export default function InternalTicketsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<InternalTicketListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterPreset, setFilterPreset] = useState("my_outstanding");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;

      // Apply filter presets
      if (filterPreset === "my_outstanding") {
        params.status = "new,open,in_progress,wait_for_response";
      } else if (filterPreset === "new") {
        params.status = "new";
      } else if (filterPreset === "open") {
        params.status = "open";
      } else if (filterPreset === "closed") {
        params.status = "closed";
      }

      setData(await getInternalTickets(params));
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterPreset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, filterPreset]);

  const isEmpty = !loading && (!data || data.results.length === 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Internal Tickets</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-1.5 h-4 w-4" /> Add Internal Ticket
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                Create New
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar: filter preset + search */}
      <div className="flex items-center gap-3">
        <Select value={filterPreset} onValueChange={setFilterPreset}>
          <SelectTrigger className="w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterPresets.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : isEmpty ? (
        /* Empty state matching Vtiger */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 rounded-full bg-muted p-6">
            <Ticket className="h-16 w-16 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            There are no Internal Tickets.
          </h3>
          <p className="mb-8 text-sm text-muted-foreground">
            You can add Internal Tickets by clicking the button below
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-1.5 h-4 w-4" /> Add Internal Ticket
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                Create New
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/internal-tickets/${t.id}`)
                    }
                  >
                    <TableCell className="font-mono text-xs">
                      {t.ticket_number}
                    </TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.priority} />
                    </TableCell>
                    <TableCell>
                      {t.category
                        ? t.category.replace(/_/g, " ")
                        : "-"}
                    </TableCell>
                    <TableCell>{t.assigned_to_name || "-"}</TableCell>
                    <TableCell>{t.group_name || "-"}</TableCell>
                    <TableCell>
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && data.count > 0 && (
            <DataTablePagination
              page={page}
              pageSize={25}
              total={data.count}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Create dialog */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchData}
      />
    </div>
  );
}
