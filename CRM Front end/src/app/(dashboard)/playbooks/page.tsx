"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Play,
  Plus,
  Search,
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { playbookApi, playbookExecutionApi } from "@/lib/api/playbooks";
import type { Playbook, PlaybookExecution, PlaybookStats } from "@/types/playbooks";

const typeColors: Record<string, string> = {
  sales: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  onboarding: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  support: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  renewal: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  upsell: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  collection: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const statusColors: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  abandoned: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function PlaybooksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [executions, setExecutions] = useState<PlaybookExecution[]>([]);
  const [stats, setStats] = useState<PlaybookStats | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean> = {};
      if (typeFilter !== "all") params.playbook_type = typeFilter;

      const [playbooksData, executionsData, statsData] = await Promise.all([
        playbookApi.list(params),
        playbookExecutionApi.list({ status: "in_progress" }),
        playbookApi.stats(),
      ]);

      const filtered = search
        ? playbooksData.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.description?.toLowerCase().includes(search.toLowerCase())
          )
        : playbooksData;

      setPlaybooks(filtered);
      setExecutions(executionsData);
      setStats(statsData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDuplicate = async (id: string) => {
    try {
      await playbookApi.duplicate(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this playbook?")) return;
    try {
      await playbookApi.delete(id);
      fetchData();
    } catch {
      /* empty */
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Playbooks"
        actions={
          <Button onClick={() => router.push("/playbooks/new")}>
            <Plus className="mr-2 size-4" />
            New Playbook
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <BookOpen className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total_playbooks}</div>
                <div className="text-sm text-muted-foreground">Total Playbooks</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                <Play className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.active_executions}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.completed_this_month}</div>
                <div className="text-sm text-muted-foreground">Completed (Month)</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.overdue_executions}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="playbooks">
        <TabsList>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="executions">Active Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="playbooks" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search playbooks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="renewal">Renewal</SelectItem>
                <SelectItem value="upsell">Upsell</SelectItem>
                <SelectItem value="collection">Collection</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Playbooks List */}
          {loading ? (
            <LoadingSpinner />
          ) : playbooks.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Times Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playbooks.map((playbook) => (
                    <TableRow
                      key={playbook.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/playbooks/${playbook.id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{playbook.name}</div>
                          {playbook.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {playbook.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[playbook.playbook_type] || ""}>
                          {playbook.playbook_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell>{playbook.step_count || 0} steps</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={playbook.completion_rate}
                            className="w-16 h-2"
                          />
                          <span className="text-sm">{playbook.completion_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {playbook.times_started} started / {playbook.times_completed}{" "}
                        completed
                      </TableCell>
                      <TableCell>
                        <Badge variant={playbook.is_active ? "default" : "secondary"}>
                          {playbook.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/playbooks/${playbook.id}`)}
                            >
                              <Edit className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(playbook.id)}
                            >
                              <Copy className="mr-2 size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/playbooks/${playbook.id}/analytics`)
                              }
                            >
                              <BarChart3 className="mr-2 size-4" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(playbook.id)}
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
                <BookOpen className="size-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No Playbooks</CardTitle>
                <CardDescription className="mb-4 text-center">
                  Create your first playbook to guide your team through processes
                </CardDescription>
                <Button onClick={() => router.push("/playbooks/new")}>
                  <Plus className="mr-2 size-4" />
                  Create Playbook
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4 mt-4">
          {executions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Playbook</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => (
                    <TableRow
                      key={execution.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/playbooks/executions/${execution.id}`)
                      }
                    >
                      <TableCell>
                        <div className="font-medium">{execution.playbook_name}</div>
                        <Badge
                          className={typeColors[execution.playbook_type] || ""}
                          variant="outline"
                        >
                          {execution.playbook_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{execution.entity_name || "—"}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {execution.entity_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={execution.progress_percentage}
                            className="w-20 h-2"
                          />
                          <span className="text-sm">
                            {execution.steps_completed}/{execution.total_steps}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{execution.assigned_to_name || "Unassigned"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[execution.status] || ""}>
                            {execution.status_display}
                          </Badge>
                          {execution.is_overdue && (
                            <Badge variant="destructive">
                              <Clock className="mr-1 size-3" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {execution.target_completion_date || "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="size-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No Active Executions</CardTitle>
                <CardDescription className="text-center">
                  Start a playbook to begin tracking progress
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
