"use client";

import { useEffect, useState } from "react";
import { portalGetAppointments } from "@/lib/api/portal";
import type { PortalAppointment } from "@/types/portal";

const LOCATION_LABELS: Record<string, string> = {
  office: "Office",
  virtual: "Virtual",
  client_site: "Client Site",
  phone: "Phone",
};

export default function PortalAppointmentsPage() {
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalGetAppointments()
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.start_datetime >= now);
  const past = appointments.filter((a) => a.start_datetime < now);

  const renderAppointment = (appt: PortalAppointment) => {
    const start = new Date(appt.start_datetime);
    const end = new Date(appt.end_datetime);
    return (
      <div
        key={appt.id}
        className="rounded-lg border bg-card p-4"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">{appt.title}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {appt.status.replace("_", " ")}
          </span>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>
            {start.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            {start.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {end.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          <div>{LOCATION_LABELS[appt.location] || appt.location}</div>
          {appt.assigned_to_name && <div>With: {appt.assigned_to_name}</div>}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Appointments</h1>

      {appointments.length === 0 ? (
        <p className="text-muted-foreground">No appointments found.</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {upcoming.map(renderAppointment)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Past
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {past.map(renderAppointment)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
