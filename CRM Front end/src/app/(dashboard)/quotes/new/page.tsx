"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuote } from "@/lib/api/quotes";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewQuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="New Quote" backHref="/quotes" />
      <div className="rounded-lg border p-6">
        <QuoteForm
          onSubmit={async (data) => {
            setLoading(true);
            try {
              await createQuote(data);
              router.push("/quotes");
            } catch {
              alert("Failed to create quote.");
            } finally {
              setLoading(false);
            }
          }}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
