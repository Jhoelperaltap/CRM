"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search, Trash2, Pencil, ChevronDown, GripVertical } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { faqApi, categoryApi } from "@/lib/api/knowledge-base";
import type { FAQ, Category } from "@/types/knowledge-base";

export default function FAQsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    question: string;
  }>({ open: false, id: "", question: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter !== "all") params.category = categoryFilter;

      const [faqsData, categoriesData] = await Promise.all([
        faqApi.list(params),
        categoryApi.list({ is_active: true }),
      ]);
      setFaqs(faqsData);
      setCategories(categoriesData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    try {
      await faqApi.delete(deleteDialog.id);
      setDeleteDialog({ open: false, id: "", question: "" });
      fetchData();
    } catch {
      /* empty */
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="FAQs"
        createHref="/knowledge-base/faqs/new"
        createLabel="New FAQ"
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : faqs.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline max-w-md"
                    onClick={() =>
                      router.push(`/knowledge-base/faqs/${faq.id}/edit`)
                    }
                  >
                    <div className="truncate">{faq.question}</div>
                  </TableCell>
                  <TableCell>
                    {faq.category_name || (
                      <span className="text-muted-foreground">
                        Uncategorized
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge
                        variant={faq.is_active ? "default" : "secondary"}
                        className={
                          faq.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : ""
                        }
                      >
                        {faq.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {faq.is_public && (
                        <Badge variant="outline">Public</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{faq.view_count}</TableCell>
                  <TableCell>
                    {format(new Date(faq.updated_at), "MMM d, yyyy")}
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
                            router.push(`/knowledge-base/faqs/${faq.id}/edit`)
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
                              id: faq.id,
                              question: faq.question,
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
          No FAQs found. Create your first FAQ to get started.
        </div>
      )}

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, id: "", question: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this FAQ? This action cannot be
            undone.
          </p>
          <p className="text-sm font-medium mt-2">
            &quot;{deleteDialog.question}&quot;
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, id: "", question: "" })
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
