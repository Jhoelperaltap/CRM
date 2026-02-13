"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getQuotes } from "@/lib/api/quotes";
import type { QuoteListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuickAddQuote } from "@/components/quotes/quick-add-quote";

export default function QuotesPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<QuoteListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      setData(await getQuotes(params));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotes"
        createHref="/quotes/new"
        createLabel="New Quote"
        actions={
          <Button variant="outline" onClick={() => setQuickAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search quotes..."
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No quotes found. Create your first quote to get started.
                    </TableCell>
                  </TableRow>
                )}
                {data?.results.map((q) => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/quotes/${q.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                    <TableCell className="font-medium">{q.subject}</TableCell>
                    <TableCell><StatusBadge status={q.stage} /></TableCell>
                    <TableCell>{q.contact_name}</TableCell>
                    <TableCell className="font-mono">
                      ${Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{q.valid_until || "-"}</TableCell>
                    <TableCell>{new Date(q.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
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

      <QuickAddQuote
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={fetchData}
      />
    </div>
  );
}
