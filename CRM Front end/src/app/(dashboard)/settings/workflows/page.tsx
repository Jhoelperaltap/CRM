"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowRuleForm } from "@/components/workflows/workflow-rule-form";
import {
  getWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
} from "@/lib/api/workflows";
import {
  WorkflowRule,
  TRIGGER_TYPE_LABELS,
  ACTION_TYPE_LABELS,
} from "@/types/workflows";

export default function WorkflowsPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkflowRules();
      setRules(data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async (payload: Partial<WorkflowRule>) => {
    if (editingRule) {
      await updateWorkflowRule(editingRule.id, payload);
    } else {
      await createWorkflowRule(payload);
    }
    setDialogOpen(false);
    setEditingRule(null);
    fetchRules();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteWorkflowRule(deleteId);
      setDeleteId(null);
      fetchRules();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Workflow Rules"
        description="Automate actions based on triggers and conditions"
        actions={
          <Button
            onClick={() => {
              setEditingRule(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            New Rule
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No workflow rules configured.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Executions</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TRIGGER_TYPE_LABELS[rule.trigger_type] ||
                        rule.trigger_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {ACTION_TYPE_LABELS[rule.action_type] ||
                        rule.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rule.is_active ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell className="text-right">
                    {rule.execution_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRule(rule);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteId(rule.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Rule" : "Create Workflow Rule"}
            </DialogTitle>
          </DialogHeader>
          <WorkflowRuleForm
            rule={editingRule}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Workflow Rule"
        description="This will permanently delete this workflow rule. Continue?"
      />
    </div>
  );
}
