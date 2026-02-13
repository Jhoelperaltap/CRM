"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkflowRule,
  TRIGGER_TYPE_LABELS,
  ACTION_TYPE_LABELS,
} from "@/types/workflows";

interface WorkflowRuleFormProps {
  rule?: WorkflowRule | null;
  onSave: (data: Partial<WorkflowRule>) => Promise<void>;
  onCancel: () => void;
}

export function WorkflowRuleForm({
  rule,
  onSave,
  onCancel,
}: WorkflowRuleFormProps) {
  const [name, setName] = useState(rule?.name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [triggerType, setTriggerType] = useState(rule?.trigger_type || "");
  const [triggerConfig, setTriggerConfig] = useState(
    JSON.stringify(rule?.trigger_config || {}, null, 2)
  );
  const [conditions, setConditions] = useState(
    JSON.stringify(rule?.conditions || {}, null, 2)
  );
  const [actionType, setActionType] = useState(rule?.action_type || "");
  const [actionConfig, setActionConfig] = useState(
    JSON.stringify(rule?.action_config || {}, null, 2)
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name,
        description,
        is_active: isActive,
        trigger_type: triggerType,
        trigger_config: JSON.parse(triggerConfig),
        conditions: JSON.parse(conditions),
        action_type: actionType,
        action_config: JSON.parse(actionConfig),
      });
    } catch {
      // errors handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Active</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Trigger Type</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger>
              <SelectValue placeholder="Select trigger..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Action Type</Label>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger>
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trigger_config">Trigger Config (JSON)</Label>
        <textarea
          id="trigger_config"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[80px]"
          value={triggerConfig}
          onChange={(e) => setTriggerConfig(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="conditions">Conditions (JSON)</Label>
        <textarea
          id="conditions"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[80px]"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="action_config">Action Config (JSON)</Label>
        <textarea
          id="action_config"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[80px]"
          value={actionConfig}
          onChange={(e) => setActionConfig(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : rule ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
