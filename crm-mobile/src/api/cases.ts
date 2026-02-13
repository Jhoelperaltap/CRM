import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import { PortalCase, PortalCaseListResponse } from '../types/cases';

/**
 * Get list of cases for the authenticated contact
 */
export async function getCases(params?: {
  page?: number;
  status?: string;
}): Promise<PortalCaseListResponse> {
  const response = await apiClient.get<PortalCase[] | PortalCaseListResponse>(API_ENDPOINTS.CASES, {
    params,
  });
  // Handle both array and paginated response formats
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length };
  }
  return response.data;
}

/**
 * Get a specific case by ID
 */
export async function getCase(id: string): Promise<PortalCase> {
  const response = await apiClient.get<PortalCase>(API_ENDPOINTS.CASE_DETAIL(id));
  return response.data;
}
