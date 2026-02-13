"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createWebform, updateWebform } from "@/lib/api/webforms";
import { getUsers } from "@/lib/api/users";
import type { WebformDetail } from "@/types/webforms";
import type { User } from "@/types/index";
import {
  MODULE_OPTIONS,
  DUPLICATE_HANDLING_OPTIONS,
} from "@/types/webforms";

/* ------------------------------------------------------------------ */
/*  Local row interfaces                                               */
/* ------------------------------------------------------------------ */

interface FieldRow {
  key: number;
  field_name: string;
  is_mandatory: boolean;
  is_hidden: boolean;
  override_value: string;
  reference_field: string;
  duplicate_handling: "none" | "skip" | "update";
  sort_order: number;
}

interface HiddenFieldRow {
  key: number;
  field_name: string;
  url_parameter: string;
  override_value: string;
  sort_order: number;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface WebformFormProps {
  initialData?: WebformDetail;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

let nextKey = 1;

export function WebformForm({ initialData }: WebformFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  // Users list
  const [users, setUsers] = useState<User[]>([]);

  // Section 1: Webform Information
  const [name, setName] = useState(initialData?.name ?? "");
  const [primaryModule, setPrimaryModule] = useState(
    initialData?.primary_module ?? "contacts"
  );
  const [returnUrl, setReturnUrl] = useState(initialData?.return_url ?? "");
  const [assignedTo, setAssignedTo] = useState<string>(
    initialData?.assigned_to ?? ""
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [captchaEnabled, setCaptchaEnabled] = useState(
    initialData?.captcha_enabled ?? false
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );

  // Section 2: User Assignment
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(
    initialData?.round_robin_enabled ?? false
  );
  const [roundRobinUserIds, setRoundRobinUserIds] = useState<string[]>(
    initialData?.round_robin_users?.map((u) => u.user) ?? []
  );

  // Section 3: Webform Fields
  const [fields, setFields] = useState<FieldRow[]>(() => {
    if (initialData?.fields) {
      return initialData.fields.map((f) => ({
        key: nextKey++,
        field_name: f.field_name,
        is_mandatory: f.is_mandatory,
        is_hidden: f.is_hidden,
        override_value: f.override_value,
        reference_field: f.reference_field,
        duplicate_handling: f.duplicate_handling,
        sort_order: f.sort_order,
      }));
    }
    return [];
  });

  // Section 4: Additional Hidden Fields
  const [hiddenFields, setHiddenFields] = useState<HiddenFieldRow[]>(() => {
    if (initialData?.hidden_fields) {
      return initialData.hidden_fields.map((hf) => ({
        key: nextKey++,
        field_name: hf.field_name,
        url_parameter: hf.url_parameter,
        override_value: hf.override_value,
        sort_order: hf.sort_order,
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch {
      /* empty */
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Field helpers ── */

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        key: nextKey++,
        field_name: "",
        is_mandatory: false,
        is_hidden: false,
        override_value: "",
        reference_field: "",
        duplicate_handling: "none" as const,
        sort_order: prev.length,
      },
    ]);
  };

  const updateField = (key: number, updates: Partial<FieldRow>) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...updates } : f))
    );
  };

  const removeField = (key: number) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /* ── Hidden field helpers ── */

  const addHiddenField = () => {
    setHiddenFields((prev) => [
      ...prev,
      {
        key: nextKey++,
        field_name: "",
        url_parameter: "",
        override_value: "",
        sort_order: prev.length,
      },
    ]);
  };

  const updateHiddenField = (
    key: number,
    updates: Partial<HiddenFieldRow>
  ) => {
    setHiddenFields((prev) =>
      prev.map((hf) => (hf.key === key ? { ...hf, ...updates } : hf))
    );
  };

  const removeHiddenField = (key: number) => {
    setHiddenFields((prev) => prev.filter((hf) => hf.key !== key));
  };

  /* ── Round-robin toggle ── */

  const toggleRoundRobinUser = (userId: string) => {
    setRoundRobinUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  /* ── Submit ── */

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        primary_module: primaryModule,
        return_url: returnUrl,
        description,
        is_active: isActive,
        captcha_enabled: captchaEnabled,
        assigned_to: assignedTo || null,
        round_robin_enabled: roundRobinEnabled,
        fields: fields.map((f, idx) => ({
          field_name: f.field_name,
          is_mandatory: f.is_mandatory,
          is_hidden: f.is_hidden,
          override_value: f.override_value,
          reference_field: f.reference_field,
          duplicate_handling: f.duplicate_handling,
          sort_order: idx,
        })),
        hidden_fields: hiddenFields.map((hf, idx) => ({
          field_name: hf.field_name,
          url_parameter: hf.url_parameter,
          override_value: hf.override_value,
          sort_order: idx,
        })),
        round_robin_user_ids: roundRobinEnabled ? roundRobinUserIds : [],
      };

      if (isEdit && initialData) {
        await updateWebform(initialData.id, payload);
      } else {
        await createWebform(payload);
      }
      router.push("/settings/webforms");
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  /* ── Section badge ── */

  const SectionBadge = ({ num }: { num: number }) => (
    <div className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
      {num}
    </div>
  );

  /* ── Render ── */

  return (
    <div className="space-y-8">
      {/* ── Section 1: Webform Information ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SectionBadge num={1} />
          <h3 className="text-base font-semibold">Webform Information</h3>
        </div>
        <div className="ml-11 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Name<span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Webform name"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Primary Module<span className="text-destructive">*</span>
              </Label>
              <Select value={primaryModule} onValueChange={setPrimaryModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Return URL</Label>
              <Input
                value={returnUrl}
                onChange={(e) => setReturnUrl(e.target.value)}
                placeholder="https://example.com/thank-you"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={assignedTo || "__none__"}
                onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={captchaEnabled}
                onCheckedChange={setCaptchaEnabled}
              />
              <Label>Captcha Enabled</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: User Assignment ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SectionBadge num={2} />
          <h3 className="text-base font-semibold">User Assignment</h3>
        </div>
        <div className="ml-11 space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={roundRobinEnabled}
              onCheckedChange={setRoundRobinEnabled}
            />
            <Label>Enable Round-Robin Assignment</Label>
          </div>
          {roundRobinEnabled && (
            <div className="space-y-2">
              <Label>Select Users for Round-Robin</Label>
              <div className="rounded-md border p-3 space-y-1 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={roundRobinUserIds.includes(u.id)}
                      onChange={() => toggleRoundRobinUser(u.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm">
                      {u.first_name} {u.last_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Webform Fields ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SectionBadge num={3} />
          <h3 className="text-base font-semibold">Webform Fields</h3>
        </div>
        <div className="ml-11 space-y-3">
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="mr-1 size-3" />
            Add Field
          </Button>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Req</TableHead>
                  <TableHead className="w-12">Hide</TableHead>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Override Value</TableHead>
                  <TableHead>Reference Field</TableHead>
                  <TableHead className="w-28">Dup. Handling</TableHead>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No fields added
                    </TableCell>
                  </TableRow>
                ) : (
                  fields.map((f, idx) => (
                    <TableRow key={f.key}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={f.is_mandatory}
                          onChange={(e) =>
                            updateField(f.key, {
                              is_mandatory: e.target.checked,
                            })
                          }
                          className="accent-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={f.is_hidden}
                          onChange={(e) =>
                            updateField(f.key, {
                              is_hidden: e.target.checked,
                            })
                          }
                          className="accent-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={f.field_name}
                          onChange={(e) =>
                            updateField(f.key, {
                              field_name: e.target.value,
                            })
                          }
                          placeholder="e.g. first_name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={f.override_value}
                          onChange={(e) =>
                            updateField(f.key, {
                              override_value: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={f.reference_field}
                          onChange={(e) =>
                            updateField(f.key, {
                              reference_field: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={f.duplicate_handling}
                          onValueChange={(v) =>
                            updateField(f.key, {
                              duplicate_handling: v as FieldRow["duplicate_handling"],
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DUPLICATE_HANDLING_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => moveField(idx, -1)}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => moveField(idx, 1)}
                            disabled={idx === fields.length - 1}
                          >
                            <ArrowDown className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeField(f.key)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ── Section 4: Additional Hidden Fields ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SectionBadge num={4} />
          <h3 className="text-base font-semibold">Additional Hidden Fields</h3>
        </div>
        <div className="ml-11 space-y-3">
          <Button variant="outline" size="sm" onClick={addHiddenField}>
            <Plus className="mr-1 size-3" />
            Add Hidden Field
          </Button>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>URL Parameter</TableHead>
                  <TableHead>Override Value</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {hiddenFields.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hidden fields added
                    </TableCell>
                  </TableRow>
                ) : (
                  hiddenFields.map((hf) => (
                    <TableRow key={hf.key}>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={hf.field_name}
                          onChange={(e) =>
                            updateHiddenField(hf.key, {
                              field_name: e.target.value,
                            })
                          }
                          placeholder="e.g. source"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={hf.url_parameter}
                          onChange={(e) =>
                            updateHiddenField(hf.key, {
                              url_parameter: e.target.value,
                            })
                          }
                          placeholder="e.g. utm_source"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={hf.override_value}
                          onChange={(e) =>
                            updateHiddenField(hf.key, {
                              override_value: e.target.value,
                            })
                          }
                          placeholder="e.g. website"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeHiddenField(hf.key)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/settings/webforms")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
        >
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}
