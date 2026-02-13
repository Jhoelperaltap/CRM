"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { getProducts, getServices, getTaxRates } from "@/lib/api/inventory";
import type { ProductListItem, ServiceListItem, TaxRateItem } from "@/types";

export interface InvoiceLineItemRow {
  id?: string;
  product: string | null;
  service: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: string | null;
  sort_order: number;
}

function calcLineTotal(item: InvoiceLineItemRow): number {
  const gross = item.quantity * item.unit_price;
  return gross - (gross * item.discount_percent) / 100;
}

interface InvoiceLineItemsEditorProps {
  items: InvoiceLineItemRow[];
  onChange: (items: InvoiceLineItemRow[]) => void;
}

export function InvoiceLineItemsEditor({ items, onChange }: InvoiceLineItemsEditorProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateItem[]>([]);

  useEffect(() => {
    getProducts({ page_size: "200" }).then((r) => setProducts(r.results)).catch(() => {});
    getServices({ page_size: "200" }).then((r) => setServices(r.results)).catch(() => {});
    getTaxRates({ is_active: "true" }).then((r) => setTaxRates(r.results)).catch(() => {});
  }, []);

  const addItem = () => {
    onChange([
      ...items,
      {
        product: null,
        service: null,
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_rate: null,
        sort_order: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<InvoiceLineItemRow>) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, ...updates };
    });
    onChange(updated);
  };

  const selectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      updateItem(index, {
        product: prod.id,
        service: null,
        description: prod.name,
        unit_price: parseFloat(prod.unit_price) || 0,
        tax_rate: prod.tax_rate || null,
      });
    }
  };

  const selectService = (index: number, serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      updateItem(index, {
        product: null,
        service: svc.id,
        description: svc.name,
        unit_price: parseFloat(svc.unit_price) || 0,
        tax_rate: svc.tax_rate || null,
      });
    }
  };

  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item), 0);

  // Combined list for the item selector
  const itemOptions = [
    ...products.map((p) => ({ id: p.id, name: p.name, type: "product" as const, code: p.product_code })),
    ...services.map((s) => ({ id: s.id, name: s.name, type: "service" as const, code: s.service_code })),
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">No</TableHead>
              <TableHead className="w-[220px]">Item Name</TableHead>
              <TableHead className="w-[90px]">Qty</TableHead>
              <TableHead className="w-[130px]">Unit Price</TableHead>
              <TableHead className="w-[100px]">Discount %</TableHead>
              <TableHead className="w-[140px]">Tax</TableHead>
              <TableHead className="w-[110px] text-right">Total</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No line items yet. Click &quot;Add Products or Services&quot; to start.
                </TableCell>
              </TableRow>
            )}
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-center text-muted-foreground text-sm">
                  {idx + 1}
                </TableCell>
                <TableCell>
                  <Select
                    value={item.product || item.service || ""}
                    onValueChange={(v) => {
                      const opt = itemOptions.find((o) => o.id === v);
                      if (opt?.type === "product") selectProduct(idx, v);
                      else if (opt?.type === "service") selectService(idx, v);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length > 0 && (
                        <>
                          <SelectItem value="__products_header__" disabled>
                            -- Products --
                          </SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.product_code} - {p.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {services.length > 0 && (
                        <>
                          <SelectItem value="__services_header__" disabled>
                            -- Services --
                          </SelectItem>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.service_code} - {s.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-1 h-7 text-xs"
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Description"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={item.discount_percent}
                    onChange={(e) => updateItem(idx, { discount_percent: parseFloat(e.target.value) || 0 })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.tax_rate || "__none__"}
                    onValueChange={(v) => updateItem(idx, { tax_rate: v === "__none__" ? null : v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {taxRates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  ${calcLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Products or Services
        </Button>
        <div className="text-sm font-medium">
          Items Total:{" "}
          <span className="font-mono">
            ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
