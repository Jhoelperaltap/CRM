export interface EmailList {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_dynamic: boolean;
  filter_criteria: Record<string, unknown>;
  subscriber_count: number;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface EmailListSubscriber {
  id: string;
  email_list: string;
  contact: string;
  contact_name: string;
  contact_email: string;
  is_subscribed: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
  source: 'manual' | 'import' | 'webform' | 'api';
  created_at: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  preview_text: string;
  html_content: string;
  text_content: string;
  category: 'newsletter' | 'promotional' | 'transactional' | 'reminder' | 'follow_up' | 'announcement' | 'welcome' | 'tax_season' | 'other';
  is_active: boolean;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
export type CampaignType = 'regular' | 'automated' | 'ab_test' | 'rss';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  subject: string;
  preview_text: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  html_content: string;
  text_content: string;
  template: string | null;
  email_list_ids: string[];
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  track_opens: boolean;
  track_clicks: boolean;
  is_ab_test: boolean;
  ab_test_subject_b: string;
  ab_test_content_b: string;
  ab_test_split: number;
  ab_test_winner_criteria: 'open_rate' | 'click_rate';
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  total_complained: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign: string;
  contact: string;
  contact_name: string;
  email: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'complained' | 'failed';
  ab_variant: 'A' | 'B' | '';
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  unsubscribed_at: string | null;
  open_count: number;
  click_count: number;
  error_message: string;
  bounce_type: 'hard' | 'soft' | '';
}

export interface CampaignLink {
  id: string;
  campaign: string;
  original_url: string;
  tracking_url: string;
  total_clicks: number;
  unique_clicks: number;
}

export type AutomationTriggerType = 'signup' | 'tag_added' | 'list_added' | 'case_created' | 'case_status' | 'date_field' | 'manual';
export type AutomationStepType = 'email' | 'wait' | 'condition' | 'tag' | 'list' | 'notify' | 'task';

export interface AutomationStep {
  id: string;
  sequence: string;
  step_type: AutomationStepType;
  order: number;
  subject: string;
  html_content: string;
  text_content: string;
  template: string | null;
  wait_days: number;
  wait_hours: number;
  wait_minutes: number;
  condition_field: string;
  condition_operator: 'equals' | 'not_equals' | 'contains' | 'opened' | 'clicked' | '';
  condition_value: string;
  tag_action: 'add' | 'remove' | '';
  tag_name: string;
  target_list: string | null;
  total_processed: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationSequence {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, unknown>;
  email_list_ids: string[];
  from_name: string;
  from_email: string;
  reply_to: string;
  total_enrolled: number;
  total_completed: number;
  total_unsubscribed: number;
  steps: AutomationStep[];
  step_count?: number;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationEnrollment {
  id: string;
  sequence: string;
  sequence_name: string;
  contact: string;
  contact_name: string;
  contact_email: string;
  status: 'active' | 'completed' | 'paused' | 'unsubscribed' | 'failed';
  current_step: string | null;
  current_step_order: number | null;
  enrolled_at: string;
  completed_at: string | null;
  next_step_at: string | null;
}

export interface CampaignAnalytics {
  total_campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  avg_open_rate: number;
  avg_click_rate: number;
  campaigns_by_status: Record<string, number>;
  campaigns_over_time: Array<{
    date: string;
    count: number;
    sent: number;
    opened: number;
  }>;
}

export interface CampaignStats {
  campaign: Campaign;
  hourly_opens: Array<{ hour: string; count: number }>;
  hourly_clicks: Array<{ hour: string; count: number }>;
  ab_results: {
    variant_a: { sent: number; opened: number; clicked: number };
    variant_b: { sent: number; opened: number; clicked: number };
  } | null;
  top_links: CampaignLink[];
}
