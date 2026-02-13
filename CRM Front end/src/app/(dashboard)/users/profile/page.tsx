"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Clock,
  Save,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import { getMe, updateMe } from "@/lib/api/users";
import api from "@/lib/api";
import type { User } from "@/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Password dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMe();
      setProfile(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateMe({
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      setProfile(updated);
      setUser(updated);
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError("");
    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError("Password must be at least 8 characters.");
      return;
    }
    setPwdSaving(true);
    try {
      await api.post("/auth/change-password/", {
        old_password: currentPwd,
        new_password: newPwd,
        confirm_password: confirmPwd,
      });
      setPwdOpen(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch {
      setPwdError("Failed to change password. Check your current password.");
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!profile)
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load profile.
      </div>
    );

  const initials =
    (profile.first_name?.charAt(0) || "") +
    (profile.last_name?.charAt(0) || "") || "U";

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Profile Card ── */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="size-24 mb-4">
              {profile.avatar && (
                <AvatarImage src={profile.avatar} alt={profile.full_name} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.role && (
              <Badge variant="secondary" className="mt-2">
                {profile.role.name}
              </Badge>
            )}

            <div className="w-full mt-6 space-y-3 text-sm">
              {profile.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="size-4 shrink-0" />
                <span>{profile.role?.name || "No role"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 shrink-0" />
                <span>
                  Joined {format(new Date(profile.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => setPwdOpen(true)}
            >
              <KeyRound className="mr-2 size-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* ── Right: Edit Form ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserIcon className="size-4" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed from this page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={profile.role?.name || "—"}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Role is managed by an administrator.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 size-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_pwd">Current Password</Label>
              <Input
                id="current_pwd"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_pwd">New Password</Label>
              <Input
                id="new_pwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_pwd">Confirm New Password</Label>
              <Input
                id="confirm_pwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
            </div>
            {pwdError && (
              <p className="text-sm text-destructive">{pwdError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
            >
              {pwdSaving ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
