export interface ChecklistTemplateItem {
  id: string;
  title: string;
  description: string;
  doc_type: string;
  sort_order: number;
  is_required: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  case_type: string;
  tax_year: number | null;
  is_active: boolean;
  created_by: string | null;
  created_by_name: string | null;
  items: ChecklistTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateListItem {
  id: string;
  name: string;
  case_type: string;
  tax_year: number | null;
  is_active: boolean;
  item_count: number;
  created_at: string;
}

export interface CaseChecklistItem {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  doc_type: string;
  linked_document: string | null;
  sort_order: number;
  is_required: boolean;
}

export interface CaseChecklist {
  id: string;
  case: string;
  template: string | null;
  template_name: string | null;
  completed_count: number;
  total_count: number;
  progress_percent: number;
  items: CaseChecklistItem[];
}

export const CASE_TYPE_LABELS: Record<string, string> = {
  individual_1040: "Individual (1040)",
  corporate_1120: "Corporate (1120)",
  s_corp_1120s: "S-Corp (1120-S)",
  partnership_1065: "Partnership (1065)",
  nonprofit_990: "Nonprofit (990)",
  trust_1041: "Trust (1041)",
  payroll: "Payroll",
  sales_tax: "Sales Tax",
  amendment: "Amendment",
  other: "Other",
};
