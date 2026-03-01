"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Power,
  Settings,
  LogOut,
  KeyRound,
  User,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
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
import { getAdminLogs } from "@/lib/api/portal-admin";
import type { PortalAdminLog } from "@/types/portal-admin";
import { format } from "date-fns";

// Action icons mapping
const ACTION_ICONS: Record<string, React.ReactNode> = {
  impersonate_start: <Eye className="h-4 w-4 text-blue-500" />,
  impersonate_end: <Eye className="h-4 w-4 text-gray-400" />,
  toggle_module: <Package className="h-4 w-4 text-purple-500" />,
  apply_preset: <Package className="h-4 w-4 text-indigo-500" />,
  toggle_access: <Power className="h-4 w-4 text-green-500" />,
  force_logout: <LogOut className="h-4 w-4 text-red-500" />,
  reset_password: <KeyRound className="h-4 w-4 text-amber-500" />,
  view_client: <User className="h-4 w-4 text-gray-500" />,
  update_config: <Settings className="h-4 w-4 text-teal-500" />,
};

// Action color mapping
const ACTION_COLORS: Record<string, string> = {
  impersonate_start: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  impersonate_end: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  toggle_module: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  apply_preset: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  toggle_access: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  force_logout: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  reset_password: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  view_client: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  update_config: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

export default function PortalAdminLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<PortalAdminLog[]>([]);
  const [actions, setActions] = useState<{ value: string; label: string }[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        page_size: 25,
      };
      if (search) params.search = search;
      if (actionFilter && actionFilter !== "all") params.action = actionFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await getAdminLogs(params);
      setLogs(data.results);
      setTotalPages(data.total_pages);
      setTotalCount(data.count);
      if (data.actions && data.actions.length > 0) {
        setActions(data.actions);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, actionFilter, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const formatDetails = (details: Record<string, unknown>): string => {
    if (!details || Object.keys(details).length === 0) return "-";
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
  };

  if (loading && logs.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Audit Logs"
          description="View all portal administration activity"
          backHref="/portal-admin"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>

            <Select
              value={actionFilter || "all"}
              onValueChange={(value) => {
                setActionFilter(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
                placeholder="Start Date"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
                placeholder="End Date"
              />
            </div>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Activity Log</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalCount} total entries
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ACTION_ICONS[log.action] || (
                        <Activity className="h-4 w-4" />
                      )}
                      <Badge
                        className={
                          ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                        }
                      >
                        {log.action_display}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.admin_user_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.admin_user_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/portal-admin/${log.contact}`}
                      className="text-blue-600 hover:underline"
                    >
                      {log.contact_name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <span
                      className="text-xs text-muted-foreground truncate block"
                      title={formatDetails(log.details)}
                    >
                      {formatDetails(log.details)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ip_address || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}

              {logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
