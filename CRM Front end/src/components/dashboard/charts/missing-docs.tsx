"use client";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { Badge } from "@/components/ui/badge";

interface MissingDoc { case_id: string; case_number: string; title: string; contact_name: string; missing_types: string[]; }
interface Props { data: MissingDoc[]; }

export function MissingDocs({ data }: Props) {
  return (
    <WidgetWrapper title={`Missing Documents (${data.length} cases)`}>
      {data.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">All cases have required documents</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.map((d) => (
            <div key={d.case_id} className="rounded-md border p-2 text-sm">
              <div className="flex justify-between">
                <span className="font-mono text-xs">{d.case_number}</span>
                <span className="text-muted-foreground text-xs">{d.contact_name}</span>
              </div>
              <p className="text-xs">{d.title}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {d.missing_types.map((t) => (
                  <Badge key={t} variant="outline" className="border-red-200 bg-red-50 text-red-700 text-xs">{t.replace(/_/g, " ")}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
