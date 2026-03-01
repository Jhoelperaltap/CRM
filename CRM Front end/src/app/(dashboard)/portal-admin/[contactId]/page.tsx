"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Settings,
  Power,
  PowerOff,
  LogOut,
  KeyRound,
  Circle,
  Monitor,
  Clock,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getPortalClient,
  getClientSessions,
  getClientLogs,
  togglePortalAccess,
  forceLogoutClient,
  resetClientPassword,
  startImpersonation,
} from "@/lib/api/portal-admin";
import type {
  PortalClientDetail,
  PortalSession,
  PortalAdminLog,
} from "@/types/portal-admin";
import { format, formatDistanceToNow } from "date-fns";

export default function PortalClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<PortalClientDetail | null>(null);
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [logs, setLogs] = useState<PortalAdminLog[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientData, sessionsData, logsData] = await Promise.all([
        getPortalClient(contactId),
        getClientSessions(contactId),
        getClientLogs(contactId),
      ]);
      setClient(clientData);
      setSessions(sessionsData);
      setLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch client details:", error);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAccess = async () => {
    if (!client?.portal_config) return;

    try {
      const newStatus = !client.portal_config.is_portal_active;
      await togglePortalAccess(contactId, newStatus);
      fetchData();
    } catch (error) {
      console.error("Failed to toggle access:", error);
    }
  };

  const handleForceLogout = async () => {
    try {
      await forceLogoutClient(contactId);
      fetchData();
    } catch (error) {
      console.error("Failed to force logout:", error);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetClientPassword(contactId);
    } catch (error) {
      console.error("Failed to reset password:", error);
    }
  };

  const handleImpersonate = async () => {
    try {
      const result = await startImpersonation(contactId);
      window.open(result.portal_url, "_blank");
    } catch (error) {
      console.error("Failed to start impersonation:", error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!client) return <div>Client not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={client.full_name}
          description={client.email || "No email"}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/portal-admin/${contactId}/config`}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Modules
              </Link>
            </Button>

            {client.has_portal_access && client.portal_config && (
              <>
                <Button
                  variant={
                    client.portal_config.is_portal_active
                      ? "destructive"
                      : "default"
                  }
                  onClick={handleToggleAccess}
                >
                  {client.portal_config.is_portal_active ? (
                    <>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Deactivate Portal
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4" />
                      Activate Portal
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={handleImpersonate}>
                  <Eye className="mr-2 h-4 w-4" />
                  Impersonate
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <LogOut className="mr-2 h-4 w-4" />
                      Force Logout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Force Logout</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will terminate all active sessions for this client.
                        They will need to log in again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleForceLogout}>
                        Force Logout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Password</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will send a password reset email to the client.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetPassword}>
                        Send Reset Email
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portal Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Portal Access</span>
              <span>
                {client.has_portal_access ? (
                  <Badge className="bg-green-500">Yes</Badge>
                ) : (
                  <Badge variant="outline">No</Badge>
                )}
              </span>
            </div>

            {client.portal_config && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>
                    {client.portal_config.is_portal_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preset</span>
                  <span>{client.portal_config.preset_name || "Custom"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Online Status</span>
                  <span>
                    {client.is_online ? (
                      <div className="flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        <span className="text-green-600">Online</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-gray-300 text-gray-300" />
                        <span className="text-muted-foreground">Offline</span>
                      </div>
                    )}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Portal Email</span>
              <span>{client.portal_access_email || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Login</span>
              <span>
                {client.portal_config?.last_login
                  ? formatDistanceToNow(
                      new Date(client.portal_config.last_login),
                      { addSuffix: true }
                    )
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Activity</span>
              <span>
                {client.portal_config?.last_activity
                  ? formatDistanceToNow(
                      new Date(client.portal_config.last_activity),
                      { addSuffix: true }
                    )
                  : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enabled Modules</CardTitle>
          </CardHeader>
          <CardContent>
            {client.portal_config?.enabled_modules?.length ? (
              <div className="flex flex-wrap gap-2">
                {client.portal_config.enabled_modules.map((mod) => (
                  <Badge key={mod} variant="outline" className="capitalize">
                    {mod}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No modules enabled</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <CardTitle>Active Sessions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-sm">
                      {session.ip_address}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {session.user_agent || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(session.last_activity), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {session.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Ended</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No active sessions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Admin Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Admin Activity Log</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.action_display}</Badge>
                    </TableCell>
                    <TableCell>{log.admin_user_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {JSON.stringify(log.details)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address}
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No admin activity recorded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
