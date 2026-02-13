"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "@/lib/api/inventory";
import { InvoiceForm } from "@/components/inventory/invoice-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Create Invoice" backHref="/inventory/invoices" />
      <div className="rounded-lg border p-6">
        <InvoiceForm
          onSubmit={async (data) => {
            setLoading(true);
            try {
              await createInvoice(data);
              router.push("/inventory/invoices");
            } catch {
              alert("Failed to create invoice.");
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
