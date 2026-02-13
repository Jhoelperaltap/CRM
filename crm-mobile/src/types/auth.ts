export interface PortalContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string | null;
  ssn_last_four: string | null;
  portal_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortalLoginRequest {
  email: string;
  password: string;
}

export interface PortalLoginResponse {
  access: string;
  refresh: string;
  contact: PortalContact;
}

export interface PortalMeResponse {
  contact: PortalContact;
}

export interface PortalPasswordResetRequest {
  email: string;
}

export interface PortalPasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface PortalPasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PortalRefreshTokenRequest {
  refresh: string;
}

export interface PortalRefreshTokenResponse {
  access: string;
  refresh: string;
}

export interface AuthState {
  contact: PortalContact | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

export interface AuthActions {
  setAuth: (contact: PortalContact, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setContact: (contact: PortalContact) => void;
  clear: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;
