"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search, Trash2, Pencil, ChevronDown } from "lucide-react";
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
  getBusinessHoursList,
  deleteBusinessHours,
} from "@/lib/api/business-hours";
import type { BusinessHoursListItem } from "@/types/business-hours";

export default function BusinessHoursPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHoursListItem[]>(
    []
  );
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const fetchBusinessHours = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await getBusinessHoursList(params);
      setBusinessHours(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBusinessHours();
  }, [fetchBusinessHours]);

  const handleDelete = async () => {
    try {
      await deleteBusinessHours(deleteDialog.id);
      setDeleteDialog({ open: false, id: "", name: "" });
      fetchBusinessHours();
    } catch {
      /* empty */
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Business Hours"
        createHref="/settings/business-hours/new"
        createLabel="New Business Hours"
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search business hours..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : businessHours.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Time Zone</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead>Holidays</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessHours.map((bh) => (
                <TableRow key={bh.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() =>
                      router.push(`/settings/business-hours/${bh.id}/edit`)
                    }
                  >
                    {bh.name}
                  </TableCell>
                  <TableCell>{bh.timezone}</TableCell>
                  <TableCell>
                    {bh.is_default ? (
                      <Badge variant="default">Default</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{bh.working_day_count}</TableCell>
                  <TableCell>{bh.holiday_count}</TableCell>
                  <TableCell>
                    {format(new Date(bh.created_at), "MMM d, yyyy")}
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
                              `/settings/business-hours/${bh.id}/edit`
                            )
                          }
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: bh.id,
                              name: bh.name,
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
          No business hours configured. Create your first configuration to get
          started.
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
            <DialogTitle>Delete Business Hours</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteDialog.name}</strong>? This action cannot be undone.
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
