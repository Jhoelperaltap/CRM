"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/lib/api/appointments";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader title="New Appointment" backHref="/appointments" />
      <div className="rounded-lg border p-6">
        <AppointmentForm onSubmit={async (data) => { setLoading(true); try { await createAppointment(data); router.push("/appointments"); } catch { alert("Failed"); } finally { setLoading(false); } }} isLoading={loading} />
      </div>
    </div>
  );
}
