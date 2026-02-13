"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  case_type: z.string().min(1, "Case type is required"),
  fiscal_year: z.number().min(2000).max(2100),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  contact: z.string().min(1, "Contact is required"),
  corporation: z.string().optional(),
  assigned_preparer: z.string().optional(),
  reviewer: z.string().optional(),
  estimated_fee: z.string().optional(),
  actual_fee: z.string().optional(),
  due_date: z.string().optional(),
  extension_date: z.string().optional(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const caseTypes = [
  { value: "individual_1040", label: "Individual (1040)" },
  { value: "corporate_1120", label: "Corporate (1120)" },
  { value: "s_corp_1120s", label: "S-Corp (1120-S)" },
  { value: "partnership_1065", label: "Partnership (1065)" },
  { value: "nonprofit_990", label: "Nonprofit (990)" },
  { value: "trust_1041", label: "Trust (1041)" },
  { value: "payroll", label: "Payroll" },
  { value: "sales_tax", label: "Sales Tax" },
  { value: "amendment", label: "Amendment" },
  { value: "other", label: "Other" },
];

interface Props { defaultValues?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; isLoading?: boolean; }

export function CaseForm({ defaultValues, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium", fiscal_year: new Date().getFullYear(), case_type: "individual_1040", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Title *</Label><Input {...register("title")} />{errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}</div>
        <div className="space-y-2"><Label>Case Type *</Label>
          <Select value={watch("case_type")} onValueChange={(v) => setValue("case_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{caseTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Fiscal Year *</Label><Input type="number" {...register("fiscal_year")} />{errors.fiscal_year && <p className="text-destructive text-sm">{errors.fiscal_year.message}</p>}</div>
        <div className="space-y-2"><Label>Priority</Label>
          <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as "low"|"medium"|"high"|"urgent")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Contact ID *</Label><Input {...register("contact")} placeholder="UUID" />{errors.contact && <p className="text-destructive text-sm">{errors.contact.message}</p>}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Corporation ID</Label><Input {...register("corporation")} placeholder="UUID (optional)" /></div>
        <div className="space-y-2"><Label>Preparer ID</Label><Input {...register("assigned_preparer")} placeholder="UUID (optional)" /></div>
        <div className="space-y-2"><Label>Reviewer ID</Label><Input {...register("reviewer")} placeholder="UUID (optional)" /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Estimated Fee</Label><Input type="number" step="0.01" {...register("estimated_fee")} /></div>
        <div className="space-y-2"><Label>Due Date</Label><Input type="date" {...register("due_date")} /></div>
      </div>
      <div className="space-y-2"><Label>Description</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={3} {...register("description")} /></div>
      <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Case"}</Button>
    </form>
  );
}
