"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalesOrders, deleteSalesOrder } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { SalesOrderListItem } from "@/types";

export default function SalesOrdersPage() {
  const [data, setData] = useState<PaginatedResponse<SalesOrderListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await getSalesOrders({
          page: String(page),
          ...(search ? { search } : {}),
        })
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sales order?")) return;
    try {
      await deleteSalesOrder(id);
      fetchData();
    } catch {
      alert("Failed to delete sales order.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Orders"
        description="Manage sales orders"
        actions={
          <Link href="/inventory/sales-orders/new">
            <Button>
              <Plus className="mr-2 size-4" /> Create Sales Order
            </Button>
          </Link>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search sales orders..."
      />

      {loading ? (
        <LoadingSpinner />
      ) : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">No sales orders found</p>
          <Link href="/inventory/sales-orders/new">
            <Button variant="outline" className="mt-4">
              <Plus className="mr-2 size-4" /> Create Sales Order
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((so) => (
                  <TableRow key={so.id}>
                    <TableCell className="font-medium">
                      {so.so_number}
                    </TableCell>
                    <TableCell>{so.subject}</TableCell>
                    <TableCell>{so.corporation_name || "\u2014"}</TableCell>
                    <TableCell>{so.contact_name || "\u2014"}</TableCell>
                    <TableCell>
                      <StatusBadge status={so.status} />
                    </TableCell>
                    <TableCell>{so.due_date || "\u2014"}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(so.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/inventory/sales-orders/${so.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(so.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={page}
            pageSize={25}
            total={data.count}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
