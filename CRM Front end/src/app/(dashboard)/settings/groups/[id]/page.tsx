"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGroup, updateGroup, deleteGroup } from "@/lib/api/settings";
import type { UserGroupDetail } from "@/types/settings";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GroupForm } from "@/components/settings/group-form";
import { GroupMembers } from "@/components/settings/group-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<UserGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const data = await getGroup(id);
      setGroup(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGroup(id);
      router.push("/settings/groups");
    } catch (err) {
      console.error(err);
      alert("Failed to delete group");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdate = async (formData: { name: string; description?: string }) => {
    setSaving(true);
    try {
      await updateGroup(id, {
        name: formData.name,
        description: formData.description,
      });
      setEditOpen(false);
      fetchGroup();
    } catch (err) {
      console.error(err);
      alert("Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!group) return <div>Group not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.name}
        backHref="/settings/groups"
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{group.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Description</span>
            <span>{group.description || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Members</span>
            <span>{group.member_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(group.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{new Date(group.updated_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <GroupMembers
            groupId={id}
            members={group.members}
            onMembersChange={fetchGroup}
          />
        </CardContent>
      </Card>

      {/* Edit Group Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <GroupForm
            defaultValues={{
              name: group.name,
              description: group.description,
            }}
            onSubmit={handleUpdate}
            isLoading={saving}
            submitLabel="Update Group"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Group"
        description={`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
