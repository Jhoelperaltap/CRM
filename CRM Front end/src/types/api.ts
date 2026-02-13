export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string | null;
    role_slug: string | null;
    is_admin: boolean;
  };
  requires_2fa_setup?: boolean;
}

export interface TwoFactorRequiredResponse {
  requires_2fa: true;
  temp_token: string;
}

export interface ImportResponse {
  created: number;
  skipped?: Array<{ row: number; reason: string; matched_id: string }>;
  errors: Array<{ row: number; errors: Record<string, string[]> }>;
  total_processed: number;
}
