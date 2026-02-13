"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getAppointment } from "@/lib/api/appointments";
import type { Appointment, CalendarAppointment } from "@/types";
import { Clock, MapPin, User, Briefcase, Repeat, Pencil } from "lucide-react";

interface Props {
  appointmentId: string | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#10b981",
  in_progress: "#f59e0b",
  completed: "#6b7280",
  cancelled: "#ef4444",
  no_show: "#f97316",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const LOCATION_LABELS: Record<string, string> = {
  office: "Office",
  virtual: "Virtual",
  client_site: "Client Site",
  phone: "Phone",
};

export function AppointmentSlideOver({ appointmentId, open, onClose }: Props) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!appointmentId || !open) return;
    setLoading(true);
    getAppointment(appointmentId)
      .then(setAppointment)
      .catch(() => setAppointment(null))
      .finally(() => setLoading(false));
  }, [appointmentId, open]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{loading ? "Loading..." : appointment?.title ?? "Appointment"}</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && appointment && (
          <div className="mt-6 space-y-5">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[appointment.status] || "#6b7280" }}
              />
              <span className="text-sm font-medium">
                {STATUS_LABELS[appointment.status] || appointment.status}
              </span>
            </div>

            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-4 text-muted-foreground" />
              <div className="text-sm">
                <div>{formatDateTime(appointment.start_datetime)}</div>
                <div className="text-muted-foreground">
                  to {formatDateTime(appointment.end_datetime)}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <MapPin className="size-4 text-muted-foreground" />
              <span className="text-sm">
                {LOCATION_LABELS[appointment.location] || appointment.location}
              </span>
            </div>

            {/* Contact */}
            {appointment.contact && (
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm">
                  {appointment.contact.first_name} {appointment.contact.last_name}
                </span>
              </div>
            )}

            {/* Assigned to */}
            {appointment.assigned_to && (
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Assigned to: {appointment.assigned_to.full_name}
                </span>
              </div>
            )}

            {/* Case */}
            {appointment.case && (
              <div className="flex items-center gap-3">
                <Briefcase className="size-4 text-muted-foreground" />
                <span className="text-sm">
                  {appointment.case.case_number} - {appointment.case.title}
                </span>
              </div>
            )}

            {/* Recurrence */}
            {appointment.recurrence_pattern !== "none" && (
              <div className="flex items-center gap-3">
                <Repeat className="size-4 text-muted-foreground" />
                <span className="text-sm capitalize">
                  Repeats {appointment.recurrence_pattern}
                  {appointment.recurrence_end_date &&
                    ` until ${new Date(appointment.recurrence_end_date).toLocaleDateString()}`}
                </span>
              </div>
            )}

            {/* Description */}
            {appointment.description && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Description</div>
                <p className="text-sm">{appointment.description}</p>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Notes</div>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/appointments/${appointment.id}/edit`)}
              >
                <Pencil className="mr-1 size-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/appointments/${appointment.id}`)}
              >
                View Details
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
