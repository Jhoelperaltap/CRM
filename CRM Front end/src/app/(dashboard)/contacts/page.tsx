"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getContacts, toggleStar, importContactsCsv } from "@/lib/api/contacts";
import type { ContactListItem } from "@/types";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Plus, Star, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QuickAddContact } from "@/components/contacts/quick-add-contact";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ContactsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<ContactListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      const result = await getContacts(params);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleStar(id);
    fetchData();
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const result = await importContactsCsv(file);
          alert(`Created: ${result.created}, Skipped: ${result.skipped?.length || 0}, Errors: ${result.errors.length}`);
          fetchData();
        } catch {
          alert("Import failed");
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contacts"
        description="Manage your contacts and client information"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setQuickAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          </div>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search contacts..."
      />

      {loading ? (
        <LoadingSpinner />
      ) : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="mb-1 text-lg font-medium text-muted-foreground">
            There are no Contacts.
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            You can add Contacts by clicking the button below
          </p>
          <Button onClick={() => setQuickAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Organization Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Office Services</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Contact ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <TableCell>
                      <button onClick={(e) => handleStar(contact.id, e)}>
                        <Star
                          className={`h-4 w-4 ${contact.is_starred ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{contact.first_name}</TableCell>
                    <TableCell>{contact.last_name}</TableCell>
                    <TableCell className="text-primary">{contact.corporation_name || "-"}</TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                    <TableCell>
                      {contact.assigned_to_name ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {contact.assigned_to_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{contact.assigned_to_name}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {contact.office_services ? (
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {contact.office_services}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{contact.source || "-"}</TableCell>
                    <TableCell>{contact.contact_number || "-"}</TableCell>
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

      <QuickAddContact
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={fetchData}
      />
    </div>
  );
}
