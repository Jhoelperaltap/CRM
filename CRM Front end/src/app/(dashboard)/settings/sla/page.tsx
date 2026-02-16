"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Search,
  Trash2,
  Pencil,
  ChevronDown,
  Star,
  Clock,
  AlertTriangle,
} from "lucide-react";
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
import { slaApi } from "@/lib/api/sla";
import type { SLAList } from "@/types/sla";

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  } else if (hours < 24) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    return `${days}d ${remainingHours}h`;
  }
}

export default function SLAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slas, setSlas] = useState<SLAList[]>([]);
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const fetchSLAs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await slaApi.list();
      setSlas(
        data.filter((sla) =>
          sla.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSLAs();
  }, [fetchSLAs]);

  const handleDelete = async () => {
    try {
      await slaApi.delete(deleteDialog.id);
      setDeleteDialog({ open: false, id: "", name: "" });
      fetchSLAs();
    } catch {
      /* empty */
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await slaApi.setDefault(id);
      fetchSLAs();
    } catch {
      /* empty */
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="SLA Management"
        createHref="/settings/sla/new"
        createLabel="New SLA"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
            <Clock className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{slas.length}</div>
            <div className="text-sm text-muted-foreground">Total SLAs</div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
            <Star className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {slas.filter((s) => s.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active SLAs</div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {slas.reduce((acc, s) => acc + s.case_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Cases with SLA</div>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search SLAs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : slas.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response (Medium)</TableHead>
                <TableHead>Resolution (Medium)</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slas.map((sla) => (
                <TableRow key={sla.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => router.push(`/settings/sla/${sla.id}/edit`)}
                  >
                    <div className="flex items-center gap-2">
                      {sla.name}
                      {sla.is_default && (
                        <Badge variant="default" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={sla.is_active ? "default" : "secondary"}
                      className={
                        sla.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : ""
                      }
                    >
                      {sla.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatHours(sla.response_time_medium)}</TableCell>
                  <TableCell>
                    {formatHours(sla.resolution_time_medium)}
                  </TableCell>
                  <TableCell>{sla.case_count}</TableCell>
                  <TableCell>
                    {format(new Date(sla.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/settings/sla/${sla.id}/edit`)
                          }
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        {!sla.is_default && (
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(sla.id)}
                          >
                            <Star className="mr-2 size-4" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: sla.id,
                              name: sla.name,
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
          No SLAs configured. Create your first SLA to start tracking response
          and resolution times.
        </div>
      )}

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, id: "", name: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SLA</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialog.name}</strong>
            ? This will affect all cases currently using this SLA. This action
            cannot be undone.
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
    </div>
  );
}
