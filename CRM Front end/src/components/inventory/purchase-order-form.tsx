"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getContacts } from "@/lib/api/contacts";
import { getCorporations } from "@/lib/api/corporations";
import { getUsers } from "@/lib/api/users";
import { getVendors, getSalesOrders, getTaxRates } from "@/lib/api/inventory";
import {
  InvoiceLineItemsEditor,
  type InvoiceLineItemRow,
} from "@/components/inventory/invoice-line-items";
import type {
  ContactListItem,
  CorporationListItem,
  User,
  VendorListItem,
  SalesOrderListItem,
  TaxRateItem,
} from "@/types";

const schema = z.object({
  po_number: z.string().min(1, "PO number is required"),
  subject: z.string().min(1, "Subject is required"),
  status: z.string(),
  order_date: z.string().optional(),
  due_date: z.string().optional(),
  vendor: z.string().optional(),
  contact: z.string().optional(),
  corporation: z.string().optional(),
  sales_order: z.string().optional(),
  requisition_number: z.string().optional(),
  sales_commission: z.number().min(0),
  excise_duty: z.number().min(0),
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  assigned_to: z.string().optional(),
  // Billing address
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
  billing_po_box: z.string().optional(),
  // Shipping address
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().optional(),
  shipping_po_box: z.string().optional(),
  // Totals
  discount_percent: z.number().min(0).max(100),
  discount_amount: z.number().min(0),
  adjustment: z.number(),
  // Terms & description
  terms_and_conditions: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const statuses = [
  { value: "created", label: "Created" },
  { value: "approved", label: "Approved" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const carriers = [
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "usps", label: "USPS" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
];

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: "po-details", label: "Purchase Order Details" },
  { id: "address-details", label: "Address Details" },
  { id: "terms-conditions", label: "Terms & Conditions" },
  { id: "item-details", label: "Item Details" },
  { id: "description-details", label: "Description Details" },
];

interface PurchaseOrderFormProps {
  defaultValues?: Partial<FormData>;
  defaultLineItems?: InvoiceLineItemRow[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function PurchaseOrderForm({
  defaultValues,
  defaultLineItems,
  onSubmit,
  isLoading,
  isEdit,
}: PurchaseOrderFormProps) {
  const [activeSection, setActiveSection] = useState("po-details");
  const [lineItems, setLineItems] = useState<InvoiceLineItemRow[]>(
    defaultLineItems || []
  );
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "created",
      billing_country: "United States",
      shipping_country: "United States",
      discount_percent: 0,
      discount_amount: 0,
      sales_commission: 0,
      excise_duty: 0,
      adjustment: 0,
      ...defaultValues,
    },
  });

  // Lookup data
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderListItem[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateItem[]>([]);

  useEffect(() => {
    getContacts().then((r) => setContacts(r.results)).catch(() => {});
    getCorporations().then((r) => setCorporations(r.results)).catch(() => {});
    getUsers().then((r) => setUsers(r.results)).catch(() => {});
    getVendors().then((r) => setVendors(r.results)).catch(() => {});
    getSalesOrders().then((r) => setSalesOrders(r.results)).catch(() => {});
    getTaxRates({ is_active: "true" }).then((r) => setTaxRates(r.results)).catch(() => {});
  }, []);

  // Auto-highlight active section on scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root: container, threshold: 0.2 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Calculate totals
  const calcLineTotal = (item: InvoiceLineItemRow) => {
    const gross = item.quantity * item.unit_price;
    return gross - (gross * item.discount_percent) / 100;
  };

  const itemsTotal = lineItems.reduce((sum, item) => sum + calcLineTotal(item), 0);
  const watchDiscountPercent = watch("discount_percent") || 0;
  const watchDiscountAmount = watch("discount_amount") || 0;
  const watchAdjustment = watch("adjustment") || 0;

  const overallDiscount =
    discountMode === "percent"
      ? itemsTotal * (Number(watchDiscountPercent) / 100)
      : Number(watchDiscountAmount);

  const preTaxTotal = itemsTotal - overallDiscount;

  const taxTotal = lineItems.reduce((sum, item) => {
    if (!item.tax_rate) return sum;
    const tax = taxRates.find((t) => t.id === item.tax_rate);
    if (!tax) return sum;
    const lineTotal = calcLineTotal(item);
    return sum + lineTotal * (parseFloat(tax.rate) / 100);
  }, 0);

  const grandTotal = preTaxTotal + taxTotal + Number(watchAdjustment);

  const copyBillingToShipping = () => {
    const vals = getValues();
    setValue("shipping_street", vals.billing_street || "");
    setValue("shipping_city", vals.billing_city || "");
    setValue("shipping_state", vals.billing_state || "");
    setValue("shipping_zip", vals.billing_zip || "");
    setValue("shipping_country", vals.billing_country || "United States");
    setValue("shipping_po_box", vals.billing_po_box || "");
  };

  const handleFormSubmit = async (data: FormData) => {
    const payload: Record<string, unknown> = { ...data };
    payload.line_items = lineItems.map((li, idx) => ({
      ...(li.id ? { id: li.id } : {}),
      product: li.product || null,
      service: li.service || null,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      discount_percent: li.discount_percent,
      tax_rate: li.tax_rate || null,
      sort_order: idx,
    }));
    payload.subtotal = Math.round(itemsTotal * 100) / 100;
    payload.tax_amount = Math.round(taxTotal * 100) / 100;
    payload.total = Math.round(grandTotal * 100) / 100;
    if (discountMode === "percent") {
      payload.discount_amount = Math.round(overallDiscount * 100) / 100;
    } else {
      payload.discount_percent = 0;
    }
    if (!payload.vendor) delete payload.vendor;
    if (!payload.contact) delete payload.contact;
    if (!payload.corporation) delete payload.corporation;
    if (!payload.sales_order) delete payload.sales_order;
    if (!payload.assigned_to) delete payload.assigned_to;
    await onSubmit(payload);
  };

  return (
    <div className="flex h-[calc(100vh-13rem)]">
      {/* Section sidebar */}
      <nav className="hidden w-52 shrink-0 md:block border-r pr-2">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sections</h3>
        <div className="space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                activeSection === s.id
                  ? "border-l-[3px] border-primary bg-primary/10 font-medium text-primary"
                  : "border-l-[3px] border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Scrollable form content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pl-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 pb-4">

          {/* ── Purchase Order Details ── */}
          <section id="po-details" className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Purchase Order Details</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Input {...register("subject")} placeholder="Purchase order subject" />
                {errors.subject && <p className="text-destructive text-sm">{errors.subject.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Vendor Name <span className="text-destructive">*</span></Label>
                <Select value={watch("vendor") || ""} onValueChange={(v) => setValue("vendor", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status <span className="text-destructive">*</span></Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Requisition Number</Label>
                <Input {...register("requisition_number")} placeholder="Requisition number" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Select value={watch("contact") || ""} onValueChange={(v) => setValue("contact", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" {...register("due_date")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sales Commission</Label>
                <Input type="number" min={0} step="0.01" {...register("sales_commission")} />
              </div>
              <div className="space-y-2">
                <Label>Excise Duty</Label>
                <Input type="number" min={0} step="0.01" {...register("excise_duty")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select value={watch("carrier") || ""} onValueChange={(v) => setValue("carrier", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {carriers.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input {...register("tracking_number")} placeholder="Tracking number" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Assigned To <span className="text-destructive">*</span></Label>
                <Select value={watch("assigned_to") || ""} onValueChange={(v) => setValue("assigned_to", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Select value={watch("corporation") || ""} onValueChange={(v) => setValue("corporation", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {corporations.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sales Order</Label>
                <Select value={watch("sales_order") || ""} onValueChange={(v) => setValue("sales_order", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select sales order" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {salesOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>{so.so_number} - {so.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PO Number <span className="text-destructive">*</span></Label>
                <Input {...register("po_number")} placeholder="PO-0001" />
                {errors.po_number && <p className="text-destructive text-sm">{errors.po_number.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input type="date" {...register("order_date")} />
              </div>
            </div>
          </section>

          {/* ── Address Details ── */}
          <section id="address-details" className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Address Details</h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Billing */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Billing Address</h4>
                <div className="space-y-2"><Label>Country</Label><Input {...register("billing_country")} /></div>
                <div className="space-y-2"><Label>Address</Label><Input {...register("billing_street")} placeholder="Street address" /></div>
                <div className="space-y-2"><Label>PO Box</Label><Input {...register("billing_po_box")} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>City</Label><Input {...register("billing_city")} /></div>
                  <div className="space-y-2"><Label>State</Label><Input {...register("billing_state")} /></div>
                  <div className="space-y-2"><Label>Postal Code</Label><Input {...register("billing_zip")} /></div>
                </div>
              </div>
              {/* Shipping */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipping Address</h4>
                  <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>Copy Billing</Button>
                </div>
                <div className="space-y-2"><Label>Country</Label><Input {...register("shipping_country")} /></div>
                <div className="space-y-2"><Label>Address</Label><Input {...register("shipping_street")} placeholder="Street address" /></div>
                <div className="space-y-2"><Label>PO Box</Label><Input {...register("shipping_po_box")} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>City</Label><Input {...register("shipping_city")} /></div>
                  <div className="space-y-2"><Label>State</Label><Input {...register("shipping_state")} /></div>
                  <div className="space-y-2"><Label>Postal Code</Label><Input {...register("shipping_zip")} /></div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Terms & Conditions ── */}
          <section id="terms-conditions" className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Terms & Conditions</h3>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea rows={5} {...register("terms_and_conditions")} placeholder="Enter terms and conditions..." />
            </div>
          </section>

          {/* ── Item Details ── */}
          <section id="item-details" className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Item Details</h3>
            <InvoiceLineItemsEditor items={lineItems} onChange={setLineItems} />

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2 rounded-lg border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items Total</span>
                  <span className="font-mono font-medium">${itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Overall Discount</span>
                  <div className="flex items-center gap-2">
                    <Select value={discountMode} onValueChange={(v) => setDiscountMode(v as "percent" | "amount")}>
                      <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="amount">$</SelectItem>
                      </SelectContent>
                    </Select>
                    {discountMode === "percent" ? (
                      <Input type="number" min={0} max={100} step="0.01" className="h-7 w-20 text-xs" {...register("discount_percent")} />
                    ) : (
                      <Input type="number" min={0} step="0.01" className="h-7 w-20 text-xs" {...register("discount_amount")} />
                    )}
                  </div>
                </div>
                {overallDiscount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount</span>
                    <span className="font-mono">-${overallDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pre Tax Total</span>
                  <span className="font-mono font-medium">${preTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">(+) Tax</span>
                  <span className="font-mono font-medium">${taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Adjustment</span>
                  <Input type="number" step="0.01" className="h-7 w-24 text-xs" {...register("adjustment")} />
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Grand Total</span>
                  <span className="font-mono">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Description Details ── */}
          <section id="description-details" className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Description Details</h3>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} {...register("description")} placeholder="Additional notes or description..." />
            </div>
          </section>

          {/* Submit */}
          <div className="border-t pt-4 flex gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Update Purchase Order" : "Save Purchase Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
