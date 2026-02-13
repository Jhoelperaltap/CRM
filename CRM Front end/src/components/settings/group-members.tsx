"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getUsers } from "@/lib/api/users";
import { addGroupMember, removeGroupMember } from "@/lib/api/settings";
import type { GroupMember } from "@/types/settings";
import type { User } from "@/types";
import { UserPlus, Trash2 } from "lucide-react";

interface GroupMembersProps {
  groupId: string;
  members: GroupMember[];
  onMembersChange: () => void;
}

export function GroupMembers({ groupId, members, onMembersChange }: GroupMembersProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);

  const memberIds = new Set(members.map((m) => m.id));

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params: Record<string, string> = { page_size: "50" };
      if (userSearch) params.search = userSearch;
      const result = await getUsers(params);
      setUsers(result.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch]);

  useEffect(() => {
    if (addOpen) {
      fetchUsers();
    }
  }, [addOpen, fetchUsers]);

  const handleAdd = async (userId: string) => {
    setAdding(true);
    try {
      await addGroupMember(groupId, userId);
      onMembersChange();
      setAddOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;
    setRemoving(true);
    try {
      await removeGroupMember(groupId, selectedMember.id);
      onMembersChange();
      setRemoveOpen(false);
      setSelectedMember(null);
    } catch (err) {
      console.error(err);
      alert("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const openRemoveDialog = (member: GroupMember) => {
    setSelectedMember(member);
    setRemoveOpen(true);
  };

  const availableUsers = users.filter((u) => !memberIds.has(u.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Members ({members.length})
        </h3>
        <Button variant="outline" onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">
          No members in this group yet.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.role || "-"}</TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openRemoveDialog(member)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <Input
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {loadingUsers ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  Loading...
                </p>
              ) : availableUsers.length === 0 ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  No available users found.
                </p>
              ) : (
                <Table>
                  <TableBody>
                    {availableUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdd(user.id)}
                            disabled={adding}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove Member"
        description={`Are you sure you want to remove ${selectedMember?.full_name || "this member"} from the group?`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        loading={removing}
      />
    </div>
  );
}
