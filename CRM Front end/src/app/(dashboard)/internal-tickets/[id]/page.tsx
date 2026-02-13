"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getInternalTicket,
  deleteInternalTicket,
} from "@/lib/api/internal-tickets";
import type { InternalTicket } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function InternalTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<InternalTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    getInternalTicket(id)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ticket.ticket_number} — ${ticket.title}`}
        backHref="/internal-tickets"
        actions={
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        }
      />

      {/* Ticket Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Summary Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Ticket Number">
            <span className="font-mono">{ticket.ticket_number}</span>
          </InfoRow>
          <InfoRow label="Title">{ticket.title}</InfoRow>
          {ticket.description && (
            <div>
              <span className="text-muted-foreground">Description:</span>
              <p className="mt-1 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Status">
            <StatusBadge status={ticket.status} />
          </InfoRow>
          <InfoRow label="Priority">
            <StatusBadge status={ticket.priority} />
          </InfoRow>
          <InfoRow label="Group">{ticket.group?.name || "-"}</InfoRow>
          <InfoRow label="Assigned To">
            {ticket.assigned_to?.full_name || "-"}
          </InfoRow>
          <InfoRow label="Channel">
            {ticket.channel ? ticket.channel.replace(/_/g, " ") : "-"}
          </InfoRow>
          <InfoRow label="Category">
            {ticket.category ? ticket.category.replace(/_/g, " ") : "-"}
          </InfoRow>
          {ticket.resolution && (
            <div>
              <span className="text-muted-foreground">Resolution:</span>
              <p className="mt-1 whitespace-pre-wrap">{ticket.resolution}</p>
            </div>
          )}
          <InfoRow label="Resolution Type">
            {ticket.resolution_type
              ? ticket.resolution_type.replace(/_/g, " ")
              : "-"}
          </InfoRow>
          <InfoRow label="Rating">
            {ticket.rating
              ? `${"★".repeat(Number(ticket.rating))}${"☆".repeat(5 - Number(ticket.rating))}`
              : "-"}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Email">{ticket.email || "-"}</InfoRow>
          <InfoRow label="Deferred Date">
            {ticket.deferred_date || "-"}
          </InfoRow>
          <InfoRow label="Reopen Count">{ticket.reopen_count}</InfoRow>
          {ticket.satisfaction_survey_feedback && (
            <div>
              <span className="text-muted-foreground">Satisfaction Survey Feedback:</span>
              <p className="mt-1 whitespace-pre-wrap">
                {ticket.satisfaction_survey_feedback}
              </p>
            </div>
          )}
          <InfoRow label="Employee">
            {ticket.employee?.full_name || "-"}
          </InfoRow>
          <InfoRow label="Created By">
            {ticket.created_by?.full_name || "-"}
          </InfoRow>
        </CardContent>
      </Card>

      {/* SLA Information */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="SLA Name">{ticket.sla_name || "-"}</InfoRow>
          <InfoRow label="SLA Hours">
            {ticket.sla_hours != null ? `${ticket.sla_hours}h` : "-"}
          </InfoRow>
          <InfoRow label="SLA Breached">
            {ticket.sla_breached_at
              ? new Date(ticket.sla_breached_at).toLocaleString()
              : "-"}
          </InfoRow>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Internal Ticket"
        description="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          await deleteInternalTicket(id);
          router.push("/internal-tickets");
        }}
      />
    </div>
  );
}
