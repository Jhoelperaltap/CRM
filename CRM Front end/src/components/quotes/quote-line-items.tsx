"use client";

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

const serviceTypes = [
  { value: "individual_1040", label: "Individual (1040)" },
  { value: "corporate_1120", label: "Corporate (1120)" },
  { value: "s_corp_1120s", label: "S-Corp (1120-S)" },
  { value: "partnership_1065", label: "Partnership (1065)" },
  { value: "nonprofit_990", label: "Nonprofit (990)" },
  { value: "trust_1041", label: "Trust (1041)" },
  { value: "payroll", label: "Payroll" },
  { value: "sales_tax", label: "Sales Tax" },
  { value: "bookkeeping", label: "Bookkeeping" },
  { value: "consulting", label: "Consulting" },
  { value: "amendment", label: "Amendment" },
  { value: "other", label: "Other" },
];

export interface LineItemRow {
  id?: string;
  service_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  sort_order: number;
}

function calcLineTotal(item: LineItemRow): number {
  const gross = item.quantity * item.unit_price;
  return gross - (gross * item.discount_percent) / 100;
}

interface QuoteLineItemsEditorProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
}

export function QuoteLineItemsEditor({ items, onChange }: QuoteLineItemsEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      {
        service_type: "other",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        sort_order: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItemRow, value: string | number) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    });
    onChange(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Service Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[90px]">Qty</TableHead>
              <TableHead className="w-[120px]">Unit Price</TableHead>
              <TableHead className="w-[100px]">Discount %</TableHead>
              <TableHead className="w-[110px] text-right">Line Total</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  No line items yet. Click &quot;Add Item&quot; to start.
                </TableCell>
              </TableRow>
            )}
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Select
                    value={item.service_type}
                    onValueChange={(v) => updateItem(idx, "service_type", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder="Service description"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => updateItem(idx, "discount_percent", parseFloat(e.target.value) || 0)}
                  />
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
          Add Item
        </Button>
        <div className="text-sm font-medium">
          Subtotal: <span className="font-mono">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}
