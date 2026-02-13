"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuote, updateQuote } from "@/lib/api/quotes";
import type { Quote } from "@/types";
import { QuoteForm } from "@/components/quotes/quote-form";
import type { LineItemRow } from "@/components/quotes/quote-line-items";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getQuote(id)
      .then(setQuote)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!quote) return <div>Quote not found</div>;

  const defaultLineItems: LineItemRow[] = quote.line_items.map((li) => ({
    id: li.id,
    service_type: li.service_type,
    description: li.description,
    quantity: Number(li.quantity),
    unit_price: Number(li.unit_price),
    discount_percent: Number(li.discount_percent),
    sort_order: li.sort_order,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${quote.quote_number}`} backHref={`/quotes/${id}`} />
      <div className="rounded-lg border p-6">
        <QuoteForm
          defaultValues={{
            subject: quote.subject,
            stage: quote.stage,
            valid_until: quote.valid_until || undefined,
            contact: quote.contact?.id,
            corporation: quote.corporation?.id,
            case: quote.case?.id,
            assigned_to: quote.assigned_to?.id,
            billing_street: quote.billing_street,
            billing_city: quote.billing_city,
            billing_state: quote.billing_state,
            billing_zip: quote.billing_zip,
            billing_country: quote.billing_country,
            shipping_street: quote.shipping_street,
            shipping_city: quote.shipping_city,
            shipping_state: quote.shipping_state,
            shipping_zip: quote.shipping_zip,
            shipping_country: quote.shipping_country,
            discount_percent: Number(quote.discount_percent),
            tax_percent: Number(quote.tax_percent),
            terms_conditions: quote.terms_conditions,
            description: quote.description,
          }}
          defaultLineItems={defaultLineItems}
          onSubmit={async (data) => {
            setSaving(true);
            try {
              await updateQuote(id, data);
              router.push(`/quotes/${id}`);
            } catch {
              alert("Failed to update quote.");
            } finally {
              setSaving(false);
            }
          }}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
