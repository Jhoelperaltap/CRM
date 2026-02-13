"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Stamp,
  X,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getApprovals,
  createApproval,
  deleteApproval,
} from "@/lib/api/approvals";
import type { ApprovalListItem, ApprovalPayload } from "@/lib/api/approvals";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODULES = [
  { value: "cases", label: "Cases" },
  { value: "contacts", label: "Contacts" },
  { value: "corporations", label: "Corporations" },
  { value: "quotes", label: "Quotes" },
  { value: "tasks", label: "Tasks" },
  { value: "documents", label: "Documents" },
  { value: "appointments", label: "Appointments" },
  { value: "internal_tickets", label: "Internal Tickets" },
];

const ACTION_TYPES = [
  { value: "update_field", label: "Update Field" },
  { value: "send_email", label: "Send Email" },
  { value: "send_notification", label: "Send Notification" },
  { value: "create_task", label: "Create Task" },
];

/* ------------------------------------------------------------------ */
/*  Condition row                                                      */
/* ------------------------------------------------------------------ */

interface ConditionRow {
  key: number;
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  key: number;
  phase: "approval" | "rejection";
  action_type: string;
  action_title: string;
  is_active: boolean;
}

interface RuleRow {
  key: number;
  rule_number: number;
  conditions: ConditionRow[];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalListItem[]>([]);
  const [search, setSearch] = useState("");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  // Section 1: Basic Information
  const [formModule, setFormModule] = useState("cases");
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  // Section 2: Trigger
  const [formTrigger, setFormTrigger] = useState<"on_save" | "via_process">("on_save");

  // Section 3: Entry Criteria
  const [criteriaAll, setCriteriaAll] = useState<ConditionRow[]>([]);
  const [criteriaAny, setCriteriaAny] = useState<ConditionRow[]>([]);

  // Section 4: Rules
  const [applyOn, setApplyOn] = useState<"created_by" | "assigned_to">("assigned_to");
  const [rules, setRules] = useState<RuleRow[]>([]);

  // Section 5 & 6: Actions
  const [approvalActions, setApprovalActions] = useState<ActionRow[]>([]);
  const [rejectionActions, setRejectionActions] = useState<ActionRow[]>([]);

  let condKey = 100;
  let ruleKey = 200;
  let actKey = 300;

  /* ── Fetch ── */
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await getApprovals(params);
      setApprovals(data);
      if (data.length > 0) setShowInfo(false);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  /* ── Condition helpers ── */
  const addCondition = (
    setter: React.Dispatch<React.SetStateAction<ConditionRow[]>>
  ) => {
    setter((prev) => [
      ...prev,
      { key: ++condKey, field: "", operator: "equals", value: "" },
    ]);
  };

  const updateCondition = (
    setter: React.Dispatch<React.SetStateAction<ConditionRow[]>>,
    key: number,
    updates: Partial<ConditionRow>
  ) => {
    setter((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...updates } : c))
    );
  };

  const removeCondition = (
    setter: React.Dispatch<React.SetStateAction<ConditionRow[]>>,
    key: number
  ) => {
    setter((prev) => prev.filter((c) => c.key !== key));
  };

  /* ── Rule helpers ── */
  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { key: ++ruleKey, rule_number: prev.length + 1, conditions: [] },
    ]);
  };

  const removeRule = (key: number) => {
    setRules((prev) => prev.filter((r) => r.key !== key));
  };

  /* ── Action helpers ── */
  const addAction = (phase: "approval" | "rejection") => {
    const row: ActionRow = {
      key: ++actKey,
      phase,
      action_type: "update_field",
      action_title: "",
      is_active: true,
    };
    if (phase === "approval") {
      setApprovalActions((prev) => [...prev, row]);
    } else {
      setRejectionActions((prev) => [...prev, row]);
    }
  };

  const updateAction = (
    setter: React.Dispatch<React.SetStateAction<ActionRow[]>>,
    key: number,
    updates: Partial<ActionRow>
  ) => {
    setter((prev) =>
      prev.map((a) => (a.key === key ? { ...a, ...updates } : a))
    );
  };

  const removeAction = (
    setter: React.Dispatch<React.SetStateAction<ActionRow[]>>,
    key: number
  ) => {
    setter((prev) => prev.filter((a) => a.key !== key));
  };

  /* ── Reset form ── */
  const resetForm = () => {
    setFormModule("cases");
    setFormName("");
    setFormActive(true);
    setFormDescription("");
    setFormTrigger("on_save");
    setCriteriaAll([]);
    setCriteriaAny([]);
    setApplyOn("assigned_to");
    setRules([]);
    setApprovalActions([]);
    setRejectionActions([]);
  };

  /* ── Submit ── */
  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload: ApprovalPayload = {
        name: formName,
        module: formModule,
        is_active: formActive,
        description: formDescription,
        trigger: formTrigger,
        entry_criteria_all: criteriaAll.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        entry_criteria_any: criteriaAny.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        apply_on: applyOn,
        rules: rules.map((r) => ({
          rule_number: r.rule_number,
          conditions: r.conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
          owner_profile_ids: [],
          approver_ids: [],
        })),
        actions: [
          ...approvalActions.map((a) => ({
            phase: a.phase,
            action_type: a.action_type,
            action_title: a.action_title,
            is_active: a.is_active,
          })),
          ...rejectionActions.map((a) => ({
            phase: a.phase,
            action_type: a.action_type,
            action_title: a.action_title,
            is_active: a.is_active,
          })),
        ],
      };
      await createApproval(payload);
      setFormOpen(false);
      resetForm();
      fetchApprovals();
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    try {
      await deleteApproval(id);
      fetchApprovals();
    } catch {
      /* empty */
    }
  };

  /* ── Section number badge ── */
  const SectionBadge = ({ num }: { num: number }) => (
    <div className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
      {num}
    </div>
  );

  /* ── Condition row component ── */
  const ConditionRowUI = ({
    cond,
    onChange,
    onRemove,
  }: {
    cond: ConditionRow;
    onChange: (updates: Partial<ConditionRow>) => void;
    onRemove: () => void;
  }) => (
    <div className="flex items-center gap-2">
      <Input
        className="flex-1"
        placeholder="Field name"
        value={cond.field}
        onChange={(e) => onChange({ field: e.target.value })}
      />
      <Select
        value={cond.operator}
        onValueChange={(v) => onChange({ operator: v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="equals">Equals</SelectItem>
          <SelectItem value="not_equals">Not Equals</SelectItem>
          <SelectItem value="contains">Contains</SelectItem>
          <SelectItem value="greater_than">Greater Than</SelectItem>
          <SelectItem value="less_than">Less Than</SelectItem>
          <SelectItem value="is_empty">Is Empty</SelectItem>
          <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="flex-1"
        placeholder="Value"
        value={cond.value}
        onChange={(e) => onChange({ value: e.target.value })}
      />
      <Button variant="ghost" size="icon" className="size-8" onClick={onRemove}>
        <X className="size-4" />
      </Button>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="space-y-4">
      <PageHeader
        title="Approvals"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Approval
          </Button>
        }
      />

      {/* ── Info overlay (first visit) ── */}
      {showInfo && !formOpen && approvals.length === 0 && !loading && (
        <Card className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={() => setShowInfo(false)}
          >
            <X className="size-4" />
          </Button>
          <CardContent className="py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: illustration placeholders */}
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="flex items-center gap-16">
                  <div className="text-center">
                    <div className="mb-3 rounded-full bg-muted p-8">
                      <Stamp className="size-12 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Manual Approval</p>
                  </div>
                  <div className="h-px w-8 bg-border" />
                  <div className="text-center">
                    <div className="mb-3 rounded-full bg-primary/10 p-8">
                      <Stamp className="size-12 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Automated Approval</p>
                  </div>
                </div>
              </div>

              {/* Right: info */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Are you waiting?</h2>
                <p className="text-sm text-muted-foreground">
                  For a quote to be approved before you send it out?<br />
                  For your expense approval for reimbursement?<br />
                  For your marketing budget to be approved?
                </p>

                <h3 className="text-lg font-semibold">Wait no more</h3>
                <p className="text-sm text-muted-foreground">
                  Automate and speed up approvals by configuring rules and
                  approvers
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Pick a module and define approval process entry criteria</li>
                  <li>Set up approval business rules</li>
                  <li>Set up approver matrix</li>
                </ol>

                <Button onClick={() => setFormOpen(true)}>Get Started</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Search bar ── */}
      {!showInfo && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search approvals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <LoadingSpinner />
      ) : approvals.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="capitalize">
                    {a.module.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={a.is_active ? "default" : "secondary"}
                    >
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {a.trigger.replace("_", " ")}
                  </TableCell>
                  <TableCell>{a.rule_count}</TableCell>
                  <TableCell>
                    {format(new Date(a.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/settings/approvals/${a.id}`)
                          }
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(a.id)}
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
      ) : null}

      {/* ── Add Approval Form Dialog ── */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Approval</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* ── Section 1: Basic Information ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SectionBadge num={1} />
                <h3 className="text-base font-semibold">Basic Information</h3>
              </div>
              <div className="ml-11 space-y-4">
                <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <Label>Select Module</Label>
                  <Select value={formModule} onValueChange={setFormModule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label>
                    Name<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Approval name"
                  />

                  <Label>Status</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formActive}
                        onChange={() => setFormActive(true)}
                        className="accent-primary"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formActive}
                        onChange={() => setFormActive(false)}
                        className="accent-primary"
                      />
                      <span className="text-sm">InActive</span>
                    </label>
                  </div>

                  <Label>Description</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Approval Trigger ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SectionBadge num={2} />
                <h3 className="text-base font-semibold">Approval Trigger</h3>
              </div>
              <div className="ml-11 space-y-2">
                <Label>Trigger Approval</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formTrigger === "on_save"}
                      onChange={() => setFormTrigger("on_save")}
                      className="accent-primary"
                    />
                    <span className="text-sm">On Save</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formTrigger === "via_process"}
                      onChange={() => setFormTrigger("via_process")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Via Process</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Section 3: Entry Criteria ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SectionBadge num={3} />
                <h3 className="text-base font-semibold">
                  Entry Criteria<span className="text-destructive">*</span>
                </h3>
              </div>
              <div className="ml-11 space-y-4">
                {/* All conditions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      All Conditions (All conditions must be met)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCondition(setCriteriaAll)}
                    >
                      <Plus className="mr-1 size-3" />
                      Add Condition
                    </Button>
                  </div>
                  {criteriaAll.map((c) => (
                    <ConditionRowUI
                      key={c.key}
                      cond={c}
                      onChange={(u) =>
                        updateCondition(setCriteriaAll, c.key, u)
                      }
                      onRemove={() => removeCondition(setCriteriaAll, c.key)}
                    />
                  ))}
                </div>

                {/* Any conditions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Any Conditions (At least one of the conditions must be
                      met)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCondition(setCriteriaAny)}
                    >
                      <Plus className="mr-1 size-3" />
                      Add Condition
                    </Button>
                  </div>
                  {criteriaAny.map((c) => (
                    <ConditionRowUI
                      key={c.key}
                      cond={c}
                      onChange={(u) =>
                        updateCondition(setCriteriaAny, c.key, u)
                      }
                      onRemove={() => removeCondition(setCriteriaAny, c.key)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 4: Rules ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SectionBadge num={4} />
                <h3 className="text-base font-semibold">Rules</h3>
              </div>
              <div className="ml-11 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    User profiles to be applied on
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={applyOn === "created_by"}
                      onChange={() => setApplyOn("created_by")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Created By</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={applyOn === "assigned_to"}
                      onChange={() => setApplyOn("assigned_to")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Assigned To</span>
                  </label>
                </div>

                <Button variant="outline" size="sm" onClick={addRule}>
                  Add Rule
                </Button>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rule #</TableHead>
                        <TableHead>Conditions</TableHead>
                        <TableHead>Owner Profiles</TableHead>
                        <TableHead>Approvers</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No Rules Added
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules.map((r, idx) => (
                          <TableRow key={r.key}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.conditions.length} conditions
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              —
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              —
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => removeRule(r.key)}
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

            {/* ── Section 5: Final Approval Actions ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SectionBadge num={5} />
                <h3 className="text-base font-semibold">
                  Final Approval Actions
                </h3>
              </div>
              <div className="ml-11 space-y-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Add Action
                      <ChevronDown className="ml-1 size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {ACTION_TYPES.map((t) => (
                      <DropdownMenuItem
                        key={t.value}
                        onClick={() => {
                          addAction("approval");
                          setApprovalActions((prev) => {
                            const last = prev[prev.length - 1];
                            if (last) last.action_type = t.value;
                            return [...prev];
                          });
                        }}
                      >
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead>Action Type</TableHead>
                        <TableHead>Action Title</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvalActions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No Actions Added
                          </TableCell>
                        </TableRow>
                      ) : (
                        approvalActions.map((a) => (
                          <TableRow key={a.key}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={a.is_active}
                                onChange={(e) =>
                                  updateAction(
                                    setApprovalActions,
                                    a.key,
                                    { is_active: e.target.checked }
                                  )
                                }
                                className="accent-primary"
                              />
                            </TableCell>
                            <TableCell className="capitalize text-sm">
                              {a.action_type.replace("_", " ")}
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={a.action_title}
                                onChange={(e) =>
                                  updateAction(
                                    setApprovalActions,
                                    a.key,
                                    { action_title: e.target.value }
                                  )
                                }
                                placeholder="Action title"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() =>
                                  removeAction(setApprovalActions, a.key)
                                }
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

            {/* ── Section 6: Final Rejection Actions ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SectionBadge num={6} />
                <h3 className="text-base font-semibold">
                  Final Rejection Actions
                </h3>
              </div>
              <div className="ml-11 space-y-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Add Action
                      <ChevronDown className="ml-1 size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {ACTION_TYPES.map((t) => (
                      <DropdownMenuItem
                        key={t.value}
                        onClick={() => {
                          addAction("rejection");
                          setRejectionActions((prev) => {
                            const last = prev[prev.length - 1];
                            if (last) last.action_type = t.value;
                            return [...prev];
                          });
                        }}
                      >
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead>Action Type</TableHead>
                        <TableHead>Action Title</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejectionActions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No Actions Added
                          </TableCell>
                        </TableRow>
                      ) : (
                        rejectionActions.map((a) => (
                          <TableRow key={a.key}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={a.is_active}
                                onChange={(e) =>
                                  updateAction(
                                    setRejectionActions,
                                    a.key,
                                    { is_active: e.target.checked }
                                  )
                                }
                                className="accent-primary"
                              />
                            </TableCell>
                            <TableCell className="capitalize text-sm">
                              {a.action_type.replace("_", " ")}
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={a.action_title}
                                onChange={(e) =>
                                  updateAction(
                                    setRejectionActions,
                                    a.key,
                                    { action_title: e.target.value }
                                  )
                                }
                                placeholder="Action title"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() =>
                                  removeAction(setRejectionActions, a.key)
                                }
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
