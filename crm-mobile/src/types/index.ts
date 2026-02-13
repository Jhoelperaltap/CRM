export * from './auth';
export * from './cases';
export * from './documents';
export * from './messages';
export * from './appointments';

// Common API response types
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
