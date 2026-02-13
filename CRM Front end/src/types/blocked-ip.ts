export interface BlockedIPLog {
  id: string;
  blocked_ip: string;
  ip_address: string;
  request_type: "webform" | "login" | "api" | "other";
  request_path: string;
  user_agent: string;
  request_data: Record<string, unknown>;
  timestamp: string;
}

export interface BlockedIPListItem {
  id: string;
  ip_address: string;
  cidr_prefix: number | null;
  reason: string;
  blocked_webform_requests: number;
  is_active: boolean;
  created_by: string | null;
  created_by_name: string | null;
  log_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlockedIPDetail extends BlockedIPListItem {
  logs: BlockedIPLog[];
}

export interface BlockedIPCreatePayload {
  ip_address: string;
  cidr_prefix?: number | null;
  reason?: string;
  is_active?: boolean;
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  webform: "Webform",
  login: "Login",
  api: "API",
  other: "Other",
};
