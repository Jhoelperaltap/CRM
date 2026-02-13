"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/api/inventory";
import { PurchaseOrderForm } from "@/components/inventory/purchase-order-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Create Purchase Order" backHref="/inventory/purchase-orders" />
      <div className="rounded-lg border p-6">
        <PurchaseOrderForm
          onSubmit={async (data) => {
            setLoading(true);
            try {
              await createPurchaseOrder(data);
              router.push("/inventory/purchase-orders");
            } catch {
              alert("Failed to create purchase order.");
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
