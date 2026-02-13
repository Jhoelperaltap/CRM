"use client";

import type { PortalChecklist } from "@/types/portal";
import { CheckCircle2, Circle } from "lucide-react";

interface Props {
  checklist: PortalChecklist;
}

export function CaseProgress({ checklist }: Props) {
  const percentage =
    checklist.total_count > 0
      ? Math.round((checklist.completed_count / checklist.total_count) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Checklist Progress
          </span>
          <span className="text-muted-foreground">
            {checklist.completed_count}/{checklist.total_count} ({percentage}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {checklist.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {item.is_completed ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <Circle className="size-4 text-muted-foreground" />
            )}
            <span className={`text-sm ${item.is_completed ? "text-muted-foreground line-through" : ""}`}>
              {item.title}
              {item.is_required && !item.is_completed && (
                <span className="ml-1 text-xs text-destructive">*</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
