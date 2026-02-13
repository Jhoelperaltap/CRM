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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CRMModule } from "@/types/index";

interface NumberingConfigFormProps {
  module: CRMModule;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onReset: () => Promise<void>;
}

export function NumberingConfigForm({
  module,
  onSave,
  onReset,
}: NumberingConfigFormProps) {
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [format, setFormat] = useState("");
  const [resetPeriod, setResetPeriod] = useState("yearly");

  useEffect(() => {
    setPrefix(module.number_prefix);
    setFormat(module.number_format);
    setResetPeriod(module.number_reset_period);
  }, [module]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        number_prefix: prefix,
        number_format: format,
        number_reset_period: resetPeriod,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await onReset();
      setResetOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate preview
  const now = new Date();
  let preview = "";
  try {
    preview = format
      .replace("{prefix}", prefix)
      .replace("{year}", String(now.getFullYear()))
      .replace("{month}", String(now.getMonth() + 1).padStart(2, "0"))
      .replace("{day}", String(now.getDate()).padStart(2, "0"))
      .replace(
        "{YYYYMMDD}",
        `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
      )
      .replace(/\{seq:(\d+)d\}/, (_, digits) =>
        String(module.number_next_seq).padStart(parseInt(digits), "0")
      )
      .replace("{seq}", String(module.number_next_seq));
  } catch {
    preview = "(invalid format)";
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Numbering Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prefix</Label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. TC"
              />
            </div>
            <div>
              <Label>Reset Period</Label>
              <Select value={resetPeriod} onValueChange={setResetPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Number Format</Label>
            <Input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="{prefix}-{year}-{seq:04d}"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variables: {"{prefix}"}, {"{year}"}, {"{month}"}, {"{day}"},
              {" {YYYYMMDD}"}, {"{seq:04d}"} (zero-padded sequence)
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/50">
            <div>
              <p className="text-sm font-medium">Preview</p>
              <p className="text-lg font-mono">{preview || "(no format set)"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Next Sequence</p>
              <p className="text-lg font-mono">{module.number_next_seq}</p>
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setResetOpen(true)}
            >
              Reset Counter
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Numbering"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset Numbering Counter"
        description="This will reset the sequence counter to 1. The next record will start numbering from 1. This cannot be undone."
        confirmLabel="Reset"
        onConfirm={handleReset}
      />
    </>
  );
}
