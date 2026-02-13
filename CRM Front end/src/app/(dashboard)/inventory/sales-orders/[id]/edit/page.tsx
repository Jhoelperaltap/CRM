"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSalesOrder, updateSalesOrder } from "@/lib/api/inventory";
import { SalesOrderForm } from "@/components/inventory/sales-order-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { SalesOrderDetail } from "@/types";
import type { InvoiceLineItemRow } from "@/components/inventory/invoice-line-items";

export default function EditSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSalesOrder(id)
      .then((data) => setOrder(data as SalesOrderDetail))
      .catch(() => alert("Failed to load sales order."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!order) return <p className="text-muted-foreground p-4">Sales order not found.</p>;

  const defaultLineItems: InvoiceLineItemRow[] = order.line_items.map((li, idx) => ({
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
      <PageHeader title={`Edit Sales Order ${order.so_number}`} backHref="/inventory/sales-orders" />
      <div className="rounded-lg border p-6">
        <SalesOrderForm
          isEdit
          defaultValues={{
            so_number: order.so_number,
            subject: order.subject,
            status: order.status,
            order_date: order.order_date || "",
            due_date: order.due_date || "",
            contact: order.contact || "",
            corporation: order.corporation || "",
            quote: order.quote || "",
            customer_no: order.customer_no || "",
            purchase_order_ref: order.purchase_order_ref || "",
            carrier: order.carrier || "",
            pending: order.pending || "",
            assigned_to: order.assigned_to || "",
            sales_commission: parseFloat(order.sales_commission) || 0,
            excise_duty: parseFloat(order.excise_duty) || 0,
            billing_street: order.billing_street || "",
            billing_city: order.billing_city || "",
            billing_state: order.billing_state || "",
            billing_zip: order.billing_zip || "",
            billing_country: order.billing_country || "United States",
            billing_po_box: order.billing_po_box || "",
            shipping_street: order.shipping_street || "",
            shipping_city: order.shipping_city || "",
            shipping_state: order.shipping_state || "",
            shipping_zip: order.shipping_zip || "",
            shipping_country: order.shipping_country || "United States",
            shipping_po_box: order.shipping_po_box || "",
            discount_percent: parseFloat(order.discount_percent) || 0,
            discount_amount: parseFloat(order.discount_amount) || 0,
            adjustment: parseFloat(order.adjustment) || 0,
            terms_and_conditions: order.terms_and_conditions || "",
            description: order.description || "",
          }}
          defaultLineItems={defaultLineItems}
          onSubmit={async (data) => {
            setSaving(true);
            try {
              await updateSalesOrder(id, data);
              router.push("/inventory/sales-orders");
            } catch {
              alert("Failed to update sales order.");
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
