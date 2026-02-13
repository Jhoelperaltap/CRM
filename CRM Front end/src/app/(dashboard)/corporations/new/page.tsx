"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCorporation } from "@/lib/api/corporations";
import { CorporationForm } from "@/components/corporations/corporation-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewCorporationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await createCorporation(data);
      router.push("/corporations");
    } catch {
      alert("Failed to create corporation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Creating Organization" backHref="/corporations" />
      <div className="rounded-lg border bg-card">
        <CorporationForm
          onSubmit={handleSubmit}
          isLoading={loading}
          isEdit={false}
        />
      </div>
    </div>
  );
}
