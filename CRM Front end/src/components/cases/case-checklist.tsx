"use client";

import { useEffect, useState } from "react";
import { getCaseChecklist, toggleChecklistItem } from "@/lib/api/checklists";
import type { CaseChecklist as CaseChecklistType } from "@/types/checklists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ClipboardList } from "lucide-react";

interface CaseChecklistProps {
  caseId: string;
}

export function CaseChecklist({ caseId }: CaseChecklistProps) {
  const [checklist, setChecklist] = useState<CaseChecklistType | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    getCaseChecklist(caseId)
      .then(setChecklist)
      .catch(() => setChecklist(null))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleToggle = async (itemId: string) => {
    if (!checklist) return;
    setTogglingId(itemId);
    try {
      const updated = await toggleChecklistItem(caseId, itemId);
      setChecklist((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.map((item) =>
          item.id === itemId ? { ...item, ...updated } : item
        );
        const completedCount = newItems.filter((i) => i.is_completed).length;
        return {
          ...prev,
          items: newItems,
          completed_count: completedCount,
          progress_percent:
            prev.total_count > 0
              ? Math.round((completedCount / prev.total_count) * 100)
              : 0,
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return null;
  if (!checklist) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Checklist
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {checklist.completed_count} / {checklist.total_count} completed
          </span>
        </div>
        <Progress value={checklist.progress_percent} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklist.items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <Checkbox
                checked={item.is_completed}
                disabled={togglingId === item.id}
                onCheckedChange={() => handleToggle(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    item.is_completed
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {item.title}
                  {item.is_required && (
                    <span className="ml-1 text-red-500 text-xs">*</span>
                  )}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                )}
                {item.is_completed && item.completed_by_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completed by {item.completed_by_name}
                    {item.completed_at &&
                      ` on ${new Date(item.completed_at).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
