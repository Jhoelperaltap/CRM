"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPurchaseOrder, updatePurchaseOrder } from "@/lib/api/inventory";
import { PurchaseOrderForm } from "@/components/inventory/purchase-order-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { PurchaseOrderDetail } from "@/types";
import type { InvoiceLineItemRow } from "@/components/inventory/invoice-line-items";

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPurchaseOrder(id)
      .then((data) => setOrder(data as PurchaseOrderDetail))
      .catch(() => alert("Failed to load purchase order."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!order) return <p className="text-muted-foreground p-4">Purchase order not found.</p>;

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
      <PageHeader title={`Edit Purchase Order ${order.po_number}`} backHref="/inventory/purchase-orders" />
      <div className="rounded-lg border p-6">
        <PurchaseOrderForm
          isEdit
          defaultValues={{
            po_number: order.po_number,
            subject: order.subject,
            status: order.status,
            order_date: order.order_date || "",
            due_date: order.due_date || "",
            vendor: order.vendor || "",
            contact: order.contact || "",
            corporation: order.corporation || "",
            sales_order: order.sales_order || "",
            requisition_number: order.requisition_number || "",
            sales_commission: parseFloat(order.sales_commission) || 0,
            excise_duty: parseFloat(order.excise_duty) || 0,
            carrier: order.carrier || "",
            tracking_number: order.tracking_number || "",
            assigned_to: order.assigned_to || "",
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
              await updatePurchaseOrder(id, data);
              router.push("/inventory/purchase-orders");
            } catch {
              alert("Failed to update purchase order.");
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
