"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Play,
  Pause,
  Pencil,
  Trash2,
  ChevronDown,
  Zap,
  Clock,
  Users,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger_type: "time_based" | "event_based" | "segment_based";
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  executions_count: number;
  last_executed_at: string | null;
  created_at: string;
}

// Placeholder data until API is ready
const mockAutomations: Automation[] = [
  {
    id: "1",
    name: "Welcome Email Sequence",
    description: "Send welcome emails to new contacts",
    trigger_type: "event_based",
    trigger_config: { event: "contact_created" },
    is_active: true,
    executions_count: 156,
    last_executed_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    name: "Re-engagement Campaign",
    description: "Target inactive contacts after 30 days",
    trigger_type: "time_based",
    trigger_config: { days_inactive: 30 },
    is_active: false,
    executions_count: 45,
    last_executed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function MarketingAutomationsPage() {
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const data = await automationApi.list();
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAutomations(
        mockAutomations.filter((a) =>
          a.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const handleToggle = async (id: string, isActive: boolean) => {
    // TODO: Implement toggle API
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !isActive } : a))
    );
  };

  const handleDelete = async () => {
    // TODO: Implement delete API
    setAutomations((prev) => prev.filter((a) => a.id !== deleteDialog.id));
    setDeleteDialog({ open: false, id: "", name: "" });
  };

  const getTriggerBadge = (type: string) => {
    switch (type) {
      case "time_based":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            Time-based
          </Badge>
        );
      case "event_based":
        return (
          <Badge variant="outline" className="gap-1">
            <Zap className="size-3" />
            Event-based
          </Badge>
        );
      case "segment_based":
        return (
          <Badge variant="outline" className="gap-1">
            <Users className="size-3" />
            Segment-based
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const stats = {
    total: automations.length,
    active: automations.filter((a) => a.is_active).length,
    totalExecutions: automations.reduce((sum, a) => sum + a.executions_count, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Automations</h1>
          <p className="text-muted-foreground">
            Create automated workflows to engage your contacts
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Create Automation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Automations
            </CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Executions
            </CardTitle>
            <Mail className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExecutions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search automations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : automations.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executions</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((automation) => (
                <TableRow key={automation.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{automation.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {automation.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTriggerBadge(automation.trigger_type)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={automation.is_active ? "default" : "secondary"}
                      className={
                        automation.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : ""
                      }
                    >
                      {automation.is_active ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell>{automation.executions_count}</TableCell>
                  <TableCell>
                    {automation.last_executed_at
                      ? format(new Date(automation.last_executed_at), "MMM d, yyyy")
                      : "Never"}
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
                            handleToggle(automation.id, automation.is_active)
                          }
                        >
                          {automation.is_active ? (
                            <>
                              <Pause className="mr-2 size-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 size-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: automation.id,
                              name: automation.name,
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Automations Yet</CardTitle>
            <CardDescription className="text-center mb-4">
              Create your first automation to engage contacts automatically
            </CardDescription>
            <Button>
              <Plus className="mr-2 size-4" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, id: "", name: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Automation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteDialog.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, id: "", name: "" })}
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
