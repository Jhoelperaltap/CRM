"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getContacts } from "@/lib/api/contacts";
import { getCorporations } from "@/lib/api/corporations";
import { getCases } from "@/lib/api/cases";
import { getUsers } from "@/lib/api/users";
import { QuoteLineItemsEditor, type LineItemRow } from "@/components/quotes/quote-line-items";
import type { ContactListItem, CorporationListItem, TaxCaseListItem, User } from "@/types";

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  stage: z.string(),
  valid_until: z.string().optional(),
  contact: z.string().min(1, "Contact is required"),
  corporation: z.string().optional(),
  case: z.string().optional(),
  assigned_to: z.string().optional(),
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().optional(),
  discount_percent: z.number().min(0).max(100),
  tax_percent: z.number().min(0).max(100),
  terms_conditions: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const stages = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: "details", label: "Quote Details" },
  { id: "line-items", label: "Line Items" },
  { id: "address", label: "Address Details" },
  { id: "terms", label: "Terms & Additional" },
];

interface QuoteFormProps {
  defaultValues?: Partial<FormData>;
  defaultLineItems?: LineItemRow[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
}

export function QuoteForm({ defaultValues, defaultLineItems, onSubmit, isLoading }: QuoteFormProps) {
  const [activeSection, setActiveSection] = useState("details");
  const [lineItems, setLineItems] = useState<LineItemRow[]>(defaultLineItems || []);
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
      stage: "draft",
      billing_country: "United States",
      shipping_country: "United States",
      discount_percent: 0,
      tax_percent: 0,
      ...defaultValues,
    },
  });

  // Lookup data
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);
  const [cases, setCases] = useState<TaxCaseListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    getContacts().then((r) => setContacts(r.results)).catch(console.error);
    getCorporations().then((r) => setCorporations(r.results)).catch(console.error);
    getCases().then((r) => setCases(r.results)).catch(console.error);
    getUsers().then((r) => setUsers(r.results)).catch(console.error);
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

  const copyBillingToShipping = () => {
    const vals = getValues();
    setValue("shipping_street", vals.billing_street || "");
    setValue("shipping_city", vals.billing_city || "");
    setValue("shipping_state", vals.billing_state || "");
    setValue("shipping_zip", vals.billing_zip || "");
    setValue("shipping_country", vals.billing_country || "United States");
  };

  const handleFormSubmit = async (data: FormData) => {
    const payload: Record<string, unknown> = { ...data };
    // Attach line items
    payload.line_items = lineItems.map((li, idx) => ({
      ...(li.id ? { id: li.id } : {}),
      service_type: li.service_type,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      discount_percent: li.discount_percent,
      sort_order: idx,
    }));
    // Clean empty optional FKs
    if (!payload.corporation) delete payload.corporation;
    if (!payload.case) delete payload.case;
    if (!payload.assigned_to) delete payload.assigned_to;
    await onSubmit(payload);
  };

  return (
    <div className="flex h-[calc(100vh-13rem)]">
      {/* Section sidebar - stays fixed while form scrolls */}
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
        {/* Quote Details */}
        <section id="details" className="space-y-4">
          <h3 className="text-lg font-semibold">Quote Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Input {...register("subject")} placeholder="Quote subject" />
              {errors.subject && <p className="text-destructive text-sm">{errors.subject.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={watch("stage")} onValueChange={(v) => setValue("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input type="date" {...register("valid_until")} />
            </div>
            <div className="space-y-2">
              <Label>Contact <span className="text-destructive">*</span></Label>
              <Select value={watch("contact") || ""} onValueChange={(v) => setValue("contact", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contact && <p className="text-destructive text-sm">{errors.contact.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Corporation</Label>
              <Select value={watch("corporation") || ""} onValueChange={(v) => setValue("corporation", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select corporation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {corporations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Case</Label>
              <Select value={watch("case") || ""} onValueChange={(v) => setValue("case", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
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
          </div>
        </section>

        {/* Line Items */}
        <section id="line-items" className="space-y-4">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <QuoteLineItemsEditor items={lineItems} onChange={setLineItems} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Discount %</Label>
              <Input type="number" min={0} max={100} step="0.01" {...register("discount_percent")} />
            </div>
            <div className="space-y-2">
              <Label>Tax %</Label>
              <Input type="number" min={0} max={100} step="0.01" {...register("tax_percent")} />
            </div>
          </div>
        </section>

        {/* Address Details */}
        <section id="address" className="space-y-4">
          <h3 className="text-lg font-semibold">Address Details</h3>

          <h4 className="text-sm font-medium text-muted-foreground">Billing Address</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Street</Label><Input {...register("billing_street")} /></div>
            <div className="space-y-2"><Label>City</Label><Input {...register("billing_city")} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>State</Label><Input {...register("billing_state")} /></div>
            <div className="space-y-2"><Label>ZIP</Label><Input {...register("billing_zip")} /></div>
            <div className="space-y-2"><Label>Country</Label><Input {...register("billing_country")} /></div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Shipping Address</h4>
            <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>
              Copy Billing
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Street</Label><Input {...register("shipping_street")} /></div>
            <div className="space-y-2"><Label>City</Label><Input {...register("shipping_city")} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>State</Label><Input {...register("shipping_state")} /></div>
            <div className="space-y-2"><Label>ZIP</Label><Input {...register("shipping_zip")} /></div>
            <div className="space-y-2"><Label>Country</Label><Input {...register("shipping_country")} /></div>
          </div>
        </section>

        {/* Terms & Additional */}
        <section id="terms" className="space-y-4">
          <h3 className="text-lg font-semibold">Terms & Additional</h3>
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <textarea
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              rows={4}
              {...register("terms_conditions")}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              {...register("description")}
            />
          </div>
        </section>

        <div className="border-t pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Quote"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
