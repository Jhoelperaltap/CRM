"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slaApi, escalationRuleApi } from "@/lib/api/sla";
import type { SLA, EscalationRule } from "@/types/sla";

const slaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  response_time_urgent: z.number().min(0.1),
  response_time_high: z.number().min(0.1),
  response_time_medium: z.number().min(0.1),
  response_time_low: z.number().min(0.1),
  resolution_time_urgent: z.number().min(0.1),
  resolution_time_high: z.number().min(0.1),
  resolution_time_medium: z.number().min(0.1),
  resolution_time_low: z.number().min(0.1),
  use_business_hours: z.boolean(),
  escalation_enabled: z.boolean(),
  escalation_notify_assignee: z.boolean(),
  escalation_notify_manager: z.boolean(),
  escalation_email: z.string().email().optional().or(z.literal("")),
});

const escalationRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trigger_type: z.enum(["breach", "percentage", "hours_before"]),
  trigger_value: z.number().min(0),
  applies_to: z.enum(["response", "resolution", "both"]),
  notify_assignee: z.boolean(),
  notify_manager: z.boolean(),
  email_subject: z.string().optional(),
  email_body: z.string().optional(),
});

type SLAFormValues = z.infer<typeof slaFormSchema>;
type EscalationRuleFormValues = z.infer<typeof escalationRuleSchema>;

export default function EditSLAPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sla, setSla] = useState<SLA | null>(null);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [ruleDialog, setRuleDialog] = useState<{
    open: boolean;
    rule: EscalationRule | null;
  }>({ open: false, rule: null });
  const [deleteRuleDialog, setDeleteRuleDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const form = useForm<SLAFormValues>({
    resolver: zodResolver(slaFormSchema),
  });

  const ruleForm = useForm<EscalationRuleFormValues>({
    resolver: zodResolver(escalationRuleSchema),
    defaultValues: {
      name: "",
      trigger_type: "breach",
      trigger_value: 0,
      applies_to: "both",
      notify_assignee: true,
      notify_manager: false,
      email_subject: "",
      email_body: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slaData, rulesData] = await Promise.all([
          slaApi.get(id),
          slaApi.getEscalationRules(id),
        ]);
        setSla(slaData);
        setEscalationRules(rulesData);
        form.reset({
          name: slaData.name,
          description: slaData.description,
          is_active: slaData.is_active,
          is_default: slaData.is_default,
          response_time_urgent: slaData.response_time_urgent,
          response_time_high: slaData.response_time_high,
          response_time_medium: slaData.response_time_medium,
          response_time_low: slaData.response_time_low,
          resolution_time_urgent: slaData.resolution_time_urgent,
          resolution_time_high: slaData.resolution_time_high,
          resolution_time_medium: slaData.resolution_time_medium,
          resolution_time_low: slaData.resolution_time_low,
          use_business_hours: slaData.use_business_hours,
          escalation_enabled: slaData.escalation_enabled,
          escalation_notify_assignee: slaData.escalation_notify_assignee,
          escalation_notify_manager: slaData.escalation_notify_manager,
          escalation_email: slaData.escalation_email || "",
        });
      } catch {
        setError("Failed to load SLA");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, form]);

  const onSubmit = async (data: SLAFormValues) => {
    setSaving(true);
    setError(null);
    try {
      await slaApi.update(id, {
        ...data,
        escalation_email: data.escalation_email || undefined,
      });
      router.push("/settings/sla");
    } catch (err) {
      console.error("Failed to update SLA:", err);
      setError("Failed to update SLA. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async (data: EscalationRuleFormValues) => {
    try {
      if (ruleDialog.rule) {
        await escalationRuleApi.update(ruleDialog.rule.id, data);
      } else {
        await escalationRuleApi.create({
          ...data,
          sla: id,
        });
      }
      const rulesData = await slaApi.getEscalationRules(id);
      setEscalationRules(rulesData);
      setRuleDialog({ open: false, rule: null });
      ruleForm.reset();
    } catch {
      setError("Failed to save escalation rule");
    }
  };

  const handleDeleteRule = async () => {
    try {
      await escalationRuleApi.delete(deleteRuleDialog.id);
      const rulesData = await slaApi.getEscalationRules(id);
      setEscalationRules(rulesData);
      setDeleteRuleDialog({ open: false, id: "", name: "" });
    } catch {
      setError("Failed to delete escalation rule");
    }
  };

  const openRuleDialog = (rule?: EscalationRule) => {
    if (rule) {
      ruleForm.reset({
        name: rule.name,
        trigger_type: rule.trigger_type,
        trigger_value: rule.trigger_value,
        applies_to: rule.applies_to,
        notify_assignee: rule.notify_assignee,
        notify_manager: rule.notify_manager,
        email_subject: rule.email_subject,
        email_body: rule.email_body,
      });
    } else {
      ruleForm.reset({
        name: "",
        trigger_type: "breach",
        trigger_value: 0,
        applies_to: "both",
        notify_assignee: true,
        notify_manager: false,
        email_subject: "",
        email_body: "",
      });
    }
    setRuleDialog({ open: true, rule: rule || null });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!sla) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        SLA not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings/sla")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit SLA</h1>
          <p className="text-muted-foreground">{sla.name}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-8">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Active</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Default</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="use_business_hours"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Use Business Hours
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Time Targets (hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="response_time_urgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600">Urgent</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response_time_high"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-orange-600">High</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response_time_medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-600">Medium</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response_time_low"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-600">Low</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolution Time Targets (hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="resolution_time_urgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600">Urgent</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolution_time_high"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-orange-600">High</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolution_time_medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-600">Medium</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resolution_time_low"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-600">Low</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escalation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="escalation_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Enable Escalation
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-8 pl-6">
                <FormField
                  control={form.control}
                  name="escalation_notify_assignee"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("escalation_enabled")}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Notify Assignee
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="escalation_notify_manager"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("escalation_enabled")}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Notify Manager
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="escalation_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Escalation Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="escalation@company.com"
                        {...field}
                        disabled={!form.watch("escalation_enabled")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/settings/sla")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Escalation Rules</CardTitle>
              <CardDescription>
                Configure automatic escalation actions when SLAs are at risk or
                breached
              </CardDescription>
            </div>
            <Button onClick={() => openRuleDialog()}>
              <Plus className="mr-2 size-4" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {escalationRules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalationRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {rule.name}
                        {!rule.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rule.trigger_type === "breach"
                        ? "On Breach"
                        : rule.trigger_type === "percentage"
                        ? `At ${rule.trigger_value}% elapsed`
                        : `${rule.trigger_value}h before breach`}
                    </TableCell>
                    <TableCell className="capitalize">{rule.applies_to}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {rule.notify_assignee && (
                          <Badge variant="outline">Assignee</Badge>
                        )}
                        {rule.notify_manager && (
                          <Badge variant="outline">Manager</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRuleDialog(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() =>
                            setDeleteRuleDialog({
                              open: true,
                              id: rule.id,
                              name: rule.name,
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No escalation rules configured. Add rules to automate
              notifications when SLAs are at risk.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={ruleDialog.open}
        onOpenChange={(open) => {
          if (!open) setRuleDialog({ open: false, rule: null });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {ruleDialog.rule ? "Edit Escalation Rule" : "Add Escalation Rule"}
            </DialogTitle>
          </DialogHeader>
          <Form {...ruleForm}>
            <form
              onSubmit={ruleForm.handleSubmit(handleSaveRule)}
              className="space-y-4"
            >
              <FormField
                control={ruleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., First Warning"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ruleForm.control}
                  name="trigger_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trigger" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="breach">On Breach</SelectItem>
                          <SelectItem value="percentage">
                            % Time Elapsed
                          </SelectItem>
                          <SelectItem value="hours_before">
                            Hours Before Breach
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={ruleForm.control}
                  name="trigger_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {ruleForm.watch("trigger_type") === "percentage"
                          ? "Percentage"
                          : "Hours"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          {...field}
                          disabled={
                            ruleForm.watch("trigger_type") === "breach"
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={ruleForm.control}
                name="applies_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applies To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="both">
                          Both Response & Resolution
                        </SelectItem>
                        <SelectItem value="response">
                          Response Time Only
                        </SelectItem>
                        <SelectItem value="resolution">
                          Resolution Time Only
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={ruleForm.control}
                  name="notify_assignee"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Notify Assignee
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={ruleForm.control}
                  name="notify_manager"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Notify Manager
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRuleDialog({ open: false, rule: null })}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {ruleDialog.rule ? "Save Changes" : "Add Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteRuleDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteRuleDialog({ open: false, id: "", name: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Escalation Rule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteRuleDialog.name}</strong>?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteRuleDialog({ open: false, id: "", name: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
