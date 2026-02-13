"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppointment, deleteAppointment } from "@/lib/api/appointments";
import type { Appointment } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { getAppointment(id).then(setApt).catch(console.error).finally(() => setLoading(false)); }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!apt) return <div>Appointment not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={apt.title} backHref="/appointments" actions={<>
        <Button variant="outline" asChild><Link href={`/appointments/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link></Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
      </>} />
      <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Start</span><span>{format(new Date(apt.start_datetime), "MMM d, yyyy h:mm a")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">End</span><span>{format(new Date(apt.end_datetime), "MMM d, yyyy h:mm a")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={apt.status} /></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{apt.contact ? `${apt.contact.first_name} ${apt.contact.last_name}` : "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span>{apt.assigned_to?.full_name || "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Case</span><span>{apt.case?.case_number || "-"}</span></div>
        {apt.description && <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{apt.description}</p></div>}
        {apt.notes && <div><span className="text-muted-foreground">Notes:</span><p className="mt-1">{apt.notes}</p></div>}
      </CardContent></Card>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Appointment" description="Are you sure? This cannot be undone." confirmLabel="Delete" onConfirm={async () => { await deleteAppointment(id); router.push("/appointments"); }} />
    </div>
  );
}
