"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCase, deleteCase } from "@/lib/api/cases";
import type { TaxCase } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusWorkflow } from "@/components/cases/status-workflow";
import { CaseNotes } from "@/components/cases/case-notes";
import { CaseChecklist } from "@/components/cases/case-checklist";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [taxCase, setTaxCase] = useState<TaxCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchCase = () => { getCase(id).then(setTaxCase).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { fetchCase(); }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!taxCase) return <div>Case not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`${taxCase.case_number} - ${taxCase.title}`} backHref="/cases" actions={<>
        <Button variant="outline" asChild><Link href={`/cases/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link></Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
      </>} />

      <div className="flex items-center gap-4">
        <StatusBadge status={taxCase.status} />
        <StatusBadge status={taxCase.priority} />
        <StatusWorkflow caseId={id} currentStatus={taxCase.status} onTransition={fetchCase} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Case Info</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{taxCase.case_type.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fiscal Year</span><span>{taxCase.fiscal_year}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{taxCase.contact ? `${taxCase.contact.first_name} ${taxCase.contact.last_name}` : "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Corporation</span><span>{taxCase.corporation?.name || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Preparer</span><span>{taxCase.assigned_preparer?.full_name || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Reviewer</span><span>{taxCase.reviewer?.full_name || "-"}</span></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Dates & Fees</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{taxCase.due_date || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Extension</span><span>{taxCase.extension_date || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Filed</span><span>{taxCase.filed_date || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Estimated Fee</span><span>{taxCase.estimated_fee ? `$${Number(taxCase.estimated_fee).toLocaleString()}` : "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Actual Fee</span><span>{taxCase.actual_fee ? `$${Number(taxCase.actual_fee).toLocaleString()}` : "-"}</span></div>
        </CardContent></Card>
      </div>

      <CaseChecklist caseId={id} />

      <CaseNotes caseId={id} notes={taxCase.notes || []} onNoteAdded={fetchCase} />

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Case" description="Are you sure? This cannot be undone." confirmLabel="Delete" onConfirm={async () => { await deleteCase(id); router.push("/cases"); }} />
    </div>
  );
}
