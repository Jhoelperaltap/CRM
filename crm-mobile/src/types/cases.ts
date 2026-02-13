// Support both lowercase and uppercase status values from API
export type CaseStatus =
  | 'open' | 'in_progress' | 'pending_info' | 'completed' | 'closed'
  | 'OPEN' | 'IN_PROGRESS' | 'PENDING_INFO' | 'COMPLETED' | 'CLOSED'
  | 'READY_TO_FILE' | 'FILED' | 'AWAITING_RESPONSE' | 'NEEDS_REVIEW'
  | string;

export interface PortalChecklistItem {
  id: string;
  name: string;
  description: string;
  is_completed: boolean;
  completed_at: string | null;
  order: number;
}

export interface PortalChecklist {
  id: string;
  name: string;
  items: PortalChecklistItem[];
  progress: number; // 0-100
}

export interface PortalCase {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: CaseStatus;
  case_type: string;
  tax_year: number;
  due_date: string | null;
  assigned_to: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  checklist: PortalChecklist | null;
  created_at: string;
  updated_at: string;
}

export interface PortalCaseListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PortalCase[];
}
