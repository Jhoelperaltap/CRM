import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import { PortalAppointment, PortalAppointmentListResponse } from '../types/appointments';

/**
 * Get list of appointments for the authenticated contact
 */
export async function getAppointments(params?: {
  page?: number;
  upcoming?: boolean;
}): Promise<PortalAppointmentListResponse> {
  const response = await apiClient.get<PortalAppointment[] | PortalAppointmentListResponse>(
    API_ENDPOINTS.APPOINTMENTS,
    { params }
  );
  // Handle both array and paginated response formats
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length };
  }
  return response.data;
}
