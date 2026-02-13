export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export type DocumentType =
  | 'w2'
  | 'W2'
  | '1099'
  | 'id'
  | 'ID'
  | 'id_document'
  | 'ID_DOCUMENT'
  | 'tax_return'
  | 'TAX_RETURN'
  | 'bank_statement'
  | 'BANK_STATEMENT'
  | 'authorization'
  | 'AUTHORIZATION'
  | 'correspondence'
  | 'CORRESPONDENCE'
  | 'receipt'
  | 'RECEIPT'
  | 'other'
  | 'OTHER'
  | string;

export interface PortalDocument {
  id: string;
  title: string;
  description?: string;
  file?: string | null;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  status?: DocumentStatus;
  doc_type?: DocumentType;
  rejection_reason?: string | null;
  // Case can be nested object or separate fields
  case?: {
    id: string;
    case_number: string;
    title?: string;
  } | null;
  case_id?: string | null;
  case_number?: string | null;
  uploaded_by?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reviewed_by?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
  // Source flag from API
  source?: 'document' | 'portal_upload';
  // Download URLs from backend
  download_url?: string;
  view_url?: string;
}

export interface PortalDocumentUpload {
  title: string;
  description?: string;
  doc_type: DocumentType;
  case_id?: string;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface PortalDocumentListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: PortalDocument[];
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  w2: 'W-2',
  W2: 'W-2',
  '1099': '1099',
  id: 'ID Document',
  ID: 'ID Document',
  id_document: 'ID Document',
  ID_DOCUMENT: 'ID Document',
  tax_return: 'Tax Return',
  TAX_RETURN: 'Tax Return',
  bank_statement: 'Bank Statement',
  BANK_STATEMENT: 'Bank Statement',
  authorization: 'Authorization',
  AUTHORIZATION: 'Authorization',
  correspondence: 'Correspondence',
  CORRESPONDENCE: 'Correspondence',
  receipt: 'Receipt',
  RECEIPT: 'Receipt',
  other: 'Other',
  OTHER: 'Other',
};
