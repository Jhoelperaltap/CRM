"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppointment, updateAppointment } from "@/lib/api/appointments";
import type { Appointment } from "@/types";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAppointment(id).then(setApt).catch(console.error).finally(() => setLoading(false)); }, [id]);
  if (loading) return <LoadingSpinner />;
  if (!apt) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${apt.title}`} backHref={`/appointments/${id}`} />
      <div className="rounded-lg border p-6">
        <AppointmentForm
          defaultValues={{ title: apt.title, description: apt.description, start_datetime: apt.start_datetime?.slice(0, 16), end_datetime: apt.end_datetime?.slice(0, 16), status: apt.status as "scheduled", contact: apt.contact?.id, assigned_to: apt.assigned_to?.id, case: apt.case?.id, notes: apt.notes }}
          onSubmit={async (data) => { setSaving(true); try { await updateAppointment(id, data); router.push(`/appointments/${id}`); } catch { alert("Failed"); } finally { setSaving(false); } }}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
