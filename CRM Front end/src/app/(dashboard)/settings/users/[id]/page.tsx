"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, deleteUser, unlockUser } from "@/lib/api/users";
import type { User } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Unlock, Lock, AlertTriangle } from "lucide-react";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    getUser(id)
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUser(id);
      router.push("/settings/users");
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      await unlockUser(id);
      // Refresh user data
      const updatedUser = await getUser(id);
      setUser(updatedUser);
    } catch (err) {
      console.error(err);
      alert("Failed to unlock user");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <div>User not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.full_name || `${user.first_name} ${user.last_name}`}
        backHref="/settings/users"
        actions={
          <>
            {user.is_locked && (
              <Button
                variant="outline"
                onClick={handleUnlock}
                disabled={unlocking}
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                <Unlock className="mr-2 h-4 w-4" />
                {unlocking ? "Unlocking..." : "Unlock Account"}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/settings/users/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Name</span>
              <span>{user.first_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Name</span>
              <span>{user.last_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{user.phone || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={
                    user.is_active
                      ? "border-0 bg-green-100 text-green-800 font-medium"
                      : "border-0 bg-gray-100 text-gray-800 font-medium"
                  }
                >
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
                {user.is_locked && (
                  <Badge
                    variant="outline"
                    className="border-0 bg-red-100 text-red-800 font-medium gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {user.is_locked && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                Account Locked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-amber-700">
                This account has been locked due to multiple failed login attempts.
              </p>
              <div className="flex justify-between">
                <span className="text-amber-700">Failed Attempts</span>
                <span className="font-medium text-amber-900">{user.failed_login_attempts || 0}</span>
              </div>
              {user.locked_until && (
                <div className="flex justify-between">
                  <span className="text-amber-700">Locked Until</span>
                  <span className="font-medium text-amber-900">
                    {new Date(user.locked_until).toLocaleString()}
                  </span>
                </div>
              )}
              <Button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full mt-2 bg-amber-600 hover:bg-amber-700"
              >
                <Unlock className="mr-2 h-4 w-4" />
                {unlocking ? "Unlocking..." : "Unlock Account"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Role &amp; Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>{user.role?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department</span>
              <span>{user.role?.department || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admin</span>
              <span>{user.is_admin ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manager</span>
              <span>{user.is_manager ? "Yes" : "No"}</span>
            </div>
            {user.role?.permissions && user.role.permissions.length > 0 && (
              <div className="pt-2">
                <span className="text-muted-foreground">Module Permissions:</span>
                <div className="mt-2 space-y-1">
                  {user.role.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
                    >
                      <span className="font-medium capitalize">{perm.module}</span>
                      <div className="flex gap-1">
                        {perm.can_view && (
                          <Badge variant="outline" className="text-xs">View</Badge>
                        )}
                        {perm.can_create && (
                          <Badge variant="outline" className="text-xs">Create</Badge>
                        )}
                        {perm.can_edit && (
                          <Badge variant="outline" className="text-xs">Edit</Badge>
                        )}
                        {perm.can_delete && (
                          <Badge variant="outline" className="text-xs">Delete</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(user.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(user.updated_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description={`Are you sure you want to delete ${user.full_name || user.email}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
