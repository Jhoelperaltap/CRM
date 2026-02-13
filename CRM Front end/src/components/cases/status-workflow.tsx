"use client";
import { transitionCase } from "@/lib/api/cases";
import { Button } from "@/components/ui/button";

const TRANSITIONS: Record<string, string[]> = {
  new: ["in_progress", "waiting_for_documents"],
  waiting_for_documents: ["in_progress", "new"],
  in_progress: ["under_review", "waiting_for_documents", "new"],
  under_review: ["ready_to_file", "in_progress"],
  ready_to_file: ["filed", "under_review"],
  filed: ["completed", "under_review"],
  completed: ["closed"],
  closed: [],
};

interface Props { caseId: string; currentStatus: string; onTransition: () => void; }

export function StatusWorkflow({ caseId, currentStatus, onTransition }: Props) {
  const allowed = TRANSITIONS[currentStatus] || [];
  if (allowed.length === 0) return null;

  const handleTransition = async (status: string) => {
    try { await transitionCase(caseId, status); onTransition(); }
    catch { alert("Transition failed"); }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Transition to:</span>
      {allowed.map((s) => (
        <Button key={s} size="sm" variant="outline" onClick={() => handleTransition(s)}>
          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Button>
      ))}
    </div>
  );
}
