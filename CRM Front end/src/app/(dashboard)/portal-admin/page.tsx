"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Eye,
  Settings,
  Power,
  PowerOff,
  RefreshCw,
  Circle,
  Activity,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPortalClients,
  getPortalAdminStats,
  togglePortalAccess,
  startImpersonation,
} from "@/lib/api/portal-admin";
import type { PortalClient, PortalAdminStats } from "@/types/portal-admin";
import { format } from "date-fns";

export default function PortalAdminPage() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [stats, setStats] = useState<PortalAdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [filterAccess, setFilterAccess] = useState<string>("all");
  const [filterOnline, setFilterOnline] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      if (filterAccess === "yes") params.has_access = true;
      if (filterAccess === "no") params.has_access = false;
      if (filterOnline === "yes") params.is_online = true;

      const [clientsData, statsData] = await Promise.all([
        getPortalClients(params),
        getPortalAdminStats(),
      ]);
      setClients(clientsData.results);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch portal admin data:", error);
    } finally {
      setLoading(false);
    }
  }, [search, filterAccess, filterOnline]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleToggleAccess = async (client: PortalClient) => {
    if (!client.portal_config) return;

    try {
      const newStatus = !client.portal_config.is_portal_active;
      await togglePortalAccess(client.contact_id, newStatus);
      fetchData();
    } catch (error) {
      console.error("Failed to toggle access:", error);
    }
  };

  const handleImpersonate = async (client: PortalClient) => {
    try {
      const result = await startImpersonation(client.contact_id);
      // Open portal in new tab with impersonation token
      window.open(result.portal_url, "_blank");
    } catch (error) {
      console.error("Failed to start impersonation:", error);
    }
  };

  if (loading && clients.length === 0) return <LoadingSpinner />;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Portal Administration"
            description="Manage client portal access and modules"
          />
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/portal-admin/presets">
                <Package className="mr-2 h-4 w-4" />
                Presets
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/portal-admin/logs">
                <Activity className="mr-2 h-4 w-4" />
                Audit Logs
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Clients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_clients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  With Access
                </CardTitle>
                <Power className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.clients_with_access}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active (30d)
                </CardTitle>
                <RefreshCw className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active_clients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Online Now
                </CardTitle>
                <Circle className="h-4 w-4 fill-green-500 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.online_now}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Inactive 30d
                </CardTitle>
                <PowerOff className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.inactive_30_days}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Select value={filterAccess} onValueChange={setFilterAccess}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Portal Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="yes">With Access</SelectItem>
                  <SelectItem value="no">Without Access</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterOnline} onValueChange={setFilterOnline}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Online Now</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Portal Access</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.contact_id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/portal-admin/${client.contact_id}`}
                        className="hover:underline"
                      >
                        {client.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell>
                      {client.has_portal_access ? (
                        client.portal_config?.is_portal_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )
                      ) : (
                        <Badge variant="outline">No Access</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.portal_config ? (
                        <div className="flex flex-wrap gap-1">
                          {client.portal_config.enabled_modules
                            .slice(0, 3)
                            .map((mod) => (
                              <Badge
                                key={mod}
                                variant="outline"
                                className="text-xs"
                              >
                                {mod}
                              </Badge>
                            ))}
                          {client.portal_config.enabled_modules.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{client.portal_config.enabled_modules.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.portal_config?.last_login
                        ? format(
                            new Date(client.portal_config.last_login),
                            "MMM d, yyyy HH:mm"
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {client.is_online ? (
                        <div className="flex items-center gap-1.5">
                          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                          <span className="text-sm text-green-600">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Circle className="h-2 w-2 fill-gray-300 text-gray-300" />
                          <span className="text-sm text-muted-foreground">
                            Offline
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                            >
                              <Link
                                href={`/portal-admin/${client.contact_id}/config`}
                              >
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configure Modules</TooltipContent>
                        </Tooltip>

                        {client.has_portal_access && client.portal_config && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleToggleAccess(client)}
                                >
                                  {client.portal_config.is_portal_active ? (
                                    <PowerOff className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Power className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {client.portal_config.is_portal_active
                                  ? "Deactivate Portal"
                                  : "Activate Portal"}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleImpersonate(client)}
                                >
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Impersonate Client
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {clients.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No clients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
