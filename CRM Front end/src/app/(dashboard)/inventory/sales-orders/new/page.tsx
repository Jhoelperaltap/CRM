"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSalesOrder } from "@/lib/api/inventory";
import { SalesOrderForm } from "@/components/inventory/sales-order-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Create Sales Order" backHref="/inventory/sales-orders" />
      <div className="rounded-lg border p-6">
        <SalesOrderForm
          onSubmit={async (data) => {
            setLoading(true);
            try {
              await createSalesOrder(data);
              router.push("/inventory/sales-orders");
            } catch {
              alert("Failed to create sales order.");
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
