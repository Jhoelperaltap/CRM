"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUsers } from "@/lib/api/users";
import { getCorporations } from "@/lib/api/corporations";
import { getPortalAccounts } from "@/lib/api/settings";
import type { User, CorporationListItem } from "@/types";
import { Smartphone, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalAccessDialog } from "@/components/contacts/portal-access-dialog";
import Link from "next/link";

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------
const schema = z.object({
  // Corporation Details (Essential)
  name: z.string().min(1, "Company name is required"),
  ein: z.string().min(1, "EIN is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  industry: z.string().optional(),
  member_of: z.string().optional(),
  assigned_to: z.string().optional(),
  date_incorporated: z.string().optional(),
  // Address
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
  billing_po_box: z.string().optional(),
  // Additional fields
  legal_name: z.string().optional(),
  entity_type: z.string().min(1, "Entity type is required"),
  organization_type: z.string().optional(),
  organization_status: z.string().optional(),
  state_id: z.string().optional(),
  // Business Details
  employees: z.union([z.number(), z.string()]).optional(),
  ownership: z.string().optional(),
  ticker_symbol: z.string().optional(),
  sic_code: z.string().optional(),
  annual_revenue: z.union([z.number(), z.string()]).optional(),
  annual_revenue_range: z.string().optional(),
  fiscal_year_end: z.string().optional(),
  region: z.string().optional(),
  timezone: z.string().optional(),
  // Contact info
  phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  fax: z.string().optional(),
  secondary_email: z.string().email("Invalid email").or(z.literal("")).optional(),
  email_domain: z.string().optional(),
  website: z.string().optional(),
  // Social media
  twitter_username: z.string().optional(),
  linkedin_url: z.string().optional(),
  facebook_url: z.string().optional(),
  // Marketing preferences
  email_opt_in: z.string().optional(),
  sms_opt_in: z.string().optional(),
  notify_owner: z.boolean().optional(),
  // Shipping address
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().optional(),
  shipping_po_box: z.string().optional(),
  // Status & relationships
  status: z.enum(["active", "inactive", "dissolved"]),
  sla: z.string().optional(),
  // Other
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// -----------------------------------------------------------------------------
// Options
// -----------------------------------------------------------------------------
const entityTypes = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "s_corp", label: "S Corporation" },
  { value: "c_corp", label: "C Corporation" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "trust", label: "Trust" },
  { value: "estate", label: "Estate" },
  { value: "other", label: "Other" },
];

const organizationTypes = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "reseller", label: "Reseller" },
  { value: "competitor", label: "Competitor" },
  { value: "investor", label: "Investor" },
  { value: "press", label: "Press" },
  { value: "prospect", label: "Prospect" },
  { value: "other", label: "Other" },
];

const organizationStatuses = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

const annualRevenueRanges = [
  { value: "under_100k", label: "Under $100,000" },
  { value: "100k_500k", label: "$100,000 - $500,000" },
  { value: "500k_1m", label: "$500,000 - $1,000,000" },
  { value: "1m_5m", label: "$1,000,000 - $5,000,000" },
  { value: "5m_10m", label: "$5,000,000 - $10,000,000" },
  { value: "10m_25m", label: "$10,000,000 - $25,000,000" },
  { value: "25m_50m", label: "$25,000,000 - $50,000,000" },
  { value: "50m_100m", label: "$50,000,000 - $100,000,000" },
  { value: "over_100m", label: "Over $100,000,000" },
];

const regions = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "northeast", label: "Northeast" },
  { value: "northwest", label: "Northwest" },
  { value: "southeast", label: "Southeast" },
  { value: "southwest", label: "Southwest" },
  { value: "central", label: "Central" },
  { value: "international", label: "International" },
];

const optInStatuses = [
  { value: "single_opt_in", label: "Single opt-in (user)" },
  { value: "double_opt_in", label: "Double opt-in" },
  { value: "opt_out", label: "Opt-out" },
  { value: "not_set", label: "Not set" },
];

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
];

const industries = [
  "Accounting",
  "Agriculture",
  "Automotive",
  "Banking",
  "Construction",
  "Consulting",
  "Education",
  "Energy",
  "Engineering",
  "Entertainment",
  "Finance",
  "Food & Beverage",
  "Government",
  "Healthcare",
  "Hospitality",
  "Import/Export",
  "Insurance",
  "Legal",
  "Logistics",
  "Manufacturing",
  "Media",
  "Nonprofit",
  "Real Estate",
  "Retail",
  "Technology",
  "Telecommunications",
  "Transportation",
  "Utilities",
  "Other",
];

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------
interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: "corporation-details", label: "Corporation Details" },
  { id: "address-details", label: "Address Details" },
  { id: "description-details", label: "Description Details" },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
  isEdit?: boolean;
  corporationId?: string;
  corporationName?: string;
  corporationEmail?: string | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
}

export function CorporationForm({
  defaultValues,
  onSubmit,
  isLoading,
  isEdit,
  corporationId,
  corporationName,
  corporationEmail,
  primaryContactId,
  primaryContactName,
}: Props) {
  const [activeSection, setActiveSection] = useState("corporation-details");
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [portalAccess, setPortalAccess] = useState<{
    hasAccess: boolean;
    isActive: boolean;
    email: string;
    lastLogin: string | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

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
      status: "active",
      entity_type: "llc",
      organization_type: "lead",
      organization_status: "cold",
      email_opt_in: "single_opt_in",
      sms_opt_in: "single_opt_in",
      billing_country: "United States",
      shipping_country: "United States",
      notify_owner: false,
      ...defaultValues,
    },
  });

  // Lookup data
  const [users, setUsers] = useState<User[]>([]);
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);

  useEffect(() => {
    getUsers().then((r) => setUsers(r.results)).catch(() => {});
    getCorporations().then((r) => setCorporations(r.results)).catch(() => {});
  }, []);

  // Check portal access for primary contact
  const checkPortalAccess = async () => {
    if (!primaryContactId || !isEdit) return;
    setPortalLoading(true);
    try {
      const response = await getPortalAccounts({ contact: primaryContactId });
      const access = response.results[0];
      if (access) {
        setPortalAccess({
          hasAccess: true,
          isActive: access.is_active,
          email: access.email,
          lastLogin: access.last_login,
        });
      } else {
        setPortalAccess({ hasAccess: false, isActive: false, email: "", lastLogin: null });
      }
    } catch {
      setPortalAccess({ hasAccess: false, isActive: false, email: "", lastLogin: null });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (primaryContactId && isEdit) {
      checkPortalAccess();
    }
  }, [primaryContactId, isEdit]);

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

  // Copy billing to shipping
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

    // Convert employees to number
    if (payload.employees) {
      payload.employees = Number(payload.employees) || null;
    }

    // Convert annual_revenue to number
    if (payload.annual_revenue) {
      payload.annual_revenue = Number(payload.annual_revenue) || null;
    }

    // Clean up empty relations
    if (!payload.member_of) delete payload.member_of;
    if (!payload.assigned_to) delete payload.assigned_to;
    if (!payload.sla) delete payload.sla;

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

          {/* ══════════════════════════════════════════════════════════════════
              CORPORATION DETAILS
          ══════════════════════════════════════════════════════════════════ */}
          <section id="corporation-details" className="space-y-6">
            <h3 className="text-lg font-semibold border-b pb-2">Corporation Details</h3>

            {/* Row 1: Company Name, EIN (Required) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="Enter company name" />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>EIN <span className="text-destructive">*</span></Label>
                <Input {...register("ein")} placeholder="XX-XXXXXXX" />
                {errors.ein && <p className="text-destructive text-sm">{errors.ein.message}</p>}
              </div>
            </div>

            {/* Row 2: Email, Industry */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...register("email")} placeholder="info@company.com" />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={watch("industry") || ""} onValueChange={(v) => setValue("industry", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select an Option</SelectItem>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Member Of, Assigned To */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Member Of</Label>
                <Select value={watch("member_of") || ""} onValueChange={(v) => setValue("member_of", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Type to search" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {corporations.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={watch("assigned_to") || ""} onValueChange={(v) => setValue("assigned_to", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Date Incorporated, Entity Type */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date Incorporated</Label>
                <Input type="date" {...register("date_incorporated")} />
              </div>
              <div className="space-y-2">
                <Label>Entity Type <span className="text-destructive">*</span></Label>
                <Select value={watch("entity_type") || "llc"} onValueChange={(v) => setValue("entity_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggle for more information */}
            <div className="flex items-center space-x-3 pt-2 pb-2 border-t border-b bg-muted/30 px-3 py-3 rounded-md">
              <Checkbox
                id="show-more-info"
                checked={showMoreInfo}
                onCheckedChange={(checked) => setShowMoreInfo(checked === true)}
              />
              <Label htmlFor="show-more-info" className="cursor-pointer flex items-center gap-2">
                Show more information
                {showMoreInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Label>
            </div>

            {/* Additional fields (shown when checkbox is checked) */}
            {showMoreInfo && (
              <div className="space-y-6 pt-4 border-l-2 border-primary/20 pl-4">
                <p className="text-sm text-muted-foreground">Additional Information</p>

                {/* Row: Legal Name, Status */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Legal Name</Label>
                    <Input {...register("legal_name")} placeholder="Full legal business name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "active" | "inactive" | "dissolved")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="dissolved">Dissolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row: Website, Phone */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input {...register("website")} placeholder="https://www.company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input {...register("phone")} placeholder="(555) 123-4567" />
                  </div>
                </div>

                {/* Row: Employees, Annual Revenue */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Employees</Label>
                    <Input type="number" {...register("employees")} placeholder="Number of employees" />
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Revenue</Label>
                    <Select value={watch("annual_revenue_range") || ""} onValueChange={(v) => setValue("annual_revenue_range", v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select an Option</SelectItem>
                        {annualRevenueRanges.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row: Ownership, Type */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ownership</Label>
                    <Input {...register("ownership")} placeholder="e.g. Private, Public, Family Owned" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={watch("organization_type") || "lead"} onValueChange={(v) => setValue("organization_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {organizationTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row: Ticker Symbol, SIC Code */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ticker Symbol</Label>
                    <Input {...register("ticker_symbol")} placeholder="e.g. AAPL" />
                  </div>
                  <div className="space-y-2">
                    <Label>SIC Code</Label>
                    <Input {...register("sic_code")} placeholder="e.g. 7371" />
                  </div>
                </div>

                {/* Row: Notify Owner, Organization Status */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={watch("notify_owner") || false}
                      onCheckedChange={(checked) => setValue("notify_owner", checked)}
                    />
                    <Label>Notify Owner</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Status</Label>
                    <Select value={watch("organization_status") || "cold"} onValueChange={(v) => setValue("organization_status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {organizationStatuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row: State ID, Fiscal Year End */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>State ID</Label>
                    <Input {...register("state_id")} placeholder="State registration number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year End</Label>
                    <Input {...register("fiscal_year_end")} placeholder="e.g. December" />
                  </div>
                </div>

                {/* Row: Region, Timezone */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={watch("region") || ""} onValueChange={(v) => setValue("region", v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select an Option</SelectItem>
                        {regions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={watch("timezone") || ""} onValueChange={(v) => setValue("timezone", v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select an Option</SelectItem>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row: Secondary Phone, Fax */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Secondary Phone</Label>
                    <Input {...register("secondary_phone")} placeholder="(555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fax</Label>
                    <Input {...register("fax")} placeholder="(555) 123-4567" />
                  </div>
                </div>

                {/* Row: Secondary Email, Email Domain */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Secondary Email</Label>
                    <Input type="email" {...register("secondary_email")} placeholder="contact@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Domain</Label>
                    <Input {...register("email_domain")} placeholder="company.com" />
                  </div>
                </div>

                {/* Row: Email Opt-in, SMS Opt-in */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Opt-in</Label>
                    <Select value={watch("email_opt_in") || "single_opt_in"} onValueChange={(v) => setValue("email_opt_in", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {optInStatuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>SMS Opt-in</Label>
                    <Select value={watch("sms_opt_in") || "single_opt_in"} onValueChange={(v) => setValue("sms_opt_in", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {optInStatuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row: Twitter, LinkedIn */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Twitter Username</Label>
                    <Input {...register("twitter_username")} placeholder="@username" />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input {...register("linkedin_url")} placeholder="https://linkedin.com/company/..." />
                  </div>
                </div>

                {/* Row: Facebook */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Facebook URL</Label>
                    <Input {...register("facebook_url")} placeholder="https://facebook.com/..." />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════════════
              ADDRESS DETAILS
          ══════════════════════════════════════════════════════════════════ */}
          <section id="address-details" className="space-y-6">
            <h3 className="text-lg font-semibold border-b pb-2">Address Details</h3>

            {/* Billing Address (Always visible) */}
            <div className="space-y-4">
              <h4 className="font-medium text-muted-foreground">Billing Address</h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={watch("billing_country") || "United States"} onValueChange={(v) => setValue("billing_country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Mexico">Mexico</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={watch("billing_state") || ""} onValueChange={(v) => setValue("billing_state", v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select an Option</SelectItem>
                      {usStates.map((st) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address</Label>
                <Textarea {...register("billing_street")} placeholder="Street address" rows={2} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input {...register("billing_city")} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input {...register("billing_zip")} placeholder="ZIP / Postal Code" />
                </div>
                <div className="space-y-2">
                  <Label>PO Box</Label>
                  <Input {...register("billing_po_box")} placeholder="PO Box" />
                </div>
              </div>
            </div>

            {/* Shipping Address (Only in more info) */}
            {showMoreInfo && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-muted-foreground">Shipping Address</h4>
                  <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>
                    Copy from Billing
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={watch("shipping_country") || "United States"} onValueChange={(v) => setValue("shipping_country", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Mexico">Mexico</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={watch("shipping_state") || ""} onValueChange={(v) => setValue("shipping_state", v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select an Option</SelectItem>
                        {usStates.map((st) => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Textarea {...register("shipping_street")} placeholder="Street address" rows={2} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input {...register("shipping_city")} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input {...register("shipping_zip")} placeholder="ZIP / Postal Code" />
                  </div>
                  <div className="space-y-2">
                    <Label>PO Box</Label>
                    <Input {...register("shipping_po_box")} placeholder="PO Box" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════════════
              CUSTOMER PORTAL (Only in edit mode)
          ══════════════════════════════════════════════════════════════════ */}
          {isEdit && corporationId && (
            <section id="customer-portal" className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Customer Portal</h3>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Mobile App Access</span>
                  </div>
                  {!primaryContactId ? (
                    <Badge variant="outline">No Primary Contact</Badge>
                  ) : portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : portalAccess?.hasAccess ? (
                    <Badge variant={portalAccess.isActive ? "default" : "secondary"}>
                      {portalAccess.isActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">No Access</Badge>
                  )}
                </div>

                {!primaryContactId ? (
                  <p className="text-xs text-muted-foreground">
                    Set a primary contact to grant portal access for this corporation.
                  </p>
                ) : portalAccess?.hasAccess ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Contact: <Link href={`/contacts/${primaryContactId}`} className="underline">{primaryContactName}</Link></p>
                    <p>Email: <span className="font-mono">{portalAccess.email}</span></p>
                    {portalAccess.lastLogin && (
                      <p>Last login: {new Date(portalAccess.lastLogin).toLocaleDateString()}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Grant portal access to: <Link href={`/contacts/${primaryContactId}`} className="underline">{primaryContactName}</Link>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={() => setPortalDialogOpen(true)}
                      disabled={portalLoading}
                    >
                      <Smartphone className="mr-2 h-4 w-4" />
                      Grant Mobile App Access
                    </Button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DESCRIPTION DETAILS
          ══════════════════════════════════════════════════════════════════ */}
          <section id="description-details" className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Description Details</h3>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="Enter a description of this corporation..."
                rows={6}
                className="resize-y"
              />
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Saving..." : isEdit ? "Update Corporation" : "Save"}
            </Button>
          </div>

        </form>
      </div>

      {/* Portal Access Dialog */}
      {isEdit && primaryContactId && (
        <PortalAccessDialog
          open={portalDialogOpen}
          onOpenChange={setPortalDialogOpen}
          contactId={primaryContactId}
          contactName={primaryContactName || corporationName || "Contact"}
          contactEmail={corporationEmail || null}
          onSuccess={() => {
            checkPortalAccess();
          }}
        />
      )}
    </div>
  );
}
