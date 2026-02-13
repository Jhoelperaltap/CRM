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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCorporations } from "@/lib/api/corporations";
import { getUsers } from "@/lib/api/users";
import { getContacts } from "@/lib/api/contacts";
import { getPortalAccounts } from "@/lib/api/settings";
import type { CorporationListItem, User, ContactListItem } from "@/types";
import { Copy, Smartphone, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalAccessDialog } from "@/components/contacts/portal-access-dialog";

const contactSchema = z.object({
  // Basic Information
  salutation: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  department: z.string().optional(),
  reports_to: z.string().optional(),
  // Contact Info
  email: z.string().email("Invalid email").or(z.literal("")),
  secondary_email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  home_phone: z.string().optional(),
  fax: z.string().optional(),
  assistant: z.string().optional(),
  assistant_phone: z.string().optional(),
  // Personal
  date_of_birth: z.string().optional(),
  ssn_last_four: z.string().regex(/^(\d{4})?$/, "Must be 4 digits").optional(),
  // Lead & Source
  lead_source: z.string().optional(),
  source: z.string().optional(),
  referred_by: z.string().optional(),
  source_campaign: z.string().optional(),
  platform: z.string().optional(),
  ad_group: z.string().optional(),
  // Communication Preferences
  do_not_call: z.boolean().optional(),
  notify_owner: z.boolean().optional(),
  email_opt_in: z.string().optional(),
  sms_opt_in: z.string().optional(),
  // Mailing Address
  mailing_street: z.string().optional(),
  mailing_city: z.string().optional(),
  mailing_state: z.string().optional(),
  mailing_zip: z.string().optional(),
  mailing_country: z.string().optional(),
  mailing_po_box: z.string().optional(),
  // Other Address
  other_street: z.string().optional(),
  other_city: z.string().optional(),
  other_state: z.string().optional(),
  other_zip: z.string().optional(),
  other_country: z.string().optional(),
  other_po_box: z.string().optional(),
  // Language & Timezone
  preferred_language: z.enum(["en", "es", "fr", "pt", "zh", "ko", "vi", "ht", "other"]),
  timezone: z.string().optional(),
  // Status
  status: z.enum(["active", "inactive", "lead"]),
  // Customer Portal
  portal_user: z.boolean().optional(),
  support_start_date: z.string().optional(),
  support_end_date: z.string().optional(),
  // Social Media
  twitter_username: z.string().optional(),
  linkedin_url: z.string().optional(),
  linkedin_followers: z.number().optional().nullable(),
  facebook_url: z.string().optional(),
  facebook_followers: z.number().optional().nullable(),
  // Relationships
  corporation: z.string().optional(),
  assigned_to: z.string().optional(),
  sla: z.string().optional(),
  // Office Services
  office_services: z.string().optional(),
  // Other
  description: z.string().optional(),
  tags: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  defaultValues?: Partial<ContactFormData>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
  isEdit?: boolean;
  contactId?: string;
  contactName?: string;
  contactEmail?: string | null;
}

const SECTIONS = [
  { id: "basic", label: "Basic Information" },
  { id: "portal", label: "Customer Portal Details" },
  { id: "address", label: "Address Details" },
  { id: "description", label: "Description Details" },
  { id: "socials", label: "Socials" },
] as const;

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
  { value: "PR", label: "Puerto Rico" },
  { value: "VI", label: "Virgin Islands" },
  { value: "GU", label: "Guam" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time" },
  { value: "America/Anchorage", label: "(UTC-09:00) Alaska" },
  { value: "Pacific/Honolulu", label: "(UTC-10:00) Hawaii" },
  { value: "America/Phoenix", label: "(UTC-07:00) Arizona" },
  { value: "America/Puerto_Rico", label: "(UTC-04:00) Atlantic Time" },
  { value: "UTC", label: "(UTC+00:00) UTC" },
  { value: "Europe/London", label: "(UTC+00:00) London" },
  { value: "Europe/Paris", label: "(UTC+01:00) Paris" },
  { value: "Europe/Berlin", label: "(UTC+01:00) Berlin" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) Shanghai" },
  { value: "Asia/Hong_Kong", label: "(UTC+08:00) Hong Kong" },
];

const LEAD_SOURCES = [
  { value: "cold_call", label: "Cold Call" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "self_generated", label: "Self Generated" },
  { value: "employee", label: "Employee" },
  { value: "partner", label: "Partner" },
  { value: "public_relations", label: "Public Relations" },
  { value: "direct_mail", label: "Direct Mail" },
  { value: "conference", label: "Conference" },
  { value: "trade_show", label: "Trade Show" },
  { value: "website", label: "Website" },
  { value: "word_of_mouth", label: "Word of Mouth" },
  { value: "email", label: "Email" },
  { value: "campaign", label: "Campaign" },
  { value: "other", label: "Other" },
];

export function ContactForm({ defaultValues, onSubmit, isLoading, isEdit, contactId, contactName, contactEmail }: ContactFormProps) {
  const [activeSection, setActiveSection] = useState("basic");
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [portalAccess, setPortalAccess] = useState<{
    hasAccess: boolean;
    isActive: boolean;
    email: string;
    lastLogin: string | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur", // Validate on blur to show errors immediately
    defaultValues: {
      status: "active",
      preferred_language: "en",
      mailing_country: "United States",
      other_country: "United States",
      email_opt_in: "single_opt_in",
      sms_opt_in: "single_opt_in",
      do_not_call: false,
      notify_owner: false,
      portal_user: false,
      office_services: "",
      source: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    getCorporations()
      .then((res) => setCorporations(res.results))
      .catch(console.error);
    getUsers()
      .then((res) => setUsers(res.results))
      .catch(console.error);
    getContacts()
      .then((res) => setContacts(res.results))
      .catch(console.error);
  }, []);

  // Check portal access when editing
  const checkPortalAccess = async () => {
    if (!contactId || !isEdit) return;
    setPortalLoading(true);
    try {
      const response = await getPortalAccounts({ contact: contactId });
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
    if (contactId && isEdit) {
      checkPortalAccess();
    }
  }, [contactId, isEdit]);

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
    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s.id] || document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyMailingToOther = () => {
    const mailingFields = getValues([
      "mailing_street",
      "mailing_city",
      "mailing_state",
      "mailing_zip",
      "mailing_country",
      "mailing_po_box",
    ]);
    setValue("other_street", mailingFields[0] || "");
    setValue("other_city", mailingFields[1] || "");
    setValue("other_state", mailingFields[2] || "");
    setValue("other_zip", mailingFields[3] || "");
    setValue("other_country", mailingFields[4] || "United States");
    setValue("other_po_box", mailingFields[5] || "");
  };

  const handleFormSubmit = async (data: ContactFormData) => {
    // Clean empty strings for FK fields
    const cleanedData: Record<string, unknown> = { ...data };
    if (!cleanedData.corporation) delete cleanedData.corporation;
    if (!cleanedData.assigned_to) delete cleanedData.assigned_to;
    if (!cleanedData.reports_to) delete cleanedData.reports_to;
    if (!cleanedData.sla) delete cleanedData.sla;
    // Clean NaN values from number fields (empty inputs return NaN with valueAsNumber)
    if (typeof cleanedData.linkedin_followers === "number" && isNaN(cleanedData.linkedin_followers as number)) {
      delete cleanedData.linkedin_followers;
    }
    if (typeof cleanedData.facebook_followers === "number" && isNaN(cleanedData.facebook_followers as number)) {
      delete cleanedData.facebook_followers;
    }
    await onSubmit(cleanedData);
  };

  return (
    <div className="flex h-[calc(100vh-13rem)]">
      {/* Sections sidebar - stays fixed while form scrolls */}
      <nav className="hidden w-56 shrink-0 md:block border-r pr-2">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sections</h3>
        <div className="space-y-0.5">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? "border-l-[3px] border-primary bg-primary/10 font-medium text-primary"
                  : "border-l-[3px] border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Scrollable form content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pl-6">
        <form
          onSubmit={handleSubmit(handleFormSubmit, () => {
            // Scroll to the basic section where most required fields are
            sectionRefs.current.basic?.scrollIntoView({ behavior: "smooth", block: "start" });
          })}
          className="space-y-8 pb-4"
        >
          {/* =============== BASIC INFORMATION =============== */}
          <div
            id="basic"
            ref={(el) => { sectionRefs.current.basic = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Basic Information</h2>

            {/* Row 1: Salutation, First Name, Last Name */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Salutation</Label>
                <Select
                  value={watch("salutation") || ""}
                  onValueChange={(v) => setValue("salutation", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  {...register("first_name")}
                  placeholder="Enter first name"
                  className={errors.first_name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.first_name && <p className="text-destructive text-xs">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input
                  {...register("last_name")}
                  placeholder="Enter last name"
                  className={errors.last_name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.last_name && <p className="text-destructive text-xs">{errors.last_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as "active" | "inactive" | "lead")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Title, Department, Reports To, Organization */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...register("title")} placeholder="Job title" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input {...register("department")} placeholder="Department" />
              </div>
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Select
                  value={watch("reports_to") || ""}
                  onValueChange={(v) => setValue("reports_to", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={watch("corporation") || ""}
                  onValueChange={(v) => setValue("corporation", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {corporations.map((corp) => (
                      <SelectItem key={corp.id} value={corp.id}>
                        {corp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Email, Secondary Email, Office Phone, Mobile */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="email@example.com"
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Secondary Email</Label>
                <Input
                  type="email"
                  {...register("secondary_email")}
                  placeholder="secondary@example.com"
                  className={errors.secondary_email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.secondary_email && <p className="text-destructive text-xs">{errors.secondary_email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Office Phone</Label>
                <Input {...register("phone")} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input {...register("mobile")} placeholder="(555) 987-6543" />
              </div>
            </div>

            {/* Row 4: Home Phone, Fax, Assistant, Assistant Phone */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Home Phone</Label>
                <Input {...register("home_phone")} placeholder="(555) 111-2222" />
              </div>
              <div className="space-y-2">
                <Label>Fax</Label>
                <Input {...register("fax")} placeholder="(555) 333-4444" />
              </div>
              <div className="space-y-2">
                <Label>Assistant</Label>
                <Input {...register("assistant")} placeholder="Assistant name" />
              </div>
              <div className="space-y-2">
                <Label>Assistant Phone</Label>
                <Input {...register("assistant_phone")} placeholder="(555) 555-6666" />
              </div>
            </div>

            {/* Row 5: Date of Birth, SSN Last 4, Lead Source, Referred By */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" {...register("date_of_birth")} />
              </div>
              <div className="space-y-2">
                <Label>SSN Last 4</Label>
                <Input
                  maxLength={4}
                  {...register("ssn_last_four")}
                  placeholder="0000"
                  className={errors.ssn_last_four ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.ssn_last_four && <p className="text-destructive text-xs">{errors.ssn_last_four.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select
                  value={watch("lead_source") || ""}
                  onValueChange={(v) => setValue("lead_source", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((src) => (
                      <SelectItem key={src.value} value={src.value}>
                        {src.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referred By</Label>
                <Input {...register("referred_by")} placeholder="Referral source" />
              </div>
            </div>

            {/* Row 6: Source, Source Campaign, Platform, Ad Group */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input {...register("source")} placeholder="e.g., QUICKBOOKS, CRM" />
              </div>
              <div className="space-y-2">
                <Label>Source Campaign</Label>
                <Input {...register("source_campaign")} placeholder="Campaign name" />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Input {...register("platform")} placeholder="e.g., Google Ads" />
              </div>
              <div className="space-y-2">
                <Label>Ad Group</Label>
                <Input {...register("ad_group")} placeholder="Ad group name" />
              </div>
            </div>

            {/* Row 7: Office Services, Assigned To */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Office Services</Label>
                <Input {...register("office_services")} placeholder="e.g., WALTHAM, GLOUCESTER" />
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={watch("assigned_to") || ""}
                  onValueChange={(v) => setValue("assigned_to", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 8: Preferred Language, Timezone, Email Opt-in, SMS Opt-in */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <Select
                  value={watch("preferred_language") || "en"}
                  onValueChange={(v) => setValue("preferred_language", v as ContactFormData["preferred_language"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="vi">Vietnamese</SelectItem>
                    <SelectItem value="ht">Haitian Creole</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={watch("timezone") || ""}
                  onValueChange={(v) => setValue("timezone", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email Opt-in</Label>
                <Select
                  value={watch("email_opt_in") || "single_opt_in"}
                  onValueChange={(v) => setValue("email_opt_in", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_opt_in">Single Opt-in</SelectItem>
                    <SelectItem value="double_opt_in">Double Opt-in</SelectItem>
                    <SelectItem value="opt_out">Opt-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SMS Opt-in</Label>
                <Select
                  value={watch("sms_opt_in") || "single_opt_in"}
                  onValueChange={(v) => setValue("sms_opt_in", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_opt_in">Single Opt-in</SelectItem>
                    <SelectItem value="double_opt_in">Double Opt-in</SelectItem>
                    <SelectItem value="opt_out">Opt-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 9: Switches for Do Not Call, Notify Owner */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={watch("do_not_call") || false}
                  onCheckedChange={(v) => setValue("do_not_call", v)}
                />
                <Label className="cursor-pointer">Do Not Call</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={watch("notify_owner") || false}
                  onCheckedChange={(v) => setValue("notify_owner", v)}
                />
                <Label className="cursor-pointer">Notify Owner</Label>
              </div>
            </div>

            {/* Row 10: Tags */}
            <div className="mt-4 space-y-2">
              <Label>Tags</Label>
              <Input {...register("tags")} placeholder="Comma-separated tags" />
            </div>
          </div>

          {/* =============== CUSTOMER PORTAL DETAILS =============== */}
          <div
            id="portal"
            ref={(el) => { sectionRefs.current.portal = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Customer Portal Details</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={watch("portal_user") || false}
                  onCheckedChange={(v) => setValue("portal_user", v)}
                />
                <Label className="cursor-pointer">Portal User</Label>
              </div>
              <div className="space-y-2">
                <Label>Support Start Date</Label>
                <Input type="date" {...register("support_start_date")} />
              </div>
              <div className="space-y-2">
                <Label>Support End Date</Label>
                <Input type="date" {...register("support_end_date")} />
              </div>
            </div>

            {/* Mobile App Access - Only shown when editing */}
            {isEdit && contactId && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Mobile App Access</span>
                  </div>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : portalAccess?.hasAccess ? (
                    <Badge variant={portalAccess.isActive ? "default" : "secondary"}>
                      {portalAccess.isActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">No Access</Badge>
                  )}
                </div>

                {portalAccess?.hasAccess ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Email: <span className="font-mono">{portalAccess.email}</span></p>
                    {portalAccess.lastLogin && (
                      <p>Last login: {new Date(portalAccess.lastLogin).toLocaleDateString()}</p>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => setPortalDialogOpen(true)}
                    disabled={portalLoading || (!contactEmail && !watch("email"))}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    Grant Mobile App Access
                  </Button>
                )}

                {!contactEmail && !watch("email") && !portalAccess?.hasAccess && (
                  <p className="text-xs text-amber-600">
                    Contact needs an email address to grant portal access.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* =============== ADDRESS DETAILS =============== */}
          <div
            id="address"
            ref={(el) => { sectionRefs.current.address = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Address Details</h2>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Mailing Address */}
              <div>
                <h3 className="mb-3 font-medium text-muted-foreground">Mailing Address</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Street</Label>
                    <Input {...register("mailing_street")} placeholder="123 Main St" />
                  </div>
                  <div className="space-y-2">
                    <Label>PO Box</Label>
                    <Input {...register("mailing_po_box")} placeholder="PO Box 123" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input {...register("mailing_city")} placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select
                        value={watch("mailing_state") || ""}
                        onValueChange={(v) => setValue("mailing_state", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((st) => (
                            <SelectItem key={st.value} value={st.value}>
                              {st.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input {...register("mailing_zip")} placeholder="00000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input {...register("mailing_country")} placeholder="Country" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Address */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-muted-foreground">Other Address</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyMailingToOther}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy from Mailing
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Street</Label>
                    <Input {...register("other_street")} placeholder="456 Oak Ave" />
                  </div>
                  <div className="space-y-2">
                    <Label>PO Box</Label>
                    <Input {...register("other_po_box")} placeholder="PO Box 456" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input {...register("other_city")} placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select
                        value={watch("other_state") || ""}
                        onValueChange={(v) => setValue("other_state", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((st) => (
                            <SelectItem key={st.value} value={st.value}>
                              {st.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input {...register("other_zip")} placeholder="00000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input {...register("other_country")} placeholder="Country" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =============== DESCRIPTION DETAILS =============== */}
          <div
            id="description"
            ref={(el) => { sectionRefs.current.description = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Description Details</h2>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                rows={5}
                placeholder="Additional notes about this contact..."
              />
            </div>
          </div>

          {/* =============== SOCIALS =============== */}
          <div
            id="socials"
            ref={(el) => { sectionRefs.current.socials = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Socials</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Twitter Username</Label>
                <Input {...register("twitter_username")} placeholder="@username" />
              </div>
              <div />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input {...register("linkedin_url")} placeholder="https://linkedin.com/in/username" />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn Followers</Label>
                <Input
                  type="number"
                  {...register("linkedin_followers", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Facebook URL</Label>
                <Input {...register("facebook_url")} placeholder="https://facebook.com/username" />
              </div>
              <div className="space-y-2">
                <Label>Facebook Followers</Label>
                <Input
                  type="number"
                  {...register("facebook_followers", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* =============== SUBMIT =============== */}
          <div className="border-t pt-4 space-y-4">
            {/* Validation Error Banner */}
            {isSubmitted && Object.keys(errors).length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-destructive shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="space-y-1">
                    <p className="font-medium text-destructive">
                      Please fix the following errors:
                    </p>
                    <ul className="text-sm text-destructive/90 list-disc list-inside space-y-1">
                      {errors.first_name && <li>First Name: {errors.first_name.message}</li>}
                      {errors.last_name && <li>Last Name: {errors.last_name.message}</li>}
                      {errors.email && <li>Email: {errors.email.message}</li>}
                      {errors.secondary_email && <li>Secondary Email: {errors.secondary_email.message}</li>}
                      {errors.ssn_last_four && <li>SSN Last 4: {errors.ssn_last_four.message}</li>}
                      {errors.preferred_language && <li>Preferred Language: Required</li>}
                      {errors.status && <li>Status: Required</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? "Saving..." : isEdit ? "Update Contact" : "Save Contact"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Portal Access Dialog */}
      {isEdit && contactId && (
        <PortalAccessDialog
          open={portalDialogOpen}
          onOpenChange={setPortalDialogOpen}
          contactId={contactId}
          contactName={contactName || `${watch("first_name")} ${watch("last_name")}`}
          contactEmail={contactEmail || watch("email") || null}
          onSuccess={() => {
            checkPortalAccess();
          }}
        />
      )}
    </div>
  );
}
