"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SharingRule } from "@/types/settings";

const MODULES = [
  "contacts",
  "corporations",
  "cases",
  "documents",
  "tasks",
  "appointments",
];

const DEFAULT_ACCESS_OPTIONS: { value: SharingRule["default_access"]; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
  { value: "read_only", label: "Read Only" },
];

const SHARE_TYPE_OPTIONS: { value: SharingRule["share_type"]; label: string }[] = [
  { value: "role_hierarchy", label: "Role Hierarchy" },
  { value: "group", label: "Group" },
  { value: "specific_user", label: "Specific User" },
];

const ACCESS_LEVEL_OPTIONS: { value: SharingRule["access_level"]; label: string }[] = [
  { value: "read_only", label: "Read Only" },
  { value: "read_write", label: "Read / Write" },
];

interface SharingRuleFormProps {
  initialData?: Partial<SharingRule>;
  onSubmit: (data: Partial<SharingRule>) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function SharingRuleForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: SharingRuleFormProps) {
  const [module, setModule] = useState(initialData?.module || "");
  const [defaultAccess, setDefaultAccess] = useState<SharingRule["default_access"]>(
    initialData?.default_access || "private"
  );
  const [shareType, setShareType] = useState<SharingRule["share_type"]>(
    initialData?.share_type || "role_hierarchy"
  );
  const [sharedFromRole, setSharedFromRole] = useState(initialData?.shared_from_role || "");
  const [sharedToRole, setSharedToRole] = useState(initialData?.shared_to_role || "");
  const [sharedFromGroup, setSharedFromGroup] = useState(initialData?.shared_from_group || "");
  const [sharedToGroup, setSharedToGroup] = useState(initialData?.shared_to_group || "");
  const [accessLevel, setAccessLevel] = useState<SharingRule["access_level"]>(
    initialData?.access_level || "read_only"
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModule(initialData.module || "");
      setDefaultAccess(initialData.default_access || "private");
      setShareType(initialData.share_type || "role_hierarchy");
      setSharedFromRole(initialData.shared_from_role || "");
      setSharedToRole(initialData.shared_to_role || "");
      setSharedFromGroup(initialData.shared_from_group || "");
      setSharedToGroup(initialData.shared_to_group || "");
      setAccessLevel(initialData.access_level || "read_only");
      setIsActive(initialData.is_active ?? true);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<SharingRule> = {
      module,
      default_access: defaultAccess,
      share_type: shareType,
      access_level: accessLevel,
      is_active: isActive,
    };

    if (shareType === "role_hierarchy") {
      payload.shared_from_role = sharedFromRole || null;
      payload.shared_to_role = sharedToRole || null;
      payload.shared_from_group = null;
      payload.shared_to_group = null;
    } else if (shareType === "group") {
      payload.shared_from_group = sharedFromGroup || null;
      payload.shared_to_group = sharedToGroup || null;
      payload.shared_from_role = null;
      payload.shared_to_role = null;
    } else {
      payload.shared_from_role = null;
      payload.shared_to_role = null;
      payload.shared_from_group = null;
      payload.shared_to_group = null;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Module</Label>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Default Access</Label>
          <Select value={defaultAccess} onValueChange={(v) => setDefaultAccess(v as SharingRule["default_access"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_ACCESS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Share Type</Label>
          <Select value={shareType} onValueChange={(v) => setShareType(v as SharingRule["share_type"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHARE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Access Level</Label>
          <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as SharingRule["access_level"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_LEVEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {shareType === "role_hierarchy" && (
          <>
            <div className="space-y-2">
              <Label>From Role (ID)</Label>
              <Input
                value={sharedFromRole}
                onChange={(e) => setSharedFromRole(e.target.value)}
                placeholder="Source role ID"
              />
            </div>
            <div className="space-y-2">
              <Label>To Role (ID)</Label>
              <Input
                value={sharedToRole}
                onChange={(e) => setSharedToRole(e.target.value)}
                placeholder="Target role ID"
              />
            </div>
          </>
        )}

        {shareType === "group" && (
          <>
            <div className="space-y-2">
              <Label>From Group (ID)</Label>
              <Input
                value={sharedFromGroup}
                onChange={(e) => setSharedFromGroup(e.target.value)}
                placeholder="Source group ID"
              />
            </div>
            <div className="space-y-2">
              <Label>To Group (ID)</Label>
              <Input
                value={sharedToGroup}
                onChange={(e) => setSharedToGroup(e.target.value)}
                placeholder="Target group ID"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="sharing-rule-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="sharing-rule-active">Active</Label>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={loading || !module}>
          {loading ? "Saving..." : initialData?.id ? "Update Rule" : "Create Rule"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
