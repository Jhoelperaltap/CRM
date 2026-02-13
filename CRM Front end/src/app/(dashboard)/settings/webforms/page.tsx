"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, Trash2, Pencil, ChevronDown, Code } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getWebforms,
  deleteWebform,
  generateWebformHtml,
} from "@/lib/api/webforms";
import type { WebformListItem } from "@/types/webforms";

export default function WebformsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [webforms, setWebforms] = useState<WebformListItem[]>([]);
  const [search, setSearch] = useState("");
  const [htmlDialog, setHtmlDialog] = useState<{
    open: boolean;
    html: string;
  }>({ open: false, html: "" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  /* ── Fetch ── */
  const fetchWebforms = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await getWebforms(params);
      setWebforms(data.results);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchWebforms();
  }, [fetchWebforms]);

  /* ── Delete ── */
  const handleDelete = async () => {
    try {
      await deleteWebform(deleteDialog.id);
      setDeleteDialog({ open: false, id: "", name: "" });
      fetchWebforms();
    } catch {
      /* empty */
    }
  };

  /* ── Generate HTML ── */
  const handleGenerateHtml = async (id: string) => {
    try {
      const { html } = await generateWebformHtml(id);
      setHtmlDialog({ open: true, html });
    } catch {
      /* empty */
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Webforms"
        createHref="/settings/webforms/new"
        createLabel="New Webform"
      />

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search webforms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      {loading ? (
        <LoadingSpinner />
      ) : webforms.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Primary Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {webforms.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() =>
                      router.push(`/settings/webforms/${wf.id}/edit`)
                    }
                  >
                    {wf.name}
                  </TableCell>
                  <TableCell className="capitalize">
                    {wf.primary_module}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={wf.is_active ? "default" : "secondary"}
                    >
                      {wf.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {wf.assigned_to_name ?? "—"}
                  </TableCell>
                  <TableCell>{wf.field_count}</TableCell>
                  <TableCell>
                    {format(new Date(wf.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/settings/webforms/${wf.id}/edit`
                            )
                          }
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleGenerateHtml(wf.id)}
                        >
                          <Code className="mr-2 size-4" />
                          Get HTML
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: wf.id,
                              name: wf.name,
                            })
                          }
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No webforms found. Create your first webform to get started.
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, id: "", name: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webform</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteDialog.name}</strong>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, id: "", name: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── HTML preview dialog ── */}
      <Dialog
        open={htmlDialog.open}
        onOpenChange={(open) => {
          if (!open) setHtmlDialog({ open: false, html: "" });
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embeddable HTML</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-4 overflow-auto max-h-96">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {htmlDialog.html}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(htmlDialog.html);
              }}
            >
              Copy to Clipboard
            </Button>
            <Button
              onClick={() => setHtmlDialog({ open: false, html: "" })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
