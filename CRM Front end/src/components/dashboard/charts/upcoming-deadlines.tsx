"use client";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";

interface Props { data: Array<Record<string, unknown>>; }

export function UpcomingDeadlines({ data }: Props) {
  return (
    <WidgetWrapper title={`Upcoming Deadlines (${data.length})`}>
      {data.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">No upcoming deadlines</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div>
                <span className="font-mono text-xs">{String(c.case_number || "")}</span>
                <p className="text-xs">{String(c.title || "")}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{String(c.due_date || "")}</p>
                <StatusBadge status={String(c.priority || "medium")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
