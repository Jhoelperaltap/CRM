import api from "@/lib/api";
import type {
  EmailList,
  EmailListSubscriber,
  CampaignTemplate,
  Campaign,
  CampaignRecipient,
  CampaignLink,
  AutomationSequence,
  AutomationStep,
  AutomationEnrollment,
  CampaignAnalytics,
  CampaignStats,
} from '@/types/marketing';

// Email Lists
export async function getEmailLists(params?: { is_active?: boolean }) {
  const response = await api.get<{ results: EmailList[] }>('/marketing/lists/', { params });
  return response.data.results;
}

export async function getEmailList(id: string) {
  const response = await api.get<EmailList>(`/marketing/lists/${id}/`);
  return response.data;
}

export async function createEmailList(data: Partial<EmailList>) {
  const response = await api.post<EmailList>('/marketing/lists/', data);
  return response.data;
}

export async function updateEmailList(id: string, data: Partial<EmailList>) {
  const response = await api.patch<EmailList>(`/marketing/lists/${id}/`, data);
  return response.data;
}

export async function deleteEmailList(id: string) {
  await api.delete(`/marketing/lists/${id}/`);
}

export async function getListSubscribers(listId: string, params?: { is_subscribed?: boolean }) {
  const response = await api.get<{ results: EmailListSubscriber[] }>(
    `/marketing/lists/${listId}/subscribers/`,
    { params }
  );
  return response.data.results;
}

export async function addSubscribersToList(listId: string, contactIds: string[], source = 'manual') {
  const response = await api.post<{ added: number }>(`/marketing/lists/${listId}/add_subscribers/`, {
    contact_ids: contactIds,
    source,
  });
  return response.data;
}

export async function removeSubscribersFromList(listId: string, contactIds: string[]) {
  const response = await api.post<{ removed: number }>(`/marketing/lists/${listId}/remove_subscribers/`, {
    contact_ids: contactIds,
  });
  return response.data;
}

// Campaign Templates
export async function getCampaignTemplates(params?: { category?: string; is_active?: boolean }) {
  const response = await api.get<{ results: CampaignTemplate[] }>('/marketing/templates/', { params });
  return response.data.results;
}

export async function getCampaignTemplate(id: string) {
  const response = await api.get<CampaignTemplate>(`/marketing/templates/${id}/`);
  return response.data;
}

export async function createCampaignTemplate(data: Partial<CampaignTemplate>) {
  const response = await api.post<CampaignTemplate>('/marketing/templates/', data);
  return response.data;
}

export async function updateCampaignTemplate(id: string, data: Partial<CampaignTemplate>) {
  const response = await api.patch<CampaignTemplate>(`/marketing/templates/${id}/`, data);
  return response.data;
}

export async function deleteCampaignTemplate(id: string) {
  await api.delete(`/marketing/templates/${id}/`);
}

// Campaigns
export async function getCampaigns(params?: { status?: string; campaign_type?: string }) {
  const response = await api.get<{ results: Campaign[] }>('/marketing/campaigns/', { params });
  return response.data.results;
}

export async function getCampaign(id: string) {
  const response = await api.get<Campaign>(`/marketing/campaigns/${id}/`);
  return response.data;
}

export async function createCampaign(data: Partial<Campaign>) {
  const response = await api.post<Campaign>('/marketing/campaigns/', data);
  return response.data;
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
  const response = await api.patch<Campaign>(`/marketing/campaigns/${id}/`, data);
  return response.data;
}

export async function deleteCampaign(id: string) {
  await api.delete(`/marketing/campaigns/${id}/`);
}

export async function sendCampaign(id: string) {
  const response = await api.post<{ message: string; campaign_id: string }>(
    `/marketing/campaigns/${id}/send/`
  );
  return response.data;
}

export async function scheduleCampaign(id: string, scheduledAt: string) {
  const response = await api.post<{ message: string; scheduled_at: string }>(
    `/marketing/campaigns/${id}/schedule/`,
    { scheduled_at: scheduledAt }
  );
  return response.data;
}

export async function pauseCampaign(id: string) {
  const response = await api.post<{ message: string }>(`/marketing/campaigns/${id}/pause/`);
  return response.data;
}

export async function resumeCampaign(id: string) {
  const response = await api.post<{ message: string }>(`/marketing/campaigns/${id}/resume/`);
  return response.data;
}

export async function cancelCampaign(id: string) {
  const response = await api.post<{ message: string }>(`/marketing/campaigns/${id}/cancel/`);
  return response.data;
}

export async function duplicateCampaign(id: string) {
  const response = await api.post<Campaign>(`/marketing/campaigns/${id}/duplicate/`);
  return response.data;
}

export async function getCampaignRecipients(campaignId: string, params?: { status?: string }) {
  const response = await api.get<{ results: CampaignRecipient[] }>(
    `/marketing/campaigns/${campaignId}/recipients/`,
    { params }
  );
  return response.data.results;
}

export async function getCampaignLinks(campaignId: string) {
  const response = await api.get<CampaignLink[]>(`/marketing/campaigns/${campaignId}/links/`);
  return response.data;
}

export async function getCampaignStats(campaignId: string) {
  const response = await api.get<CampaignStats>(`/marketing/campaigns/${campaignId}/stats/`);
  return response.data;
}

export async function sendTestEmail(campaignId: string, emails: string[]) {
  const response = await api.post<{ message: string; sent_to: string[] }>(
    `/marketing/campaigns/${campaignId}/test_send/`,
    { emails }
  );
  return response.data;
}

// Automation Sequences
export async function getAutomationSequences(params?: { is_active?: boolean }) {
  const response = await api.get<{ results: AutomationSequence[] }>('/marketing/automations/', { params });
  return response.data.results;
}

export async function getAutomationSequence(id: string) {
  const response = await api.get<AutomationSequence>(`/marketing/automations/${id}/`);
  return response.data;
}

export async function createAutomationSequence(data: Partial<AutomationSequence>) {
  const response = await api.post<AutomationSequence>('/marketing/automations/', data);
  return response.data;
}

export async function updateAutomationSequence(id: string, data: Partial<AutomationSequence>) {
  const response = await api.patch<AutomationSequence>(`/marketing/automations/${id}/`, data);
  return response.data;
}

export async function deleteAutomationSequence(id: string) {
  await api.delete(`/marketing/automations/${id}/`);
}

export async function activateAutomation(id: string) {
  const response = await api.post<{ message: string }>(`/marketing/automations/${id}/activate/`);
  return response.data;
}

export async function deactivateAutomation(id: string) {
  const response = await api.post<{ message: string }>(`/marketing/automations/${id}/deactivate/`);
  return response.data;
}

export async function getAutomationEnrollments(automationId: string, params?: { status?: string }) {
  const response = await api.get<{ results: AutomationEnrollment[] }>(
    `/marketing/automations/${automationId}/enrollments/`,
    { params }
  );
  return response.data.results;
}

export async function enrollContactsInAutomation(automationId: string, contactIds: string[]) {
  const response = await api.post<{ enrolled: number }>(
    `/marketing/automations/${automationId}/enroll_contacts/`,
    { contact_ids: contactIds }
  );
  return response.data;
}

// Automation Steps
export async function getAutomationSteps(sequenceId: string) {
  const response = await api.get<{ results: AutomationStep[] }>('/marketing/automation-steps/', {
    params: { sequence: sequenceId },
  });
  return response.data.results;
}

export async function createAutomationStep(data: Partial<AutomationStep>) {
  const response = await api.post<AutomationStep>('/marketing/automation-steps/', data);
  return response.data;
}

export async function updateAutomationStep(id: string, data: Partial<AutomationStep>) {
  const response = await api.patch<AutomationStep>(`/marketing/automation-steps/${id}/`, data);
  return response.data;
}

export async function deleteAutomationStep(id: string) {
  await api.delete(`/marketing/automation-steps/${id}/`);
}

export async function reorderAutomationStep(id: string, order: number) {
  const response = await api.post<{ message: string }>(`/marketing/automation-steps/${id}/reorder/`, {
    order,
  });
  return response.data;
}

// Analytics
export async function getCampaignAnalytics(days = 30) {
  const response = await api.get<CampaignAnalytics>('/marketing/analytics/', {
    params: { days },
  });
  return response.data;
}
