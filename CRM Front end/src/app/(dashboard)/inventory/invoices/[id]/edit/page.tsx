"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice, updateInvoice } from "@/lib/api/inventory";
import { InvoiceForm } from "@/components/inventory/invoice-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { InvoiceDetail } from "@/types";
import type { InvoiceLineItemRow } from "@/components/inventory/invoice-line-items";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getInvoice(id)
      .then((data) => setInvoice(data as InvoiceDetail))
      .catch(() => alert("Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!invoice) return <p className="text-muted-foreground p-4">Invoice not found.</p>;

  const defaultLineItems: InvoiceLineItemRow[] = invoice.line_items.map((li, idx) => ({
    id: li.id,
    product: li.product,
    service: li.service,
    description: li.description,
    quantity: parseFloat(li.quantity) || 1,
    unit_price: parseFloat(li.unit_price) || 0,
    discount_percent: parseFloat(li.discount_percent) || 0,
    tax_rate: li.tax_rate,
    sort_order: li.sort_order ?? idx,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit Invoice ${invoice.invoice_number}`} backHref="/inventory/invoices" />
      <div className="rounded-lg border p-6">
        <InvoiceForm
          isEdit
          defaultValues={{
            invoice_number: invoice.invoice_number,
            subject: invoice.subject,
            status: invoice.status,
            order_date: invoice.order_date || "",
            due_date: invoice.due_date || "",
            contact: invoice.contact || "",
            corporation: invoice.corporation || "",
            sales_order: invoice.sales_order || "",
            customer_no: invoice.customer_no || "",
            purchase_order_ref: invoice.purchase_order_ref || "",
            assigned_to: invoice.assigned_to || "",
            sales_commission: parseFloat(invoice.sales_commission) || 0,
            excise_duty: parseFloat(invoice.excise_duty) || 0,
            billing_street: invoice.billing_street || "",
            billing_city: invoice.billing_city || "",
            billing_state: invoice.billing_state || "",
            billing_zip: invoice.billing_zip || "",
            billing_country: invoice.billing_country || "United States",
            billing_po_box: invoice.billing_po_box || "",
            shipping_street: invoice.shipping_street || "",
            shipping_city: invoice.shipping_city || "",
            shipping_state: invoice.shipping_state || "",
            shipping_zip: invoice.shipping_zip || "",
            shipping_country: invoice.shipping_country || "United States",
            shipping_po_box: invoice.shipping_po_box || "",
            discount_percent: parseFloat(invoice.discount_percent) || 0,
            discount_amount: parseFloat(invoice.discount_amount) || 0,
            adjustment: parseFloat(invoice.adjustment) || 0,
            terms_and_conditions: invoice.terms_and_conditions || "",
            description: invoice.description || "",
          }}
          defaultLineItems={defaultLineItems}
          onSubmit={async (data) => {
            setSaving(true);
            try {
              await updateInvoice(id, data);
              router.push("/inventory/invoices");
            } catch {
              alert("Failed to update invoice.");
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
