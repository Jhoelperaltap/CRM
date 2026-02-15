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
import { getRolesTree, getGroups } from "@/lib/api/settings";
import { getEmailAccounts } from "@/lib/api/emails";
import { getUsers } from "@/lib/api/users";
import { getDepartments } from "@/lib/api/departments";
import type { RoleTree, UserGroup } from "@/types/settings";
import type { EmailAccount } from "@/types/email";
import type { Department } from "@/types/department";
import type { User } from "@/types";

const userCreateSchema = z.object({
  // User Information
  username: z.string().email("Username must be a valid email").min(1, "Username is required"),
  user_type: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  reports_to: z.string().optional(),
  primary_group: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Confirm password is required"),
  language: z.string().optional(),
  // Employee Information
  first_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  department: z.string().optional(),
  secondary_email: z.string().email().or(z.literal("")).optional(),
  other_email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  home_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  fax: z.string().optional(),
  // User Address
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  // Currency and Number Preferences
  preferred_currency: z.string().optional(),
  show_amounts_in_preferred_currency: z.boolean().optional(),
  digit_grouping_pattern: z.string().optional(),
  decimal_separator: z.string().optional(),
  digit_grouping_separator: z.string().optional(),
  symbol_placement: z.string().optional(),
  number_of_currency_decimals: z.number().optional(),
  truncate_trailing_zeros: z.boolean().optional(),
  currency_format: z.string().optional(),
  aggregated_number_format: z.string().optional(),
  // Phone Preferences
  phone_country_code: z.string().optional(),
  asterisk_extension: z.string().optional(),
  use_full_screen_record_preview: z.boolean().optional(),
  // Signature
  signature_block: z.string().optional(),
  insert_signature_before_quoted_text: z.boolean().optional(),
  // User Business Hours
  business_hours: z.string().optional(),
  // Usage Preferences
  default_page_after_login: z.string().optional(),
  default_record_view: z.string().optional(),
  use_mail_composer: z.boolean().optional(),
  person_name_format: z.string().optional(),
  // Other
  email_account: z.string().nullable().optional(),
  is_active: z.boolean(),
});

const userCreateSchemaWithValidation = userCreateSchema.refine(
  (data) => data.password === data.confirm_password,
  {
    message: "Passwords do not match",
    path: ["confirm_password"],
  }
);

const userEditSchema = userCreateSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").or(z.literal("")),
  confirm_password: z.string().or(z.literal("")),
}).refine(
  (data) => {
    // If password is provided, confirm must match
    if (data.password && data.password.length > 0) {
      return data.password === data.confirm_password;
    }
    return true;
  },
  {
    message: "Passwords do not match",
    path: ["confirm_password"],
  }
);

type UserFormData = z.infer<typeof userCreateSchema>;

interface UserFormProps {
  initialData?: User;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isEdit?: boolean;
  isLoading?: boolean;
}

const SECTIONS = [
  { id: "user-info", label: "User Information" },
  { id: "employee-info", label: "Employee Information" },
  { id: "address", label: "User Address" },
  { id: "currency", label: "Currency & Number" },
  { id: "phone-prefs", label: "Phone Preferences" },
  { id: "signature", label: "Signature" },
  { id: "usage", label: "Usage Preferences" },
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
];

function flattenRoles(trees: RoleTree[]): { id: string; slug: string; name: string }[] {
  const result: { id: string; slug: string; name: string }[] = [];
  function walk(nodes: RoleTree[]) {
    for (const node of nodes) {
      result.push({ id: node.id, slug: node.slug, name: node.name });
      if (node.children?.length) {
        walk(node.children);
      }
    }
  }
  walk(trees);
  return result;
}

export function UserForm({ initialData, onSubmit, isEdit = false, isLoading }: UserFormProps) {
  const [activeSection, setActiveSection] = useState("user-info");
  const [roles, setRoles] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const schema = isEdit ? userEditSchema : userCreateSchemaWithValidation;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      // User Information - Username is the login email
      username: initialData?.email || initialData?.username || "",
      user_type: initialData?.user_type || "standard",
      role: initialData?.role?.id || "",
      reports_to: initialData?.reports_to?.id || "",
      primary_group: initialData?.primary_group?.id || "",
      language: initialData?.language || "en_us",
      // Employee Information
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      title: initialData?.title || "",
      department: initialData?.department?.id || "",
      secondary_email: initialData?.secondary_email || "",
      other_email: initialData?.other_email || "",
      phone: initialData?.phone || "",
      home_phone: initialData?.home_phone || "",
      mobile_phone: initialData?.mobile_phone || "",
      secondary_phone: initialData?.secondary_phone || "",
      fax: initialData?.fax || "",
      // User Address
      street: initialData?.street || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      country: initialData?.country || "United States",
      postal_code: initialData?.postal_code || "",
      // Currency and Number Preferences
      preferred_currency: initialData?.preferred_currency || "USD",
      show_amounts_in_preferred_currency: initialData?.show_amounts_in_preferred_currency ?? true,
      digit_grouping_pattern: initialData?.digit_grouping_pattern || "123,456,789",
      decimal_separator: initialData?.decimal_separator || ".",
      digit_grouping_separator: initialData?.digit_grouping_separator || ",",
      symbol_placement: initialData?.symbol_placement || "$1.0",
      number_of_currency_decimals: initialData?.number_of_currency_decimals ?? 2,
      truncate_trailing_zeros: initialData?.truncate_trailing_zeros ?? true,
      currency_format: initialData?.currency_format || "symbol",
      aggregated_number_format: initialData?.aggregated_number_format || "full",
      // Phone Preferences
      phone_country_code: initialData?.phone_country_code || "+1",
      asterisk_extension: initialData?.asterisk_extension || "",
      use_full_screen_record_preview: initialData?.use_full_screen_record_preview ?? false,
      // Signature
      signature_block: initialData?.signature_block || "",
      insert_signature_before_quoted_text: initialData?.insert_signature_before_quoted_text ?? true,
      // Usage Preferences
      default_page_after_login: initialData?.default_page_after_login || "dashboard",
      default_record_view: initialData?.default_record_view || "summary",
      use_mail_composer: initialData?.use_mail_composer ?? false,
      person_name_format: initialData?.person_name_format || "first_last",
      // Other
      email_account: initialData?.email_account || null,
      is_active: initialData?.is_active ?? true,
      // Password fields - always included
      password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    getRolesTree()
      .then((trees) => setRoles(flattenRoles(trees)))
      .catch(console.error);
    getGroups()
      .then((res) => setGroups(res.results || res))
      .catch(console.error);
    getUsers()
      .then((res) => setUsers(res.results))
      .catch(console.error);
    getEmailAccounts({ is_active: "true" })
      .then((res) => setEmailAccounts(res.results))
      .catch(console.error);
    getDepartments({ is_active: "true" })
      .then((res) => setDepartments(res))
      .catch(console.error);
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

  const handleFormSubmit = (data: UserFormData) => {
    // Clean empty strings for FK fields
    const cleanedData: Record<string, unknown> = { ...data };
    // Username is the login email - set email = username
    cleanedData.email = cleanedData.username;
    // Remove confirm_password - not sent to server
    delete cleanedData.confirm_password;
    // In edit mode, only send password if it was changed
    if (isEdit && (!cleanedData.password || (cleanedData.password as string).length === 0)) {
      delete cleanedData.password;
    }
    if (!cleanedData.reports_to) delete cleanedData.reports_to;
    if (!cleanedData.primary_group) delete cleanedData.primary_group;
    if (!cleanedData.business_hours) delete cleanedData.business_hours;
    if (!cleanedData.email_account) cleanedData.email_account = null;
    if (!cleanedData.department) cleanedData.department = null;
    onSubmit(cleanedData);
  };

  return (
    <div className="flex h-[calc(100vh-13rem)]">
      {/* Sections sidebar */}
      <nav className="hidden w-52 shrink-0 md:block border-r pr-2">
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 pb-4">
          {/* =============== USER INFORMATION =============== */}
          <div
            id="user-info"
            ref={(el) => { sectionRefs.current["user-info"] = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">User Information</h2>

            {/* Row 1: Username (email), User Type */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Username (Email) <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  {...register("username")}
                  placeholder="user@example.com"
                />
                <p className="text-muted-foreground text-xs">This is the login email</p>
                {errors.username && <p className="text-destructive text-xs">{errors.username.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>User Type <span className="text-destructive">*</span></Label>
                <Select
                  value={watch("user_type") || "standard"}
                  onValueChange={(v) => setValue("user_type", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="power_user">Power User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Role, Reports To */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select
                  value={watch("role") || ""}
                  onValueChange={(v) => setValue("role", v, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Select
                  value={watch("reports_to") || ""}
                  onValueChange={(v) => setValue("reports_to", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Type to search" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Primary Group, Language */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary Group</Label>
                <Select
                  value={watch("primary_group") || ""}
                  onValueChange={(v) => setValue("primary_group", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={watch("language") || "en_us"}
                  onValueChange={(v) => setValue("language", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_us">US English</SelectItem>
                    <SelectItem value="en_gb">UK English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt_br">Portuguese (Brazil)</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Password, Confirm Password */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Password {!isEdit && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type="password"
                  {...register("password" as keyof UserFormData)}
                  placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
                />
                {isEdit && (
                  <p className="text-muted-foreground text-xs">Leave blank to keep current password</p>
                )}
                {(errors as Record<string, { message?: string }>).password && (
                  <p className="text-destructive text-xs">
                    {(errors as Record<string, { message?: string }>).password?.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Confirm Password {!isEdit && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type="password"
                  {...register("confirm_password" as keyof UserFormData)}
                  placeholder="Confirm password"
                />
                {(errors as Record<string, { message?: string }>).confirm_password && (
                  <p className="text-destructive text-xs">
                    {(errors as Record<string, { message?: string }>).confirm_password?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Switch
                checked={watch("is_active")}
                onCheckedChange={(v) => setValue("is_active", v)}
              />
              <Label className="cursor-pointer">Active</Label>
            </div>
          </div>

          {/* =============== EMPLOYEE INFORMATION =============== */}
          <div
            id="employee-info"
            ref={(el) => { sectionRefs.current["employee-info"] = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Employee Information</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...register("first_name")} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input {...register("last_name")} placeholder="Last name" />
                {errors.last_name && <p className="text-destructive text-xs">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...register("title")} placeholder="Job title" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={watch("department") || ""}
                  onValueChange={(v) => setValue("department", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Secondary Email</Label>
                <Input type="email" {...register("secondary_email")} placeholder="secondary@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Other Email</Label>
                <Input type="email" {...register("other_email")} placeholder="other@example.com" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Home Phone</Label>
                <Input {...register("home_phone")} placeholder="(555) 111-2222" />
              </div>
              <div className="space-y-2">
                <Label>Office Phone</Label>
                <Input {...register("phone")} placeholder="(555) 123-4567" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mobile Phone</Label>
                <Input {...register("mobile_phone")} placeholder="(555) 987-6543" />
              </div>
              <div className="space-y-2">
                <Label>Secondary Phone</Label>
                <Input {...register("secondary_phone")} placeholder="(555) 333-4444" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fax</Label>
                <Input {...register("fax")} placeholder="(555) 555-6666" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email Account</Label>
                <Select
                  value={watch("email_account") || "__none__"}
                  onValueChange={(v) => setValue("email_account", v === "__none__" ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select email account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {emailAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.email_address} ({account.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">Email account for sending emails</p>
              </div>
            </div>
          </div>

          {/* =============== USER ADDRESS =============== */}
          <div
            id="address"
            ref={(el) => { sectionRefs.current.address = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">User Address</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Street</Label>
                <Input {...register("street")} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...register("city")} placeholder="City" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={watch("state") || ""}
                  onValueChange={(v) => setValue("state", v)}
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
              <div className="space-y-2">
                <Label>Country</Label>
                <Input {...register("country")} placeholder="Country" />
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input {...register("postal_code")} placeholder="00000" />
              </div>
            </div>
          </div>

          {/* =============== CURRENCY AND NUMBER PREFERENCES =============== */}
          <div
            id="currency"
            ref={(el) => { sectionRefs.current.currency = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Currency and Number Preferences</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Preferred Currency</Label>
                <Select
                  value={watch("preferred_currency") || "USD"}
                  onValueChange={(v) => setValue("preferred_currency", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USA, Dollars</SelectItem>
                    <SelectItem value="EUR">Euro</SelectItem>
                    <SelectItem value="GBP">UK, Pounds</SelectItem>
                    <SelectItem value="CAD">Canada, Dollars</SelectItem>
                    <SelectItem value="MXN">Mexico, Pesos</SelectItem>
                    <SelectItem value="JPY">Japan, Yen</SelectItem>
                    <SelectItem value="CNY">China, Yuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={watch("show_amounts_in_preferred_currency") ?? true}
                  onCheckedChange={(v) => setValue("show_amounts_in_preferred_currency", v)}
                />
                <Label className="cursor-pointer">Show amounts in preferred currency</Label>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Digit Grouping Pattern</Label>
                <Select
                  value={watch("digit_grouping_pattern") || "123,456,789"}
                  onValueChange={(v) => setValue("digit_grouping_pattern", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="123456789">123456789</SelectItem>
                    <SelectItem value="123,456,789">123,456,789</SelectItem>
                    <SelectItem value="12,34,56,789">12,34,56,789</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Decimal Separator</Label>
                <Select
                  value={watch("decimal_separator") || "."}
                  onValueChange={(v) => setValue("decimal_separator", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=".">.</SelectItem>
                    <SelectItem value=",">,</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Digit Grouping Separator</Label>
                <Select
                  value={watch("digit_grouping_separator") || ","}
                  onValueChange={(v) => setValue("digit_grouping_separator", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">,</SelectItem>
                    <SelectItem value=".">.</SelectItem>
                    <SelectItem value=" ">(space)</SelectItem>
                    <SelectItem value="'">&apos;</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Symbol Placement</Label>
                <Select
                  value={watch("symbol_placement") || "$1.0"}
                  onValueChange={(v) => setValue("symbol_placement", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$1.0">$1.0</SelectItem>
                    <SelectItem value="1.0$">1.0$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Number Of Currency Decimals</Label>
                <Select
                  value={String(watch("number_of_currency_decimals") ?? 2)}
                  onValueChange={(v) => setValue("number_of_currency_decimals", parseInt(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={watch("truncate_trailing_zeros") ?? true}
                  onCheckedChange={(v) => setValue("truncate_trailing_zeros", v)}
                />
                <Label className="cursor-pointer">Truncate Trailing Zeros</Label>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency Format</Label>
                <Select
                  value={watch("currency_format") || "symbol"}
                  onValueChange={(v) => setValue("currency_format", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="symbol">Currency Symbol</SelectItem>
                    <SelectItem value="code">Currency Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aggregated Number Format</Label>
                <Select
                  value={watch("aggregated_number_format") || "full"}
                  onValueChange={(v) => setValue("aggregated_number_format", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="abbreviated">Abbreviated (1K, 1M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* =============== PHONE PREFERENCES =============== */}
          <div
            id="phone-prefs"
            ref={(el) => { sectionRefs.current["phone-prefs"] = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Phone Preferences</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone Country Code</Label>
                <Select
                  value={watch("phone_country_code") || "+1"}
                  onValueChange={(v) => setValue("phone_country_code", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+1">United States +1</SelectItem>
                    <SelectItem value="+44">United Kingdom +44</SelectItem>
                    <SelectItem value="+49">Germany +49</SelectItem>
                    <SelectItem value="+33">France +33</SelectItem>
                    <SelectItem value="+34">Spain +34</SelectItem>
                    <SelectItem value="+39">Italy +39</SelectItem>
                    <SelectItem value="+81">Japan +81</SelectItem>
                    <SelectItem value="+86">China +86</SelectItem>
                    <SelectItem value="+52">Mexico +52</SelectItem>
                    <SelectItem value="+55">Brazil +55</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={watch("use_full_screen_record_preview") ?? false}
                  onCheckedChange={(v) => setValue("use_full_screen_record_preview", v)}
                />
                <Label className="cursor-pointer">Use full screen for record preview?</Label>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Asterisk Extension</Label>
                <Input {...register("asterisk_extension")} placeholder="Extension number" />
              </div>
            </div>
          </div>

          {/* =============== SIGNATURE =============== */}
          <div
            id="signature"
            ref={(el) => { sectionRefs.current.signature = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Signature</h2>

            <div className="space-y-2">
              <Label>Signature Block</Label>
              <Textarea
                {...register("signature_block")}
                rows={6}
                placeholder="Enter your email signature (HTML supported)..."
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Switch
                checked={watch("insert_signature_before_quoted_text") ?? true}
                onCheckedChange={(v) => setValue("insert_signature_before_quoted_text", v)}
              />
              <Label className="cursor-pointer">Insert this signature before quoted text</Label>
            </div>
          </div>

          {/* =============== USAGE PREFERENCES =============== */}
          <div
            id="usage"
            ref={(el) => { sectionRefs.current.usage = el; }}
            className="scroll-mt-4"
          >
            <h2 className="mb-4 text-lg font-semibold border-b pb-2">Usage Preferences</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default page after login</Label>
                <Select
                  value={watch("default_page_after_login") || "dashboard"}
                  onValueChange={(v) => setValue("default_page_after_login", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="contacts">Contacts</SelectItem>
                    <SelectItem value="corporations">Organizations</SelectItem>
                    <SelectItem value="cases">Cases</SelectItem>
                    <SelectItem value="appointments">Appointments</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default record view</Label>
                <Select
                  value={watch("default_record_view") || "summary"}
                  onValueChange={(v) => setValue("default_record_view", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="detail">Detail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={watch("use_mail_composer") ?? false}
                  onCheckedChange={(v) => setValue("use_mail_composer", v)}
                />
                <Label className="cursor-pointer">Use mail composer?</Label>
              </div>
              <div className="space-y-2">
                <Label>Person Name Format</Label>
                <Select
                  value={watch("person_name_format") || "first_last"}
                  onValueChange={(v) => setValue("person_name_format", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_last">First Name Last Name</SelectItem>
                    <SelectItem value="last_first">Last Name First Name</SelectItem>
                    <SelectItem value="salutation_first_last">Salutation First Name Last Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* =============== SUBMIT =============== */}
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
