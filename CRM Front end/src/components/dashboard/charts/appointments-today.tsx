"use client";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

interface AppointmentItem { id: string; title: string; start_datetime: string; end_datetime: string; status: string; contact_name: string; assigned_to_name: string; }
interface Props { data: AppointmentItem[]; }

export function AppointmentsToday({ data }: Props) {
  return (
    <WidgetWrapper title={`Appointments Today (${data.length})`}>
      {data.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">No appointments today</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground text-xs">{a.contact_name} &middot; {format(new Date(a.start_datetime), "h:mm a")}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}
