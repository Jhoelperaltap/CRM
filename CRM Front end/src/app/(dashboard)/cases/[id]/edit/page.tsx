"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCase, updateCase } from "@/lib/api/cases";
import type { TaxCase } from "@/types";
import { CaseForm } from "@/components/cases/case-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [taxCase, setTaxCase] = useState<TaxCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getCase(id).then(setTaxCase).catch(console.error).finally(() => setLoading(false)); }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!taxCase) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${taxCase.case_number}`} backHref={`/cases/${id}`} />
      <div className="rounded-lg border p-6">
        <CaseForm
          defaultValues={{ title: taxCase.title, case_type: taxCase.case_type, fiscal_year: taxCase.fiscal_year, priority: taxCase.priority as "low"|"medium"|"high"|"urgent", contact: taxCase.contact?.id, corporation: taxCase.corporation?.id, assigned_preparer: taxCase.assigned_preparer?.id, reviewer: taxCase.reviewer?.id, estimated_fee: taxCase.estimated_fee?.toString(), due_date: taxCase.due_date || undefined, description: taxCase.description }}
          onSubmit={async (data) => { setSaving(true); try { await updateCase(id, data); router.push(`/cases/${id}`); } catch { alert("Failed"); } finally { setSaving(false); } }}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
