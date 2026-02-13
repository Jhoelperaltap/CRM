"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCase } from "@/lib/api/cases";
import { CaseForm } from "@/components/cases/case-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader title="New Case" backHref="/cases" />
      <div className="rounded-lg border p-6">
        <CaseForm onSubmit={async (data) => { setLoading(true); try { await createCase(data); router.push("/cases"); } catch { alert("Failed"); } finally { setLoading(false); } }} isLoading={loading} />
      </div>
    </div>
  );
}
